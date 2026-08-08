"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getRepository } from "@/lib/repository";
import { normalizeBibleLanguage, parseBibleXml } from "../../electron/bibleXml.js";
import { cx } from "./cx";
import {
  addHighlightRange, BIBLE_DOWNLOADS_URL, bibleHighlightKey, bookAbbreviation, bookNumberOf, canonicalBookNumber,
  DEFAULT_LAYOUT_SIZES, DEFAULT_LAYOUT_VISIBILITY, findBookAcrossTranslations,
  DEFAULT_LYRIC_FONT, DEFAULT_LYRIC_STYLE, DEFAULT_TRANSLATION, LAYOUT_SIZE_LIMITS, LOADING_PASSAGE, LOOKS,
  LYRIC_FONTS, MISSING_PASSAGE, NOT_DOWNLOADED_PASSAGE, resolveCompareTranslation, SONGS, subtractHighlightRange,
  type BibleHighlights, type BibleTranslation, type CustomBackground,
  type DownloadedBibleTranslation, type HighlightRange,
  type LayoutPanelId, type LayoutSizes, type LayoutVisibility, type Lineup, type LiveHighlightSelection,
  type LyricFontId, type LyricStyle,
  type Section, type Song, type TourMode, type TourSeenFlags,
} from "./data";
import {
  formatVerseLabel, PAST_START_INDEX, resolveAdjacentSetSong, resolveDeckStep, resolveNextVerse,
  resolvePreviousVerse, type VersePosition,
} from "./navigation";
import { getElectronCompat } from "./electronCompat";
import { getElectronDisplay, type OutputState, type OutputStatus } from "./electronDisplay";
import { getElectronShell } from "./electronShell";
import { fitForLines } from "./stage";
import { DEFAULT_TRANSITION_MS, speedPctToDurationMs } from "./useSlideTransition";
import { getElectronUpdater, type UpdateStatus } from "./electronUpdater";
import type { ParsedSong } from "./songImport";
import { useBibleTranslation } from "./useBibleTranslation";

const DEFAULT_OUTPUT_STATUS: OutputStatus = { active: false, selectedDisplayId: "auto", display: null, displays: [] };
const DEFAULT_UPDATE_STATUS: UpdateStatus = { status: "idle" };

const shortTransLabel = (code: string) => code.replace(/^(English|Cebuano)/, "") || code;

const MAX_BACKGROUND_IMAGE_DIMENSION = 1920;

// Max dimension for a generated video poster thumbnail.
const POSTER_MAX_DIMENSION = 640;

// Fractions of the clip's duration to sample for a poster frame, tried in order.
const POSTER_SAMPLE_POSITIONS = [0.1, 0.35, 0.6, 0];

// Mean luminance (0-255) below which a captured frame is treated as black.
const POSTER_MIN_MEAN_LUMINANCE = 8;

const POSTER_EVENT_TIMEOUT_MS = 15_000;

// Resolves on `eventName`, rejects on the video erroring or timing out.
function waitForVideoEvent(video: HTMLVideoElement, eventName: "loadeddata" | "seeked"): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanUp = () => {
      video.removeEventListener(eventName, onSuccess);
      video.removeEventListener("error", onError);
      clearTimeout(timeoutId);
    };
    const onSuccess = () => { cleanUp(); resolve(); };
    const onError = () => { cleanUp(); reject(new Error("Video errored while waiting for " + eventName)); };
    const timeoutId = setTimeout(() => { cleanUp(); reject(new Error("Timed out waiting for " + eventName)); }, POSTER_EVENT_TIMEOUT_MS);
    video.addEventListener(eventName, onSuccess, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

// Average brightness of the canvas, sampling every 16th pixel.
function meanCanvasLuminance(context: CanvasRenderingContext2D, width: number, height: number): number {
  const { data } = context.getImageData(0, 0, width, height);
  let total = 0;
  let sampleCount = 0;
  for (let offset = 0; offset < data.length; offset += 4 * 16) {
    total += 0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2];
    sampleCount++;
  }
  return sampleCount ? total / sampleCount : 0;
}

// Captures a representative still frame from a video as a data URL.
async function generateVideoPoster(videoUrl: string): Promise<string> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  // Set for non-blob URLs so reading the frame back via toDataURL doesn't taint the canvas.
  if (!videoUrl.startsWith("blob:")) {
    video.crossOrigin = "anonymous";
  }
  video.src = videoUrl;

  try {
    await waitForVideoEvent(video, "loadeddata");

    const sourceWidth = video.videoWidth || POSTER_MAX_DIMENSION;
    const sourceHeight = video.videoHeight || POSTER_MAX_DIMENSION;
    const scale = Math.min(1, POSTER_MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));
    const posterCanvas = document.createElement("canvas");
    posterCanvas.width = Math.max(1, Math.round(sourceWidth * scale));
    posterCanvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const context = posterCanvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("2d context unavailable");

    // A live stream or unsettled clip reports a non-finite duration and can't be seeked.
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    let firstCapturedPoster = "";

    for (const position of POSTER_SAMPLE_POSITIONS) {
      if (duration > 0) {
        const targetTime = Math.min(duration * position, Math.max(0, duration - 0.05));
        if (Math.abs(video.currentTime - targetTime) > 0.01) {
          video.currentTime = targetTime;
          await waitForVideoEvent(video, "seeked");
        }
      } else if (position !== 0) {
        continue;
      }
      context.drawImage(video, 0, 0, posterCanvas.width, posterCanvas.height);
      const poster = posterCanvas.toDataURL("image/jpeg", 0.8);
      if (!firstCapturedPoster) firstCapturedPoster = poster;
      if (meanCanvasLuminance(context, posterCanvas.width, posterCanvas.height) >= POSTER_MIN_MEAN_LUMINANCE) {
        return poster;
      }
    }

    // Every sampled frame was near-black; fall back to the first capture.
    if (!firstCapturedPoster) throw new Error("Could not capture any frame");
    return firstCapturedPoster;
  } finally {
    // Releases the decoder and buffered data.
    video.removeAttribute("src");
    video.load();
  }
}

// Downscales an image to a max dimension and re-encodes it as JPEG.
function downscaleImage(file: File, maxDimension: number): Promise<{ blob: Blob; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const targetWidth = Math.round(image.width * scale);
      const targetHeight = Math.round(image.height * scale);
      const resizeCanvas = document.createElement("canvas");
      resizeCanvas.width = targetWidth;
      resizeCanvas.height = targetHeight;
      const context = resizeCanvas.getContext("2d");
      URL.revokeObjectURL(objectUrl);
      if (!context) { reject(new Error("2d context unavailable")); return; }
      context.drawImage(image, 0, 0, targetWidth, targetHeight);
      resizeCanvas.toBlob((blob) => {
        if (!blob) { reject(new Error("Failed to encode downscaled image")); return; }
        resolve({ blob, mimeType: "image/jpeg" });
      }, "image/jpeg", 0.85);
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Failed to load image for downscaling")); };
    image.src = objectUrl;
  });
}

const BIBLE_CACHE_LIMIT = 4;

// Adds a translation to the cache, evicting the least-recently-used entry beyond BIBLE_CACHE_LIMIT (never evicting activeCode).
function withBibleCacheEntry(
  cache: Record<string, BibleTranslation>, code: string, data: BibleTranslation, activeCode: string
): Record<string, BibleTranslation> {
  const { [code]: _evicted, ...rest } = cache;
  const next = { ...rest, [code]: data };
  const evictable = Object.keys(next).filter((key) => key !== code && key !== activeCode);
  while (Object.keys(next).length > BIBLE_CACHE_LIMIT && evictable.length > 0) {
    delete next[evictable.shift() as string];
  }
  return next;
}

// Marks a cached translation as most-recently-used without re-fetching it.
function touchBibleCacheEntry(cache: Record<string, BibleTranslation>, code: string): Record<string, BibleTranslation> {
  const data = cache[code];
  return data ? withBibleCacheEntry(cache, code, data, code) : cache;
}

// Next/Previous boundary rules live in ./navigation as pure functions.

export type LumenProps = {
  accent?: string;
  theme?: "dark" | "light";
  lyricFont?: LyricFontId;
};

type Mode = "songs" | "bible" | "lineups";

export type ConfirmDialogState = {
  title: string;
  body?: string;
  danger?: boolean;
  confirmLabel?: string;
  onConfirm: () => void;
};

const TOUR_SEEN_DEFAULT: TourSeenFlags = { songs: false, bible: false, lineups: false };

// Slide shown while blanked: no lines, label, or caption.
const BLANK_SLIDE: Slide = { label: "", lines: [], slideNumber: 0, caption: "" };

const UNDO_STACK_CAP = 50;

// State keys tracked for undo/redo — content edits only, not navigation/UI state.
const HISTORY_TRACKED_KEYS: (keyof LumenState)[] = [
  "songOverrides", "songMetaOverrides", "setIds", "setName", "lyricStyle",
  "customBackgrounds", "bibleHighlights", "favs", "lineups", "lineupSongLooks",
  "customSongs", "font", "scale", "transitionType", "transitionDurationMs",
  "downloadedTranslations",
];

function pickTrackedKeys(source: LumenState, keys: (keyof LumenState)[]): Partial<LumenState> {
  const result: Partial<LumenState> = {};
  for (const key of keys) (result as Record<keyof LumenState, unknown>)[key] = source[key];
  return result;
}

type LumenState = {
  query: string;
  chip: string;
  sort: string;
  songId: string;
  idx: number;
  favs: Record<string, boolean>;
  look: string;
  scale: number;
  presenting: boolean;
  // 3/2/1 countdown shown on the Present button; null when not running. Not persisted.
  presentCountdown: number | null;
  blank: boolean;
  black: boolean;
  settingsOpen: boolean;
  font: LyricFontId;
  theme: "dark" | "light" | null;
  mode: Mode;
  book: string;
  chapter: number;
  trans: string;
  setIds: string[];
  setName: string;
  activeLineupId: string | null;
  setPanelOpen: boolean;
  songOverrides: Record<string, Section[]>;
  lyricsEditorOpen: boolean;
  customSongs: Song[];
  uploadOpen: boolean;
  lineups: Lineup[];
  lineupModalOpen: boolean;
  editingLineupId: string | null;
  // Which lineup's detail view (Sidebar's LineupDetail) is currently open; not persisted.
  viewingLineupId: string | null;
  layoutSizes: LayoutSizes;
  layoutVisibility: LayoutVisibility;
  customBackgrounds: CustomBackground[];
  downloadedTranslations: DownloadedBibleTranslation[];
  lyricStyle: LyricStyle;
  bibleHighlights: BibleHighlights;
  // Whether the second-monitor audience output window should be open right now. Not persisted.
  outputEnabled: boolean;
  // Which display "auto"/a specific id should target; persisted.
  outputDisplayId: number | "auto";
  // Whether the desktop build checks GitHub Releases for updates on launch; no-op in the browser build.
  autoUpdateEnabled: boolean;
  // Whether the first-launch welcome guide has already been shown/dismissed. Superseded by tourSeen.
  hasSeenOnboarding: boolean;

  // ---- Redesign additions (persisted) ----
  performanceMode: boolean;
  transitionType: "cut" | "fade" | "slide" | "zoom" | "push";
  transitionDurationMs: number;
  operatorNotes: string;
  tourSeen: TourSeenFlags;
  deletedLookIds: string[];
  songMetaOverrides: Record<string, Partial<Song>>;
  // Per-lineup slide background overrides, kept separate from songOverrides.
  lineupSongLooks: Record<string, Record<string, (string | null)[]>>;

  // ---- Redesign additions (ephemeral — never persisted) ----
  confirmDialog: ConfirmDialogState | null;
  saveStatus: "idle" | "saving" | "saved";
  displaysModalOpen: boolean;
  bibleTranslationsPanelOpen: boolean;
  // In-panel UI state for the Backgrounds/Transitions panels.
  transitionRowOpen: boolean;
  backgroundCategory: string;
  backgroundApplyAllArmed: boolean;
  operatorNotesOpen: boolean;
  // Text selected on the Live output box, read by the Highlight controls.
  liveSelection: LiveHighlightSelection | null;
  highlightColor: string;
  hotkeysOpen: boolean;
  globalSearchOpen: boolean;
  globalSearchQuery: string;
  songEditorOpen: boolean;
  songEditorMode: "create" | "edit";
  bibleSubTab: "browse" | "compare";
  // Session-only key transpose for the operator view; not persisted or sent to the output.
  transposeSemitones: number;
  // Sidebar drawer open state; tablet/mobile only.
  sidebarDrawerOpen: boolean;
  // Mobile single-pane view switcher, driven by MobileTabBar.tsx.
  mobileView: "library" | "slides" | "live";
  tourStep: number;
  tourMode: TourMode | null;
  compareMode: { verseIndex: number; translationB: string } | null;
};

type Slide = {
  label: string; lines: string[]; lineHighlights?: HighlightRange[][]; slideNumber: number; caption: string;
  // Song mode only: per-slide background override and operator note, carried from Section.
  lookId?: string; note?: string;
  // Bible Compare only: both translations' wording of a verse, with the shared superscript verse number.
  compare?: { verseNumber: string };
};

const INITIAL_STATE: LumenState = {
  query: "", chip: "All", sort: "Recent", songId: "s3", idx: 2,
  favs: { s1: true, s3: true, s6: true },
  look: "aurora", scale: 1, presenting: false, presentCountdown: null, blank: false, black: false,
  settingsOpen: false, font: DEFAULT_LYRIC_FONT, theme: null,
  mode: "songs", book: "Genesis", chapter: 1, trans: DEFAULT_TRANSLATION,
  setIds: ["s1", "s3", "s4", "s6"], setName: "Set 1", activeLineupId: null, setPanelOpen: false,
  songOverrides: {}, lyricsEditorOpen: false,
  customSongs: [], uploadOpen: false,
  lineups: [], lineupModalOpen: false, editingLineupId: null, viewingLineupId: null,
  layoutSizes: DEFAULT_LAYOUT_SIZES, layoutVisibility: DEFAULT_LAYOUT_VISIBILITY,
  customBackgrounds: [],
  downloadedTranslations: [],
  lyricStyle: DEFAULT_LYRIC_STYLE,
  bibleHighlights: {},
  outputEnabled: false, outputDisplayId: "auto",
  autoUpdateEnabled: false,
  hasSeenOnboarding: false,

  performanceMode: false,
  transitionType: "cut", transitionDurationMs: DEFAULT_TRANSITION_MS,
  operatorNotes: "",
  tourSeen: TOUR_SEEN_DEFAULT, deletedLookIds: [],
  songMetaOverrides: {},
  lineupSongLooks: {},

  confirmDialog: null, saveStatus: "idle",
  displaysModalOpen: false, hotkeysOpen: false, globalSearchOpen: false, globalSearchQuery: "",
  bibleTranslationsPanelOpen: false,
  transitionRowOpen: true, backgroundCategory: "All", backgroundApplyAllArmed: false,
  operatorNotesOpen: false, liveSelection: null, highlightColor: "#fde047",
  songEditorOpen: false, songEditorMode: "create",
  bibleSubTab: "browse", transposeSemitones: 0,
  sidebarDrawerOpen: false, mobileView: "slides",
  tourStep: 0, tourMode: null, compareMode: null,
};

export function useLumen(props: LumenProps = {}) {
  const [state, setState] = useState<LumenState>(INITIAL_STATE);

  const patch = useCallback((next: Partial<LumenState> | ((previousState: LumenState) => Partial<LumenState>)) => {
    setState((previousState) => ({ ...previousState, ...(typeof next === "function" ? next(previousState) : next) }));
  }, []);

  // ---- Undo/redo (content edits only — see HISTORY_TRACKED_KEYS) ----
  const previousStateForHistoryRef = useRef(state);
  const [undoStack, setUndoStack] = useState<Partial<LumenState>[]>([]);
  const [redoStack, setRedoStack] = useState<Partial<LumenState>[]>([]);
  const isUndoRedoApplyingRef = useRef(false);

  useEffect(() => {
    const previousState = previousStateForHistoryRef.current;
    previousStateForHistoryRef.current = state;
    if (isUndoRedoApplyingRef.current) { isUndoRedoApplyingRef.current = false; return; }
    const touchedKeys = HISTORY_TRACKED_KEYS.filter((key) => state[key] !== previousState[key]);
    if (touchedKeys.length === 0) return;
    setUndoStack((stack) => [...stack, pickTrackedKeys(previousState, touchedKeys)].slice(-UNDO_STACK_CAP));
    setRedoStack([]);
  }, [state]);

  const undo = useCallback(() => {
    const snapshot = undoStack[undoStack.length - 1];
    if (!snapshot) return;
    isUndoRedoApplyingRef.current = true;
    setRedoStack((stack) => [...stack, pickTrackedKeys(state, Object.keys(snapshot) as (keyof LumenState)[])]);
    setUndoStack((stack) => stack.slice(0, -1));
    patch(snapshot);
  }, [undoStack, state, patch]);

  const redo = useCallback(() => {
    const snapshot = redoStack[redoStack.length - 1];
    if (!snapshot) return;
    isUndoRedoApplyingRef.current = true;
    setUndoStack((stack) => [...stack, pickTrackedKeys(state, Object.keys(snapshot) as (keyof LumenState)[])]);
    setRedoStack((stack) => stack.slice(0, -1));
    patch(snapshot);
  }, [redoStack, state, patch]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const theme = state.theme || props.theme || "dark";
  const accent = props.accent || "#8b5cf6";

  // Gates WelcomeModal until loadAll() resolves.
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getRepository().loadAll().then((data) => {
      if (cancelled) return;
      // Reverses to most-recently-added-first order and re-normalizes each entry's language.
      const downloadedTranslations = [...data.downloadedBibleTranslations].reverse().map((entry) => ({
        ...entry,
        language: normalizeBibleLanguage(entry.language, entry.name),
      }));
      // Marks this as hydration, not a user edit, so it isn't captured for undo.
      isUndoRedoApplyingRef.current = true;
      patch({
        customSongs: [...data.customSongs].reverse(),
        lineups: [...data.lineups].reverse(),
        customBackgrounds: [...data.customBackgrounds].reverse(),
        downloadedTranslations,
        songOverrides: data.songOverrides,
        songMetaOverrides: data.songMetaOverrides,
        ...data.prefs,
        // Forces outputEnabled off on every launch.
        outputEnabled: false,
        // Migrates the legacy hasSeenOnboarding flag into per-mode tourSeen, once.
        ...(data.prefs.tourSeen
          ? {}
          : { tourSeen: data.prefs.hasSeenOnboarding ? { songs: true, bible: true, lineups: true } : TOUR_SEEN_DEFAULT }),
        // Converts a legacy percentage-based transition speed into a duration.
        ...(data.prefs.transitionDurationMs === undefined && data.prefs.transitionSpeedPct !== undefined
          ? { transitionDurationMs: speedPctToDurationMs(data.prefs.transitionSpeedPct) }
          : {}),
        // Lands on the most recently imported translation at Genesis 1.
        ...(downloadedTranslations.length > 0
          ? { trans: downloadedTranslations[0].code, book: "Genesis", chapter: 1, idx: 0 }
          : {}),
      });
      setPrefsLoaded(true);
      data.customBackgrounds
        .filter((background) => background.mediaType === "video")
        .forEach((background) => {
          generateVideoPoster(background.url).then((posterUrl) => {
            if (cancelled) return;
            patch((previousState) => ({
              customBackgrounds: previousState.customBackgrounds.map((entry) =>
                entry.id === background.id ? { ...entry, posterUrl } : entry
              ),
            }));
          }).catch((error) => {
            // Logs poster generation failures.
            console.error("Failed to generate poster for background " + background.id + ":", error);
          });
        });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [patch]);

  useEffect(() => {
    // Waits for loadAll() to finish before persisting, so it never clobbers saved prefs with defaults.
    if (!prefsLoaded) return;
    const persistTimeout = setTimeout(() => {
      patch({ saveStatus: "saving" });
      getRepository().setPrefs({
        favs: state.favs, look: state.look, scale: state.scale, theme: state.theme,
        font: state.font, setIds: state.setIds, setName: state.setName,
        layoutSizes: state.layoutSizes, layoutVisibility: state.layoutVisibility, lyricStyle: state.lyricStyle,
        // outputEnabled is not persisted; only outputDisplayId is saved.
        bibleHighlights: state.bibleHighlights, outputDisplayId: state.outputDisplayId,
        autoUpdateEnabled: state.autoUpdateEnabled, hasSeenOnboarding: state.hasSeenOnboarding,
        performanceMode: state.performanceMode, transitionType: state.transitionType,
        transitionDurationMs: state.transitionDurationMs,
        operatorNotes: state.operatorNotes, tourSeen: state.tourSeen,
        deletedLookIds: state.deletedLookIds,
        lineupSongLooks: state.lineupSongLooks,
      }).then(() => {
        patch({ saveStatus: "saved" });
        setTimeout(() => patch({ saveStatus: "idle" }), 1500);
      });
    }, 400);
    return () => clearTimeout(persistTimeout);
  }, [
    prefsLoaded, patch,
    state.favs, state.look, state.scale, state.theme, state.font, state.setIds, state.setName,
    state.layoutSizes, state.layoutVisibility, state.lyricStyle, state.bibleHighlights,
    state.outputDisplayId, state.autoUpdateEnabled, state.hasSeenOnboarding,
    state.performanceMode, state.transitionType, state.transitionDurationMs,
    state.operatorNotes, state.tourSeen, state.deletedLookIds, state.lineupSongLooks,
  ]);

  const [bibleCache, setBibleCache] = useState<Record<string, BibleTranslation>>({});
  const bibleCacheRef = useRef(bibleCache);
  bibleCacheRef.current = bibleCache;
  // Tracks translations not locally imported, distinct from still-loading.
  const [bibleLoadFailed, setBibleLoadFailed] = useState<Record<string, boolean>>({});
  // Bumped by removeBibleTranslation to force the lookup effect to re-run.
  const [bibleRefreshTick, setBibleRefreshTick] = useState(0);

  useEffect(() => {
    if (bibleCacheRef.current[state.trans]) {
      setBibleCache((previousCache) => touchBibleCacheEntry(previousCache, state.trans));
      return;
    }
    let cancelled = false;
    getRepository().getBibleTranslationData(state.trans).then((data) => {
      if (cancelled) return;
      if (data) {
        setBibleCache((previousCache) => withBibleCacheEntry(previousCache, state.trans, data, state.trans));
        setBibleLoadFailed((previous) => (previous[state.trans] ? { ...previous, [state.trans]: false } : previous));
        return;
      }
      setBibleLoadFailed((previous) => ({ ...previous, [state.trans]: true }));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [state.trans, bibleRefreshTick]);

  const translation = bibleCache[state.trans];
  const bibleBooks = useMemo(() => translation?.books ?? [], [translation]);
  // Language this translation's book names are keyed to.
  const bibleLanguage = translation?.meta.language;
  const currentTransMeta = useMemo(
    () => state.downloadedTranslations.find((entry) => entry.code === state.trans),
    [state.downloadedTranslations, state.trans]
  );

  const ref = state.book + " " + state.chapter;
  const currentBook = useMemo(() => bibleBooks.find((book) => book.name === state.book), [bibleBooks, state.book]);
  const currentChapter = useMemo(
    () => currentBook?.chapters.find((chapter) => chapter.number === state.chapter),
    [currentBook, state.chapter]
  );
  const passage = useMemo(() => {
    if (!translation) return bibleLoadFailed[state.trans] ? NOT_DOWNLOADED_PASSAGE : LOADING_PASSAGE;
    return currentChapter ? currentChapter.verses.map((verse) => verse.text) : MISSING_PASSAGE;
  }, [translation, currentChapter, bibleLoadFailed, state.trans]);

  // Re-maps the selected book by canonical number when switching translations.
  useEffect(() => {
    if (!translation || bibleBooks.length === 0 || currentBook) return;
    const bookNumber = canonicalBookNumber(state.book);
    const replacement = (bookNumber !== null && bibleBooks.find((book) => book.number === bookNumber)) || bibleBooks[0];
    if (!replacement || replacement.name === state.book) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    patch({ book: replacement.name, chapter: 1, idx: 0 });
  }, [translation, bibleBooks, currentBook, state.book, patch]);
  const vnum = useCallback((verseIndex: number) => currentChapter?.verses[verseIndex]?.number ?? verseIndex + 1, [currentChapter]);
  // Display label for a verse: a plain number, or a range for a verse bridge.
  const vlabel = useCallback((verseIndex: number) => {
    const verse = currentChapter?.verses[verseIndex];
    return verse ? formatVerseLabel(verse) : String(verseIndex + 1);
  }, [currentChapter]);

  // Resolves the second translation for Bible Compare, re-validated against current state.
  const compareTranslationBCode = useMemo(
    () => resolveCompareTranslation(
      state.compareMode?.translationB,
      state.trans,
      state.downloadedTranslations.map((entry) => entry.code)
    ),
    [state.compareMode, state.trans, state.downloadedTranslations]
  );

  // Clears compareMode once it can no longer be honoured.
  useEffect(() => {
    if (!state.compareMode || compareTranslationBCode) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    patch({ compareMode: null });
  }, [state.compareMode, compareTranslationBCode, patch]);

  const compareTranslationB = useBibleTranslation(compareTranslationBCode);

  // Looks up the compared translation's wording for any verse position.
  const compareTextAt = useCallback((bookName: string, chapterNumber: number, verseIndex: number): string | null => {
    if (!compareTranslationBCode || !compareTranslationB) return null;
    // Matches by canonical book number since translations may use different book names.
    const bookB = findBookAcrossTranslations(compareTranslationB.books, bookNumberOf(bibleBooks, bookName), bookName);
    const chapterB = bookB?.chapters.find((entry) => entry.number === chapterNumber);
    return chapterB?.verses[verseIndex]?.text ?? null;
  }, [compareTranslationBCode, compareTranslationB, bibleBooks]);

  // Applies songMetaOverrides on top of both custom and built-in songs.
  const allSongs = useMemo(
    () => [...state.customSongs, ...SONGS].map((baseSong) => {
      const metaOverride = state.songMetaOverrides[baseSong.id];
      return metaOverride ? { ...baseSong, ...metaOverride } : baseSong;
    }),
    [state.customSongs, state.songMetaOverrides]
  );

  const allLooks = useMemo(
    () => [...state.customBackgrounds, ...LOOKS.filter((lookEntry) => !state.deletedLookIds.includes(lookEntry.id))],
    [state.customBackgrounds, state.deletedLookIds]
  );

  // Which lineup the currently-viewed song's background edits should be scoped to.
  const lineupScopeId = useMemo(() => {
    const candidateId = state.viewingLineupId ?? state.activeLineupId;
    if (!candidateId) return null;
    const candidateLineup = state.lineups.find((entry) => entry.id === candidateId);
    return candidateLineup && candidateLineup.songIds.includes(state.songId) ? candidateId : null;
  }, [state.viewingLineupId, state.activeLineupId, state.lineups, state.songId]);

  const song = useMemo(() => {
    const baseSong = allSongs.find((candidate) => candidate.id === state.songId) || allSongs[0];
    const override = state.songOverrides[baseSong.id];
    const baseSections = override ?? baseSong.sections;
    if (!lineupScopeId) return override ? { ...baseSong, sections: baseSections } : baseSong;
    // Lineup-scoped backgrounds layer on top of, but never overwrite, songOverrides.
    const lineupLookIds = state.lineupSongLooks[lineupScopeId]?.[baseSong.id];
    const sections = baseSections.map((section, sectionIndex) => {
      const lineupLookId = lineupLookIds?.[sectionIndex];
      const lookId = lineupLookId != null ? lineupLookId : (section.lookId ?? allLooks[0]?.id);
      return { ...section, lookId };
    });
    return { ...baseSong, sections };
  }, [state.songId, state.songOverrides, allSongs, lineupScopeId, state.lineupSongLooks, allLooks]);
  const look = useMemo(() => allLooks.find((lookEntry) => lookEntry.id === state.look) || allLooks[0] || LOOKS[0], [allLooks, state.look]);

  const setSongs = useMemo(
    () => state.setIds.map((songId) => allSongs.find((candidate) => candidate.id === songId)).filter((maybeSong): maybeSong is Song => !!maybeSong),
    [state.setIds, allSongs]
  );
  const createLineup = useCallback((name: string, songIds: string[]) => {
    const lineupId = "lineup-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const lineup: Lineup = { id: lineupId, name, songIds };
    getRepository().upsertLineup(lineup);
    patch((previousState) => ({
      lineups: [lineup, ...previousState.lineups],
      setIds: songIds, setName: name, activeLineupId: lineupId,
      lineupModalOpen: false, editingLineupId: null,
    }));
  }, [patch]);

  const updateLineup = useCallback((lineupId: string, name: string, songIds: string[]) => {
    getRepository().upsertLineup({ id: lineupId, name, songIds });
    patch((previousState) => ({
      lineups: previousState.lineups.map((lineup) => (lineup.id === lineupId ? { ...lineup, name, songIds } : lineup)),
      ...(previousState.activeLineupId === lineupId ? { setIds: songIds, setName: name } : {}),
      lineupModalOpen: false, editingLineupId: null,
    }));
  }, [patch]);

  const deleteLineup = useCallback((lineupId: string) => {
    getRepository().deleteLineup(lineupId);
    patch((previousState) => {
      // Drops this lineup's slot in lineupSongLooks along with it.
      const { [lineupId]: _removedLineupLooks, ...remainingLineupSongLooks } = previousState.lineupSongLooks;
      return {
        lineups: previousState.lineups.filter((lineup) => lineup.id !== lineupId),
        lineupSongLooks: remainingLineupSongLooks,
        // Clears the header's set name/count when the active lineup is deleted.
        ...(previousState.activeLineupId === lineupId ? { setName: "Untitled set", activeLineupId: null } : {}),
      };
    });
  }, [patch]);

  const activateLineup = useCallback((lineupId: string) => {
    patch((previousState) => {
      const targetLineup = previousState.lineups.find((entry) => entry.id === lineupId);
      return targetLineup
        ? { setIds: targetLineup.songIds, setName: targetLineup.name, activeLineupId: lineupId, setPanelOpen: false }
        : {};
    });
  }, [patch]);

  // Shared helper for lineup-membership mutations: transforms a lineup's songIds and persists it.
  const mutateLineupSongIds = useCallback((lineupId: string, updater: (songIds: string[]) => string[]) => {
    patch((previousState) => {
      const targetLineup = previousState.lineups.find((lineup) => lineup.id === lineupId);
      if (!targetLineup) return {};
      const updatedLineup = { ...targetLineup, songIds: updater(targetLineup.songIds) };
      getRepository().upsertLineup(updatedLineup);
      return {
        lineups: previousState.lineups.map((lineup) => (lineup.id === lineupId ? updatedLineup : lineup)),
        ...(previousState.activeLineupId === lineupId ? { setIds: updatedLineup.songIds } : {}),
      };
    });
  }, [patch]);

  const reorderLineupSongs = useCallback((lineupId: string, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    mutateLineupSongIds(lineupId, (songIds) => {
      const reordered = songIds.slice();
      const [movedSongId] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, movedSongId);
      return reordered;
    });
  }, [mutateLineupSongIds]);

  const addSongToLineup = useCallback((lineupId: string, songId: string, atIndex?: number) => {
    mutateLineupSongIds(lineupId, (songIds) => {
      if (songIds.includes(songId)) return songIds;
      const next = songIds.slice();
      next.splice(atIndex ?? next.length, 0, songId);
      return next;
    });
  }, [mutateLineupSongIds]);

  const removeSongFromLineup = useCallback((lineupId: string, songId: string) => {
    mutateLineupSongIds(lineupId, (songIds) => songIds.filter((existingId) => existingId !== songId));
  }, [mutateLineupSongIds]);

  const renameLineup = useCallback((lineupId: string, name: string) => {
    patch((previousState) => {
      const targetLineup = previousState.lineups.find((lineup) => lineup.id === lineupId);
      if (!targetLineup) return {};
      const updatedLineup = { ...targetLineup, name };
      getRepository().upsertLineup(updatedLineup);
      return {
        lineups: previousState.lineups.map((lineup) => (lineup.id === lineupId ? updatedLineup : lineup)),
        ...(previousState.activeLineupId === lineupId ? { setName: name } : {}),
      };
    });
  }, [patch]);

  const adjustLayoutSize = useCallback((sizeKey: keyof LayoutSizes, deltaPixels: number) => {
    patch((previousState) => {
      const sizeLimits = LAYOUT_SIZE_LIMITS[sizeKey];
      const currentSize = previousState.layoutSizes[sizeKey];
      const nextSize = Math.min(sizeLimits.max, Math.max(sizeLimits.min, currentSize + deltaPixels));
      return { layoutSizes: { ...previousState.layoutSizes, [sizeKey]: nextSize } };
    });
  }, [patch]);

  const toggleLayoutPanel = useCallback((panelId: LayoutPanelId) => {
    patch((previousState) => ({
      layoutVisibility: { ...previousState.layoutVisibility, [panelId]: !previousState.layoutVisibility[panelId] },
    }));
  }, [patch]);

  const resetLayout = useCallback(() => {
    patch({ layoutSizes: DEFAULT_LAYOUT_SIZES, layoutVisibility: DEFAULT_LAYOUT_VISIBILITY });
  }, [patch]);

  const addBackground = useCallback(async (file: File) => {
    const backgroundId = "bg-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const mediaType: "image" | "video" = file.type.startsWith("video/") ? "video" : "image";

    if (mediaType === "image") {
      const { blob: downscaledBlob, mimeType } = await downscaleImage(file, MAX_BACKGROUND_IMAGE_DIMENSION);
      const objectUrl = URL.createObjectURL(downscaledBlob);
      const fileData = await downscaledBlob.arrayBuffer();
      getRepository().addBackground({ id: backgroundId, name: file.name, mediaType, mimeType, data: fileData });
      patch((previousState) => ({
        customBackgrounds: [{ id: backgroundId, name: file.name, mediaType, url: objectUrl }, ...previousState.customBackgrounds],
        look: backgroundId,
      }));
      return;
    }

    // Video is left untouched, but a poster frame is captured so previews can skip decoding it.
    const objectUrl = URL.createObjectURL(file);
    const fileData = await file.arrayBuffer();
    getRepository().addBackground({ id: backgroundId, name: file.name, mediaType, mimeType: file.type, data: fileData });
    patch((previousState) => ({
      customBackgrounds: [{ id: backgroundId, name: file.name, mediaType, url: objectUrl }, ...previousState.customBackgrounds],
      look: backgroundId,
    }));
    // Not awaited, so a large upload isn't stalled by seeking the clip.
    generateVideoPoster(objectUrl).then((posterUrl) => {
      patch((previousState) => ({
        customBackgrounds: previousState.customBackgrounds.map((entry) =>
          entry.id === backgroundId ? { ...entry, posterUrl } : entry
        ),
      }));
    }).catch((error) => {
      console.error("Failed to generate poster for background " + backgroundId + ":", error);
    });
  }, [patch]);

  const deleteBackground = useCallback((backgroundId: string) => {
    getRepository().deleteBackground(backgroundId);
    patch((previousState) => ({
      customBackgrounds: previousState.customBackgrounds.filter((background) => background.id !== backgroundId),
      look: previousState.look === backgroundId ? LOOKS[0].id : previousState.look,
    }));
  }, [patch]);

  // Imports a Bible translation file (JSON or XML, detected by content) downloaded from BIBLE_DOWNLOADS_URL.
  const [bibleImportError, setBibleImportError] = useState<string | null>(null);

  const importBibleTranslation = useCallback(async (file: File) => {
    setBibleImportError(null);
    const text = await file.text();
    let parsed: BibleTranslation;
    let format: "json" | "xml";
    try {
      parsed = JSON.parse(text);
      format = "json";
    } catch {
      // Falls back to file.name for files with no code/id of their own.
      parsed = parseBibleXml(text, file.name) as BibleTranslation;
      format = "xml";
    }
    if (!parsed?.meta?.code || !parsed?.meta?.name || !Array.isArray(parsed?.books) || parsed.books.length === 0) {
      setBibleImportError(file.name + " doesn't look like a Bible translation file.");
      return;
    }
    const { code, name } = parsed.meta;
    // Re-normalizes language here since the JSON import path doesn't go through parseBibleXml.
    const language = normalizeBibleLanguage(parsed.meta.language, name);
    const license = parsed.meta.license || "";
    const link = parsed.meta.link ?? null;
    const data = await file.arrayBuffer();
    getRepository().addBibleTranslation({ code, language, name, license, link, data, format });
    patch((previousState) => {
      // The first import lands on a real translation; later imports leave the live position alone.
      const isFirstImport = previousState.downloadedTranslations.length === 0;
      const firstBook = parsed.books[0];
      return {
        downloadedTranslations: [
          { code, language, name, license, link, downloadedAt: Date.now(), sizeBytes: data.byteLength },
          ...previousState.downloadedTranslations.filter((entry) => entry.code !== code),
        ],
        // Starts at the file's own first book, not a hardcoded Genesis.
        ...(isFirstImport && firstBook
          ? {
            trans: code,
            book: firstBook.name,
            chapter: firstBook.chapters[0]?.number ?? 1,
            idx: 0,
            black: false,
            blank: false,
          }
          : {}),
      };
    });
    setBibleCache((previousCache) => withBibleCacheEntry(previousCache, code, parsed, state.trans));
    setBibleLoadFailed((previous) => (previous[code] ? { ...previous, [code]: false } : previous));
  }, [patch, state.trans]);

  const removeBibleTranslation = useCallback((code: string) => {
    getRepository().deleteBibleTranslation(code);
    patch((previousState) => ({
      downloadedTranslations: previousState.downloadedTranslations.filter((entry) => entry.code !== code),
    }));
    setBibleCache((previousCache) => {
      const { [code]: _removed, ...rest } = previousCache;
      return rest;
    });
    setBibleRefreshTick((tick) => tick + 1);
  }, [patch]);

  const openBibleDownloadsPage = useCallback(() => {
    const electronShell = getElectronShell();
    if (electronShell) electronShell.openExternal(BIBLE_DOWNLOADS_URL);
    else window.open(BIBLE_DOWNLOADS_URL, "_blank", "noopener,noreferrer");
  }, []);

  const saveLyrics = useCallback((sections: Section[]) => {
    getRepository().setSongOverride(song.id, sections);
    patch((previousState) => ({ songOverrides: { ...previousState.songOverrides, [song.id]: sections } }));
  }, [patch, song.id]);

  // Keeps each lineup's per-slide background array in sync with song.sections after slide edits.
  const reindexLineupSongLooks = useCallback((songId: string, transform: (lookIds: (string | null)[]) => (string | null)[]) => {
    patch((previousState) => {
      let changed = false;
      const nextLineupSongLooks: typeof previousState.lineupSongLooks = {};
      for (const [lineupId, songLooks] of Object.entries(previousState.lineupSongLooks)) {
        const lookIds = songLooks[songId];
        if (!lookIds) { nextLineupSongLooks[lineupId] = songLooks; continue; }
        changed = true;
        nextLineupSongLooks[lineupId] = { ...songLooks, [songId]: transform(lookIds) };
      }
      return changed ? { lineupSongLooks: nextLineupSongLooks } : {};
    });
  }, [patch]);

  // ---- Slide filmstrip editing (song mode only) ----

  const duplicateSlide = useCallback((sectionIndex: number) => {
    const target = song.sections[sectionIndex];
    if (!target) return;
    const next = song.sections.slice();
    next.splice(sectionIndex + 1, 0, { ...target, lines: [...target.lines] });
    saveLyrics(next);
    reindexLineupSongLooks(song.id, (lookIds) => {
      const nextLookIds = lookIds.slice();
      nextLookIds.splice(sectionIndex + 1, 0, nextLookIds[sectionIndex] ?? null);
      return nextLookIds;
    });
  }, [song.sections, song.id, saveLyrics, reindexLineupSongLooks]);

  const mergeSlideWithNext = useCallback((sectionIndex: number) => {
    const current = song.sections[sectionIndex];
    const next = song.sections[sectionIndex + 1];
    if (!current || !next) return;
    const merged: Section = {
      label: current.label,
      lines: [...current.lines, ...next.lines],
      lineHighlights: (current.lineHighlights || current.lines.map(() => [])).concat(next.lineHighlights || next.lines.map(() => [])),
      lookId: current.lookId,
      note: current.note,
    };
    const updated = song.sections.slice();
    updated.splice(sectionIndex, 2, merged);
    saveLyrics(updated);
    reindexLineupSongLooks(song.id, (lookIds) => {
      const nextLookIds = lookIds.slice();
      nextLookIds.splice(sectionIndex, 2, nextLookIds[sectionIndex] ?? null);
      return nextLookIds;
    });
  }, [song.sections, song.id, saveLyrics, reindexLineupSongLooks]);

  const splitSlide = useCallback((sectionIndex: number, atLineIndex: number) => {
    const target = song.sections[sectionIndex];
    if (!target || atLineIndex <= 0 || atLineIndex >= target.lines.length) return;
    const firstHalf: Section = {
      label: target.label, lines: target.lines.slice(0, atLineIndex), lineHighlights: target.lineHighlights?.slice(0, atLineIndex),
      lookId: target.lookId, note: target.note,
    };
    const secondHalf: Section = {
      label: target.label, lines: target.lines.slice(atLineIndex), lineHighlights: target.lineHighlights?.slice(atLineIndex),
      lookId: target.lookId, note: target.note,
    };
    const updated = song.sections.slice();
    updated.splice(sectionIndex, 1, firstHalf, secondHalf);
    saveLyrics(updated);
    reindexLineupSongLooks(song.id, (lookIds) => {
      const nextLookIds = lookIds.slice();
      const currentLookId = nextLookIds[sectionIndex] ?? null;
      nextLookIds.splice(sectionIndex, 1, currentLookId, currentLookId);
      return nextLookIds;
    });
  }, [song.sections, song.id, saveLyrics, reindexLineupSongLooks]);

  const reorderSlides = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const updated = song.sections.slice();
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    saveLyrics(updated);
    reindexLineupSongLooks(song.id, (lookIds) => {
      const nextLookIds = lookIds.slice();
      const [movedLookId] = nextLookIds.splice(fromIndex, 1);
      nextLookIds.splice(toIndex, 0, movedLookId);
      return nextLookIds;
    });
  }, [song.sections, song.id, saveLyrics, reindexLineupSongLooks]);

  // Writes a lookId to slides, scoped to the lineup when editing inside one.
  const setSectionLooks = useCallback((sectionIndexes: number[], lookId: string | undefined) => {
    if (lineupScopeId) {
      const targetSongId = song.id;
      patch((previousState) => {
        const forLineup = previousState.lineupSongLooks[lineupScopeId] ?? {};
        // song.sections is already the lineup-aware view, so its length is always correct here.
        const currentLookIds: (string | null)[] = forLineup[targetSongId] ?? song.sections.map(() => null);
        const nextLookIds = currentLookIds.slice();
        for (const sectionIndex of sectionIndexes) nextLookIds[sectionIndex] = lookId ?? null;
        return {
          lineupSongLooks: {
            ...previousState.lineupSongLooks,
            [lineupScopeId]: { ...forLineup, [targetSongId]: nextLookIds },
          },
        };
      });
      return;
    }
    const sectionIndexSet = new Set(sectionIndexes);
    saveLyrics(song.sections.map((section, index) => (sectionIndexSet.has(index) ? { ...section, lookId } : section)));
  }, [lineupScopeId, song.id, song.sections, patch, saveLyrics]);

  const setSlideLook = useCallback((sectionIndex: number, lookId: string | undefined) => {
    setSectionLooks([sectionIndex], lookId);
  }, [setSectionLooks]);

  // Applies a background to every slide sharing the current slide's label.
  const applySlideLookToLabel = useCallback((sectionIndex: number, lookId: string | undefined) => {
    const label = song.sections[sectionIndex]?.label;
    if (label === undefined) return;
    const matchingIndexes = song.sections.reduce<number[]>(
      (indexes, section, index) => (section.label === label ? [...indexes, index] : indexes), []
    );
    setSectionLooks(matchingIndexes, lookId);
  }, [song.sections, setSectionLooks]);

  // Applies a background to every slide of the current song.
  const applyLookToAllSlides = useCallback((lookId: string | undefined) => {
    setSectionLooks(song.sections.map((_section, index) => index), lookId);
  }, [song.sections, setSectionLooks]);

  const addSong = useCallback((parsed: ParsedSong) => {
    const newSongId = "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const newSong: Song = { ...parsed, id: newSongId, fav: false, when: "Just added" };
    getRepository().upsertSong(newSong);
    patch((previousState) => ({
      customSongs: [newSong, ...previousState.customSongs],
      songId: newSongId, idx: 0, mode: "songs", uploadOpen: false,
    }));
  }, [patch]);

  const toggleFavorite = useCallback((songId: string) => {
    patch((previousState) => ({ favs: { ...previousState.favs, [songId]: !previousState.favs[songId] } }));
  }, [patch]);

  // Only ever called on a custom song.
  const deleteSong = useCallback((songId: string) => {
    getRepository().deleteSong(songId);
    patch((previousState) => ({
      customSongs: previousState.customSongs.filter((customSong) => customSong.id !== songId),
      // Falls back to the first built-in song if the deleted one was active.
      ...(previousState.songId === songId ? { songId: SONGS[0].id, idx: 0 } : {}),
    }));
  }, [patch]);

  // Shallow-patch overlay on top of any song, custom or built-in.
  const setSongMetaOverride = useCallback((songId: string, metaPatch: Partial<Song>) => {
    getRepository().setSongMetaOverride(songId, metaPatch);
    patch((previousState) => ({
      songMetaOverrides: {
        ...previousState.songMetaOverrides,
        [songId]: { ...previousState.songMetaOverrides[songId], ...metaPatch },
      },
    }));
  }, [patch]);

  // Duplicates a song as a new custom "(Reprise)" song.
  const duplicateSongAsReprise = useCallback((songId: string) => {
    const baseSong = allSongs.find((candidate) => candidate.id === songId);
    if (!baseSong) return;
    const sections = state.songOverrides[songId] ?? baseSong.sections;
    const newSongId = "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const newSong: Song = { ...baseSong, id: newSongId, title: baseSong.title + " (Reprise)", fav: false, when: "Just added", sections };
    getRepository().upsertSong(newSong);
    patch((previousState) => ({ customSongs: [newSong, ...previousState.customSongs] }));
  }, [allSongs, state.songOverrides, patch]);

  const askConfirm = useCallback((options: ConfirmDialogState) => {
    patch({ confirmDialog: options });
  }, [patch]);

  const closeConfirm = useCallback(() => {
    patch({ confirmDialog: null });
  }, [patch]);

  const slides = useMemo<Slide[]>(() => {
    if (state.mode === "bible") {
      return passage.map((verseText, verseIndex) => {
        const key = bibleHighlightKey(state.trans, state.book, state.chapter, vnum(verseIndex));
        const verseLabel = String(vlabel(verseIndex));
        // Compact reference caption ("PSA 23:2 KJV").
        const reference = bookAbbreviation(state.book, bibleLanguage) + " " + state.chapter + ":" + verseLabel + " ";
        const compareText = compareTextAt(state.book, state.chapter, verseIndex);
        if (compareText && compareTranslationBCode) {
          return {
            label: "v" + verseLabel, lines: [verseText, compareText],
            // The compared translation has no highlight store; highlights are keyed by the primary reference.
            lineHighlights: [state.bibleHighlights[key] ?? [], []],
            slideNumber: verseIndex + 1,
            caption: reference + shortTransLabel(state.trans) + " - " + shortTransLabel(compareTranslationBCode),
            compare: { verseNumber: verseLabel },
          };
        }
        return {
          label: "v" + verseLabel, lines: [verseText], lineHighlights: [state.bibleHighlights[key] ?? []],
          slideNumber: verseIndex + 1,
          caption: reference + shortTransLabel(state.trans),
        };
      });
    }
    return song.sections.map((section, sectionIndex) => ({
      label: section.label, lines: section.lines, lineHighlights: section.lineHighlights,
      slideNumber: sectionIndex + 1, caption: "", lookId: section.lookId, note: section.note,
    }));
  }, [
    state.mode, passage, vnum, vlabel, state.trans, state.book, state.chapter, state.bibleHighlights,
    song, bibleLanguage, compareTextAt, compareTranslationBCode,
  ]);

  // Effective slide count for a song, override included.
  const sectionCountOf = useCallback((songId: string) => {
    const override = state.songOverrides[songId];
    if (override) return override.length;
    return allSongs.find((candidate) => candidate.id === songId)?.sections.length ?? 0;
  }, [state.songOverrides, allSongs]);

  // Steps one slide/verse in either direction, crossing chapter/book/set boundaries where applicable.
  const go = useCallback((direction: number) => {
    if (direction === 0) return;
    setState((previousState) => {
      const count = previousState.mode === "bible" ? passage.length : song.sections.length;
      const currentIndex = Math.min(Math.max(previousState.idx, PAST_START_INDEX), count);
      const step = resolveDeckStep(currentIndex, count, direction);

      if (step.kind === "hold") return previousState;
      // Does not touch black/blank; those are only toggled by their own button.
      if (step.kind === "index") return { ...previousState, idx: step.idx };

      if (previousState.mode === "bible") {
        const position = direction > 0
          ? resolveNextVerse(bibleBooks, previousState.book, previousState.chapter, currentIndex)
          : resolvePreviousVerse(bibleBooks, previousState.book, previousState.chapter, currentIndex);
        if (position) {
          return { ...previousState, book: position.book, chapter: position.chapter, idx: position.verseIndex };
        }
      } else if (previousState.mode === "lineups") {
        const neighbour = resolveAdjacentSetSong(previousState.setIds, previousState.songId, direction, sectionCountOf);
        if (neighbour) {
          return { ...previousState, songId: neighbour.songId, idx: neighbour.idx };
        }
      }

      // Nothing to cross into: land on the blank end-of-the-line position.
      return { ...previousState, idx: step.overflowIndex };
    });
  }, [passage.length, song.sections.length, bibleBooks, sectionCountOf]);

  const lyricFamily = (LYRIC_FONTS.find((font) => font.id === (state.font || props.lyricFont)) ?? LYRIC_FONTS[0]).className;

  const bible = state.mode === "bible";

  // The deck has a blank overflow position before the first and after the last slide.
  const slideCount = slides.length;
  const idx = Math.min(Math.max(state.idx, PAST_START_INDEX), slideCount);
  const atStartOverflow = idx <= PAST_START_INDEX;
  const atEndOverflow = idx >= slideCount;
  const cur = slides[idx] ?? BLANK_SLIDE;

  // Audience-facing Bible Compare projection: both translations stacked with a shared caption.
  const liveCompare = useMemo(() => {
    if (!cur.compare) return null;
    // Suppress compare when the verse text is blank (undownloaded chapter).
    if (!cur.lines.some((line) => line.trim().length > 0)) return null;
    return { verseNumber: cur.compare.verseNumber, lines: cur.lines, caption: cur.caption };
  }, [cur]);

  // Builds a preview Slide for a verse position outside the current live one.
  const bibleSlideAt = useCallback((position: VersePosition | null): Slide | undefined => {
    if (!position) return undefined;
    const book = bibleBooks.find((entry) => entry.name === position.book);
    const chapter = book?.chapters.find((entry) => entry.number === position.chapter);
    const verse = chapter?.verses[position.verseIndex];
    if (!verse) return undefined;
    const label = formatVerseLabel(verse);
    const key = bibleHighlightKey(state.trans, position.book, position.chapter, verse.number);
    const reference = bookAbbreviation(position.book, bibleLanguage) + " " + position.chapter + ":" + label + " ";
    // Compare applies across boundaries too, so Next up matches what go() will show.
    const compareText = compareTextAt(position.book, position.chapter, position.verseIndex);
    if (compareText && compareTranslationBCode) {
      return {
        label: "v" + label, lines: [verse.text, compareText],
        lineHighlights: [state.bibleHighlights[key] ?? [], []],
        slideNumber: position.verseIndex + 1,
        caption: reference + shortTransLabel(state.trans) + " - " + shortTransLabel(compareTranslationBCode),
        compare: { verseNumber: String(label) },
      };
    }
    return {
      label: "v" + label, lines: [verse.text], lineHighlights: [state.bibleHighlights[key] ?? []],
      slideNumber: position.verseIndex + 1,
      caption: reference + shortTransLabel(state.trans),
    };
  }, [bibleBooks, state.trans, state.bibleHighlights, bibleLanguage, compareTextAt, compareTranslationBCode]);

  // Builds a preview Slide for a neighbouring song in the running set.
  const setSongSlideAt = useCallback((neighbour: { songId: string; idx: number } | null): Slide | undefined => {
    if (!neighbour) return undefined;
    const baseSong = allSongs.find((candidate) => candidate.id === neighbour.songId);
    if (!baseSong) return undefined;
    const sections = state.songOverrides[neighbour.songId] ?? baseSong.sections;
    const section = sections[neighbour.idx];
    if (!section) return undefined;
    // Uses activeLineupId, not lineupScopeId, since this only previews the running set's neighbour.
    const lineupLookId = state.activeLineupId
      ? state.lineupSongLooks[state.activeLineupId]?.[neighbour.songId]?.[neighbour.idx]
      : undefined;
    const lookId = lineupLookId != null
      ? lineupLookId
      : section.lookId ?? (state.activeLineupId ? allLooks[0]?.id : undefined);
    return {
      label: section.label, lines: section.lines, lineHighlights: section.lineHighlights,
      slideNumber: neighbour.idx + 1, caption: "", lookId, note: section.note,
    };
  }, [allSongs, state.songOverrides, state.activeLineupId, state.lineupSongLooks, allLooks]);

  // Previous/Next up previews mirror whatever go() would actually land on.
  const lineups = state.mode === "lineups";

  const nxt = useMemo(() => {
    if (atEndOverflow) return undefined;
    if (idx + 1 < slideCount) return slides[idx + 1];
    if (bible) return bibleSlideAt(resolveNextVerse(bibleBooks, state.book, state.chapter, idx));
    if (lineups) return setSongSlideAt(resolveAdjacentSetSong(state.setIds, song.id, 1, sectionCountOf));
    return undefined;
  }, [atEndOverflow, idx, slideCount, slides, bible, lineups, bibleBooks, state.book, state.chapter, state.setIds, song.id, sectionCountOf, bibleSlideAt, setSongSlideAt]);

  const prv = useMemo(() => {
    if (atStartOverflow) return undefined;
    if (idx - 1 >= 0) return slides[idx - 1];
    if (bible) return bibleSlideAt(resolvePreviousVerse(bibleBooks, state.book, state.chapter, idx));
    if (lineups) return setSongSlideAt(resolveAdjacentSetSong(state.setIds, song.id, -1, sectionCountOf));
    return undefined;
  }, [atStartOverflow, idx, slides, bible, lineups, bibleBooks, state.book, state.chapter, state.setIds, song.id, sectionCountOf, bibleSlideAt, setSongSlideAt]);

  const hidden = state.black || state.blank;

  // Next/Previous stay enabled through the blank overflow position; only disabled once already there.
  const canGoNext = !atEndOverflow;
  const canGoPrev = !atStartOverflow;

  // Labels shown on Previous/Next preview cards when that direction has nothing left.
  const boundaryNextLabel = useMemo(() => {
    if (nxt) return null;
    if (bible) return "End of the Bible";
    return lineups ? "End of set" : "End of song";
  }, [nxt, bible, lineups]);

  const boundaryPrevLabel = useMemo(() => {
    if (prv) return null;
    if (bible) return "Start of the Bible";
    return lineups ? "Start of set" : "Start of song";
  }, [prv, bible, lineups]);

  // Highlighting a selection on the live slide (song lines persist as overrides; Bible verses use their own store).

  // Computes the highlighted range for one line of a multi-line selection.
  const rangeForLine = useCallback((selection: LiveHighlightSelection, lineIndex: number, lineLength: number) => {
    if (lineIndex < selection.startLineIndex || lineIndex > selection.endLineIndex) return null;
    const start = lineIndex === selection.startLineIndex ? selection.startOffset : 0;
    const end = lineIndex === selection.endLineIndex ? selection.endOffset : lineLength;
    return start < end ? { start, end } : null;
  }, []);

  const applyLiveHighlight = useCallback((selection: LiveHighlightSelection, color: string) => {
    if (bible) {
      const key = bibleHighlightKey(state.trans, state.book, state.chapter, vnum(idx));
      patch((previousState) => ({
        bibleHighlights: {
          ...previousState.bibleHighlights,
          [key]: addHighlightRange(previousState.bibleHighlights[key] ?? [], { start: selection.startOffset, end: selection.endOffset, color }),
        },
      }));
      return;
    }
    const updatedSections = song.sections.map((section, sectionIndex) => {
      if (sectionIndex !== idx) return section;
      const lineHighlights = section.lines.map((line, lineIndex) => {
        const existing = section.lineHighlights?.[lineIndex] ?? [];
        const range = rangeForLine(selection, lineIndex, line.length);
        return range ? addHighlightRange(existing, { ...range, color }) : existing;
      });
      return { ...section, lineHighlights };
    });
    saveLyrics(updatedSections);
  }, [bible, state.trans, state.book, state.chapter, idx, vnum, song, patch, saveLyrics, rangeForLine]);

  const removeLiveHighlight = useCallback((selection: LiveHighlightSelection) => {
    if (bible) {
      const key = bibleHighlightKey(state.trans, state.book, state.chapter, vnum(idx));
      patch((previousState) => ({
        bibleHighlights: {
          ...previousState.bibleHighlights,
          [key]: subtractHighlightRange(previousState.bibleHighlights[key] ?? [], selection.startOffset, selection.endOffset),
        },
      }));
      return;
    }
    const updatedSections = song.sections.map((section, sectionIndex) => {
      if (sectionIndex !== idx) return section;
      const lineHighlights = section.lines.map((line, lineIndex) => {
        const existing = section.lineHighlights?.[lineIndex] ?? [];
        const range = rangeForLine(selection, lineIndex, line.length);
        return range ? subtractHighlightRange(existing, range.start, range.end) : existing;
      });
      return { ...section, lineHighlights };
    });
    saveLyrics(updatedSections);
  }, [bible, state.trans, state.book, state.chapter, idx, vnum, song, patch, saveLyrics, rangeForLine]);

  const chipBase = (on: boolean) => cx(
    "h-[26px] px-[11px] rounded-[20px] text-[12px] cursor-pointer border",
    on ? "border-accent bg-accent-soft text-text font-semibold" : "border-border bg-panel2 text-muted font-normal"
  );

  const tabStyle = (on: boolean) => cx(
    "flex-1 h-[28px] rounded-[8px] border-none cursor-pointer text-[12.5px]",
    on ? "font-semibold bg-raise text-text shadow-app-sm" : "font-medium bg-transparent text-muted shadow-none"
  );

  const pill = (isAccent: boolean) => cx(
    "text-[11px] font-semibold tracking-[.04em] uppercase px-[9px] py-[3px] rounded-[6px] border",
    isAccent ? "bg-accent-soft text-accent border-accent" : "bg-raise text-muted border-border"
  );

  // onClasses must be a literal Tailwind class string since Tailwind can't generate classes assembled at runtime.
  const toolBtn = (on: boolean, onClasses: string) => cx(
    "h-[44px] px-[18px] rounded-[11px] text-[13.5px] font-semibold cursor-pointer border",
    on ? onClasses : "border-border bg-panel2 text-muted"
  );

  // Recomputes only when its own inputs change, not on every patch().
  const list = useMemo(() => {
    let filtered = allSongs.filter((songEntry) => {
      const query = state.query.trim().toLowerCase();
      const matchesQuery = !query || (songEntry.title + " " + songEntry.artist + " " + songEntry.tags.join(" ")).toLowerCase().includes(query);
      const matchesChip = state.chip === "All" || (state.chip === "Favorites" ? !!state.favs[songEntry.id] : songEntry.cat === state.chip);
      return matchesQuery && matchesChip;
    });
    if (state.sort === "A–Z") filtered = filtered.slice().sort((songA, songB) => songA.title.localeCompare(songB.title));
    if (state.sort === "Key") filtered = filtered.slice().sort((songA, songB) => songA.key.localeCompare(songB.key));
    return filtered;
  }, [allSongs, state.query, state.chip, state.favs, state.sort]);

  // Computed here for the audience output window; other surfaces derive their own via fitForLines.
  const fit = fitForLines(cur.lines);

  // ---- Second-monitor audience output (Electron only) ----

  const [outputStatus, setOutputStatus] = useState<OutputStatus>(DEFAULT_OUTPUT_STATUS);

  useEffect(() => {
    const electronDisplay = getElectronDisplay();
    if (!electronDisplay) return;
    electronDisplay.getStatus().then(setOutputStatus).catch(() => {});
    return electronDisplay.onStatusChanged(setOutputStatus);
  }, []);

  // Opens, closes, or re-targets the second-monitor output window when the user's choice changes.
  useEffect(() => {
    const electronDisplay = getElectronDisplay();
    if (!electronDisplay) return;
    if (state.outputEnabled) {
      electronDisplay.openOutput(state.outputDisplayId).then((result) => {
        if (!result.ok) {
          // Resets outputEnabled if opening the output window fails.
          console.error("Failed to open second-monitor output window:", result.reason);
          patch({ outputEnabled: false });
          return;
        }
        setOutputStatusFromOpenResult();
      }).catch((error) => {
        console.error("output:open IPC call failed:", error);
        patch({ outputEnabled: false });
      });
    } else {
      electronDisplay.closeOutput().catch((error) => {
        console.error("output:close IPC call failed:", error);
      });
    }

    function setOutputStatusFromOpenResult() {
      electronDisplay!.getStatus().then(setOutputStatus).catch((error) => {
        console.error("display:status IPC call failed:", error);
      });
    }
  }, [state.outputEnabled, state.outputDisplayId, patch]);

  // Present/F5/Fullscreen route to a second monitor when available, otherwise fall back to same-window fullscreen.
  const secondaryDisplayAvailable = useMemo(
    () => outputStatus.displays.some((display) => !display.isPrimary),
    [outputStatus.displays]
  );

  // Aspect ratio of the display currently or about to present, for cropping previews consistently.
  const outputAspectRatio = useMemo(() => {
    const targetDisplay = outputStatus.display ?? outputStatus.displays.find((display) => !display.isPrimary) ?? null;
    return targetDisplay && targetDisplay.height > 0 ? targetDisplay.width / targetDisplay.height : 16 / 9;
  }, [outputStatus.display, outputStatus.displays]);

  // Timer id for the 3-2-1 countdown; a ref so it survives re-renders.
  const presentCountdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPresentCountdownTimer = useCallback(() => {
    if (presentCountdownTimerRef.current !== null) {
      clearTimeout(presentCountdownTimerRef.current);
      presentCountdownTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearPresentCountdownTimer, [clearPresentCountdownTimer]);

  const isPresenting = state.presenting || state.outputEnabled;

  const startPresenting = useCallback(() => {
    // No-op if already presenting or a countdown is already running.
    if (isPresenting || presentCountdownTimerRef.current !== null || state.presentCountdown !== null) return;

    const tick = (remainingSeconds: number) => {
      if (remainingSeconds <= 0) {
        presentCountdownTimerRef.current = null;
        // Clears the countdown and starts presenting in the same patch.
        patch((previousState) => ({
          presentCountdown: null,
          ...(secondaryDisplayAvailable
            ? (previousState.outputEnabled ? {} : { outputEnabled: true })
            : { presenting: true }),
        }));
        return;
      }
      patch({ presentCountdown: remainingSeconds });
      presentCountdownTimerRef.current = setTimeout(() => tick(remainingSeconds - 1), 1000);
    };

    tick(3);
  }, [isPresenting, patch, secondaryDisplayAvailable, state.presentCountdown]);

  const stopPresenting = useCallback(() => {
    clearPresentCountdownTimer();
    patch({ presentCountdown: null, presenting: false, outputEnabled: false });
  }, [clearPresentCountdownTimer, patch]);

  // Mirrors state.presenting into the operator window's real OS fullscreen state.
  useEffect(() => {
    const electronDisplay = getElectronDisplay();
    if (!electronDisplay) return;
    electronDisplay.setOperatorFullScreen(state.presenting).catch(() => {});
  }, [state.presenting]);

  useEffect(() => {
    const onKey = (keyboardEvent: KeyboardEvent) => {
      const pressedKey = keyboardEvent.key;
      const isCmdOrCtrl = keyboardEvent.metaKey || keyboardEvent.ctrlKey;
      if (pressedKey === "F5") { keyboardEvent.preventDefault(); startPresenting(); return; }
      if (pressedKey === "Escape") {
        // Routed through stopPresenting so Escape also cancels an in-flight countdown.
        stopPresenting();
        patch({
          settingsOpen: false, setPanelOpen: false, lyricsEditorOpen: false, uploadOpen: false,
          lineupModalOpen: false, editingLineupId: null, displaysModalOpen: false, hotkeysOpen: false,
          globalSearchOpen: false, globalSearchQuery: "", songEditorOpen: false,
          bibleTranslationsPanelOpen: false, sidebarDrawerOpen: false,
        });
        return;
      }
      if (isCmdOrCtrl && (pressedKey === "k" || pressedKey === "K")) {
        keyboardEvent.preventDefault();
        patch((previousState) => ({ globalSearchOpen: !previousState.globalSearchOpen }));
        return;
      }
      const target = keyboardEvent.target as HTMLElement | null;
      const isTyping = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isTyping) return;
      if (isCmdOrCtrl && (pressedKey === "z" || pressedKey === "Z")) {
        keyboardEvent.preventDefault();
        if (keyboardEvent.shiftKey) redo(); else undo();
        return;
      }
      if (pressedKey === "ArrowRight" || pressedKey === " " || pressedKey === "PageDown") { keyboardEvent.preventDefault(); go(1); }
      else if (pressedKey === "ArrowLeft" || pressedKey === "PageUp" || pressedKey === "Backspace") { keyboardEvent.preventDefault(); go(-1); }
      // B toggles Blank, Shift+B toggles Black.
      else if (keyboardEvent.shiftKey && (pressedKey === "b" || pressedKey === "B")) {
        patch((previousState) => ({ black: !previousState.black, blank: false }));
      } else if (pressedKey === "b" || pressedKey === "B") {
        patch((previousState) => ({ blank: !previousState.blank, black: false }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, patch, startPresenting, stopPresenting, undo, redo]);

  // Pushes the current live slide to the output window on every change.
  useEffect(() => {
    const electronDisplay = getElectronDisplay();
    if (!electronDisplay || !outputStatus.active) return;
    const effectiveLook = (cur.lookId && allLooks.find((l) => l.id === cur.lookId)) || look;
    const payload: OutputState = {
      lines: hidden ? [] : cur.lines,
      lineHighlights: cur.lineHighlights,
      look: effectiveLook, black: state.black, hidden,
      lyricStyle: state.lyricStyle, fontClassName: lyricFamily,
      scale: state.scale, fit, caption: !hidden ? cur.caption : "",
      slideKey: state.mode + "|" + (bible ? state.book + "|" + state.chapter : song.id) + "|" + idx,
      transitionType: state.transitionType, transitionDurationMs: state.transitionDurationMs, performanceMode: state.performanceMode,
      compare: liveCompare ?? undefined,
    };
    electronDisplay.sendState(payload);
  }, [
    outputStatus.active, cur, look, allLooks, state.black, hidden, state.lyricStyle, lyricFamily, state.scale, fit,
    state.mode, bible, state.book, state.chapter, song.id, idx, state.transitionType, state.transitionDurationMs, state.performanceMode,
    liveCompare,
  ]);

  // ---- Update-notification bell (Electron only) ----

  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>(DEFAULT_UPDATE_STATUS);

  useEffect(() => {
    const electronUpdater = getElectronUpdater();
    if (!electronUpdater) return;
    electronUpdater.getStatus().then(setUpdateStatus).catch(() => {});
    return electronUpdater.onStatusChanged(setUpdateStatus);
  }, []);

  const installUpdate = useCallback(() => {
    getElectronUpdater()?.installUpdate();
  }, []);

  // Mirrors the auto-update toggle into the main process.
  useEffect(() => {
    getElectronUpdater()?.setAutoUpdateEnabled(state.autoUpdateEnabled).catch(() => {});
  }, [state.autoUpdateEnabled]);

  // ---- Compatibility mode (disables GPU acceleration; Electron only); takes effect after restart ----

  const [gpuAccelerationDisabled, setGpuAccelerationDisabledState] = useState(false);

  useEffect(() => {
    const electronCompat = getElectronCompat();
    if (!electronCompat) return;
    electronCompat.getGpuAccelerationDisabled().then(setGpuAccelerationDisabledState).catch(() => {});
  }, []);

  const setGpuAccelerationDisabled = useCallback((disabled: boolean) => {
    setGpuAccelerationDisabledState(disabled);
    getElectronCompat()?.setGpuAccelerationDisabled(disabled).catch(() => {});
  }, []);

  return {
    state, patch, theme, accent, ref, passage, vnum, vlabel, song, look, allLooks, slides, go, idx, cur, nxt, prv, hidden,
    bible, list, chipBase, tabStyle, pill, toolBtn, lyricFamily, fit,
    setSongs, saveLyrics, applyLiveHighlight, removeLiveHighlight, addSong, deleteSong, allSongs, toggleFavorite,
    createLineup, updateLineup, deleteLineup, activateLineup, reorderLineupSongs,
    addSongToLineup, removeSongFromLineup, renameLineup,
    adjustLayoutSize, toggleLayoutPanel, resetLayout, addBackground, deleteBackground,
    bibleBooks, currentBook, currentTransMeta, shortTransLabel, outputStatus, outputAspectRatio, secondaryDisplayAvailable,
    importBibleTranslation, removeBibleTranslation, openBibleDownloadsPage, bibleImportError,
    updateStatus, installUpdate, startPresenting, stopPresenting, isPresenting, presentCountdown: state.presentCountdown, prefsLoaded,
    gpuAccelerationDisabled, setGpuAccelerationDisabled,
    undo, redo, canUndo, canRedo,
    setSongMetaOverride, duplicateSongAsReprise,
    askConfirm, closeConfirm,
    duplicateSlide, mergeSlideWithNext, splitSlide, reorderSlides, setSlideLook,
    applySlideLookToLabel, applyLookToAllSlides,
    liveCompare, boundaryNextLabel, boundaryPrevLabel, canGoNext, canGoPrev,
    atStartOverflow, atEndOverflow, slideCount, compareTranslationBCode,
  };
}

export type UseLumen = ReturnType<typeof useLumen>;
