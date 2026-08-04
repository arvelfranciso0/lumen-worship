"use client";

import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getRepository } from "@/lib/repository";
import { normalizeBibleLanguage, parseBibleXml } from "../../electron/bibleXml.js";
import { cx } from "./cx";
import {
  addHighlightRange, BIBLE_DOWNLOADS_URL, bibleHighlightKey, bookAbbreviation, canonicalBookNumber,
  DEFAULT_LAYOUT_SIZES, DEFAULT_LAYOUT_VISIBILITY,
  DEFAULT_LYRIC_FONT, DEFAULT_LYRIC_STYLE, DEFAULT_TRANSLATION, LAYOUT_SIZE_LIMITS, LOADING_PASSAGE, LOOKS,
  LYRIC_FONTS, MISSING_PASSAGE, NOT_DOWNLOADED_PASSAGE, resolveCompareTranslation, SONGS, subtractHighlightRange,
  type BibleCollection, type BibleHighlights, type BibleTranslation, type CustomBackground,
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
import { getElectronUpdater, type UpdateStatus } from "./electronUpdater";
import type { ParsedSong } from "./songImport";
import { useBibleTranslation } from "./useBibleTranslation";

const DEFAULT_OUTPUT_STATUS: OutputStatus = { active: false, selectedDisplayId: "auto", display: null, displays: [] };
const DEFAULT_UPDATE_STATUS: UpdateStatus = { status: "idle" };

const shortTransLabel = (code: string) => code.replace(/^(English|Cebuano)/, "") || code;

const MAX_BACKGROUND_IMAGE_DIMENSION = 1920;

// Posters only ever fill small preview boxes, so there's no reason to keep a
// full-resolution frame of a 4K clip in memory as a data URL.
const POSTER_MAX_DIMENSION = 640;

// Where to sample, as fractions of the clip's duration, tried in order. Stock
// footage very often fades in from black, so frame 0 makes a useless thumbnail
// — that is exactly the "the background preview is just a black box" symptom
// this sequence exists to avoid. 0 is last purely as a final fallback.
const POSTER_SAMPLE_POSITIONS = [0.1, 0.35, 0.6, 0];

// Mean luminance (0-255) below which a captured frame is treated as "basically
// black" and another position is tried.
const POSTER_MIN_MEAN_LUMINANCE = 8;

const POSTER_EVENT_TIMEOUT_MS = 15_000;

// Resolves on `eventName`, rejects on the video erroring or on a timeout — so a
// clip that never loads can't leave the caller's promise pending forever.
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

// Rough average brightness of what's currently on the canvas, used only to tell
// "real frame" from "black lead-in frame". Samples every 16th pixel — this runs
// several times per video on load and exactness buys nothing here.
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

// Captures a representative still from a video as a data URL, so every preview
// spot (the slides grid, Previous/Next up, the Backgrounds panel) can show what
// the background actually looks like without independently decoding the clip.
async function generateVideoPoster(videoUrl: string): Promise<string> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  // Needed to draw the frame to a canvas and read it back via toDataURL —
  // without it, a video loaded from a different origin (the Electron
  // build's lumen-media:// custom protocol, distinct from the page's
  // http://) taints the canvas and toDataURL throws a SecurityError, even
  // though playback itself works fine either way. See the matching
  // Access-Control-Allow-Origin header on the lumen-media:// response in
  // electron/main.js — both sides are required. Skipped for blob: URLs
  // (the browser/IndexedDB backend) — those are always same-origin and
  // never carry CORS headers, so setting crossOrigin on them makes some
  // browsers fail the load entirely instead of being a harmless no-op.
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

    // A live stream (or a clip whose metadata hasn't settled) reports a
    // non-finite duration and can't be seeked — it only gets the frame it's
    // already sitting on.
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

    // Every sampled frame was near-black — the clip genuinely is dark, so the
    // first capture is still the most honest preview available.
    if (!firstCapturedPoster) throw new Error("Could not capture any frame");
    return firstCapturedPoster;
  } finally {
    // Drops the decoder and the buffered data; without this each poster
    // capture leaves a detached video element holding onto the whole clip.
    video.removeAttribute("src");
    video.load();
  }
}

// Caps an uploaded image to a sane max dimension before it's stored, so a
// dropped-in 4K/12MP photo doesn't cost full-resolution paint everywhere the
// background renders. Re-encodes as JPEG regardless of the source format —
// fine for a fullscreen background, but does drop alpha transparency.
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

const BIBLE_CACHE_LIMIT = 2;

// Keeps only the most-recently-added translations in memory — holding every
// translation ever viewed in a session, unbounded (each can be several MB
// parsed), is real memory pressure on a low-RAM device. Never evicts
// `activeCode` (whichever translation is currently on screen), so switching
// away and back never causes a visible "Loading translation…" flash for the
// one still being viewed.
function withBibleCacheEntry(
  cache: Record<string, BibleTranslation>, code: string, data: BibleTranslation, activeCode: string
): Record<string, BibleTranslation> {
  const next = { ...cache, [code]: data };
  const evictable = Object.keys(next).filter((key) => key !== code && key !== activeCode);
  while (Object.keys(next).length > BIBLE_CACHE_LIMIT && evictable.length > 0) {
    delete next[evictable.shift() as string];
  }
  return next;
}

// Next/Previous boundary rules (Bible chapter/book crossing, set-song crossing,
// and the hard stops at the ends of each) live in ./navigation as pure
// functions — see that file's header for the rules in one place.

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

// What the Live output renders while sitting on one of those positions: no
// lines, no label, and crucially no caption, so nothing is left on the audience
// screen.
const BLANK_SLIDE: Slide = { label: "", lines: [], slideNumber: 0, caption: "" };

const SONG_USAGE_HISTORY_CAP = 20;
const BIBLE_HISTORY_CAP = 20;
const UNDO_STACK_CAP = 50;

// Undo/redo only tracks "content" edits — deliberately excludes navigation
// and UI-open/ephemeral state (which song/verse is selected, which modal is
// open, etc.), so Ctrl+Z undoes an actual edit rather than surprising the
// operator by jumping them somewhere else in the app.
const HISTORY_TRACKED_KEYS: (keyof LumenState)[] = [
  "songOverrides", "songMetaOverrides", "setIds", "setName", "lyricStyle",
  "customBackgrounds", "bibleHighlights", "favs", "bibleFavorites", "lineups",
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
  blank: boolean;
  black: boolean;
  settingsOpen: boolean;
  font: LyricFontId;
  chords: boolean;
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
  layoutSizes: LayoutSizes;
  layoutVisibility: LayoutVisibility;
  customBackgrounds: CustomBackground[];
  downloadedTranslations: DownloadedBibleTranslation[];
  lyricStyle: LyricStyle;
  bibleHighlights: BibleHighlights;
  // Whether a second-monitor "audience output" window should be open, and
  // which display it targets — "auto" picks the first non-primary display.
  // Persisted like any other pref; the actual window lives in the Electron
  // main process (see electronDisplay.ts / OutputWindowApp.tsx) and is a
  // no-op in the plain browser build.
  outputEnabled: boolean;
  outputDisplayId: number | "auto";
  // Whether the desktop build should check GitHub Releases for updates on
  // launch (see the header bell / electron/main.js). A no-op preference in
  // the browser build, since getElectronUpdater() is always null there.
  autoUpdateEnabled: boolean;
  // Whether the first-launch welcome guide (WelcomeModal) has already been
  // shown/dismissed. Settings has a "Replay welcome guide" link that just
  // flips this back to false. Superseded by tourSeen below (kept only so
  // loadAll's hydration can migrate an existing true value forward once).
  hasSeenOnboarding: boolean;

  // ---- Redesign additions (persisted) ----
  performanceMode: boolean;
  transitionType: "cut" | "fade" | "slide" | "zoom" | "push";
  transitionSpeedPct: number;
  bibleFavorites: Record<string, boolean>;
  bibleHistory: { key: string; label: string; viewedAt: number }[];
  operatorNotes: string;
  tourSeen: TourSeenFlags;
  songUsageHistory: Record<string, number[]>;
  deletedLookIds: string[];
  bibleCollections: BibleCollection[];
  songMetaOverrides: Record<string, Partial<Song>>;

  // ---- Redesign additions (ephemeral — never persisted) ----
  confirmDialog: ConfirmDialogState | null;
  saveStatus: "idle" | "saving" | "saved";
  displaysModalOpen: boolean;
  bibleTranslationsPanelOpen: boolean;
  // Backgrounds and Transitions are no longer modals — both are panels that
  // live inline in the main column (see MainPanel.tsx / BackgroundsPanel.tsx /
  // TransitionRow.tsx), matching the operator-screen handoff design. What's
  // left here is only their in-panel UI state.
  transitionRowOpen: boolean;
  backgroundCategory: string;
  backgroundApplyAllArmed: boolean;
  operatorNotesOpen: boolean;
  // Text selected on the Live output box (captured in PreviewPanel, where the
  // box now lives) — read by MainPanel's Highlight controls, which sit in a
  // different column entirely.
  liveSelection: LiveHighlightSelection | null;
  highlightColor: string;
  hotkeysOpen: boolean;
  globalSearchOpen: boolean;
  globalSearchQuery: string;
  songEditorOpen: boolean;
  songEditorMode: "create" | "edit";
  bulkSelectMode: boolean;
  bulkSelectedIds: string[];
  bibleSubTab: "browse" | "compare" | "history" | "favorites" | "collections";
  // Session-only key transpose, reset whenever the live song/slide changes —
  // deliberately not persisted or sent to the audience output (operator-only,
  // like the existing chords toggle).
  transposeSemitones: number;
  // Panel show/hide is layoutVisibility (persisted) alone — a hidden panel
  // collapses to a one-click vertical strip on desktop rather than vanishing,
  // so there is no separate "collapsed" state to keep in sync with it.
  // Tablet/mobile only — the desktop layout's sidebar is always an inline
  // flex sibling (see LumenApp.tsx), never a drawer.
  sidebarDrawerOpen: boolean;
  // Mobile only — single-pane view switcher, driven by MobileTabBar.tsx.
  // "slides" shows the main column (song info + slides + backgrounds),
  // "live" shows the preview column (live output + transport).
  mobileView: "library" | "slides" | "live";
  tourStep: number;
  tourMode: TourMode | null;
  compareMode: { verseIndex: number; translationB: string } | null;
};

type Slide = {
  label: string; lines: string[]; lineHighlights?: HighlightRange[][]; slideNumber: number; caption: string;
  // Song mode only — a per-slide background override (references a
  // Look/CustomBackground id) and operator note, both carried straight
  // through from Section (see data.ts) since Slide is otherwise just a
  // read-only projection of it.
  lookId?: string; note?: string;
};

const INITIAL_STATE: LumenState = {
  query: "", chip: "All", sort: "Recent", songId: "s3", idx: 2,
  favs: { s1: true, s3: true, s6: true },
  look: "aurora", scale: 1, presenting: false, blank: false, black: false,
  settingsOpen: false, font: DEFAULT_LYRIC_FONT, chords: false, theme: null,
  mode: "songs", book: "Genesis", chapter: 1, trans: DEFAULT_TRANSLATION,
  setIds: ["s1", "s3", "s4", "s6"], setName: "Set 1", activeLineupId: null, setPanelOpen: false,
  songOverrides: {}, lyricsEditorOpen: false,
  customSongs: [], uploadOpen: false,
  lineups: [], lineupModalOpen: false, editingLineupId: null,
  layoutSizes: DEFAULT_LAYOUT_SIZES, layoutVisibility: DEFAULT_LAYOUT_VISIBILITY,
  customBackgrounds: [],
  downloadedTranslations: [],
  lyricStyle: DEFAULT_LYRIC_STYLE,
  bibleHighlights: {},
  outputEnabled: false, outputDisplayId: "auto",
  autoUpdateEnabled: false,
  hasSeenOnboarding: false,

  performanceMode: false,
  transitionType: "cut", transitionSpeedPct: 50,
  bibleFavorites: {}, bibleHistory: [], operatorNotes: "",
  tourSeen: TOUR_SEEN_DEFAULT, songUsageHistory: {}, deletedLookIds: [],
  bibleCollections: [], songMetaOverrides: {},

  confirmDialog: null, saveStatus: "idle",
  displaysModalOpen: false, hotkeysOpen: false, globalSearchOpen: false, globalSearchQuery: "",
  bibleTranslationsPanelOpen: false,
  transitionRowOpen: true, backgroundCategory: "All", backgroundApplyAllArmed: false,
  operatorNotesOpen: false, liveSelection: null, highlightColor: "#fde047",
  songEditorOpen: false, songEditorMode: "create",
  bulkSelectMode: false, bulkSelectedIds: [],
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
  // Tracked via a useEffect diffing consecutive `state` values, rather than
  // inside patch()'s own setState updater, so it's immune to React
  // dev-mode double-invocation of updater functions. undo()/redo() flip
  // isUndoRedoApplyingRef first so their own resulting state change is never
  // re-captured as a new undoable edit. Stacks are plain useState (not refs)
  // so canUndo/canRedo can read them directly during render.
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

  // Gates WelcomeModal — without this, state.hasSeenOnboarding briefly reads
  // its INITIAL_STATE default of false (even for a returning user) until
  // loadAll() resolves, which would flash the welcome guide open for an
  // instant on every launch.
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getRepository().loadAll().then((data) => {
      if (cancelled) return;
      // The repository returns these in insertion order (oldest first) —
      // reversed here so the most recently added/downloaded item is always
      // first, matching how new items get prepended in-session below.
      //
      // Languages are re-normalized on the way in, not just at import time, so
      // rows stored before normalizeBibleLanguage existed (which could have a
      // whole translation title sitting in `language`) show up correctly in the
      // sidebar's Language list without the user having to re-import anything.
      const downloadedTranslations = [...data.downloadedBibleTranslations].reverse().map((entry) => ({
        ...entry,
        language: normalizeBibleLanguage(entry.language, entry.name),
      }));
      patch({
        customSongs: [...data.customSongs].reverse(),
        lineups: [...data.lineups].reverse(),
        customBackgrounds: [...data.customBackgrounds].reverse(),
        downloadedTranslations,
        songOverrides: data.songOverrides,
        bibleCollections: data.bibleCollections,
        songMetaOverrides: data.songMetaOverrides,
        ...data.prefs,
        // Migrates the old single global hasSeenOnboarding flag into the new
        // per-mode tourSeen flags, once — only when a saved tourSeen isn't
        // already present (a fresh install has neither, and gets all-false).
        ...(data.prefs.tourSeen
          ? {}
          : { tourSeen: data.prefs.hasSeenOnboarding ? { songs: true, bible: true, lineups: true } : TOUR_SEEN_DEFAULT }),
        // Lands on the first translation in the list (most recently
        // imported/downloaded — same order as the Settings list) at Genesis
        // 1, rather than the hardcoded DEFAULT_TRANSLATION code that
        // nothing is ever actually imported as. Left alone (existing
        // not-downloaded placeholder behavior) when nothing's imported yet.
        // trans/book/chapter/idx are never persisted, so this runs fresh
        // every launch — there's no "first ever launch" to distinguish.
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
            // Preview spots show LookBackground's striped "video" placeholder
            // until a reload retries this — never a live decode, which is the
            // lag this poster mechanism exists to avoid. Logged so a silent
            // failure here doesn't read as "the preview is just broken".
            console.error("Failed to generate poster for background " + background.id + ":", error);
          });
        });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [patch]);

  useEffect(() => {
    const persistTimeout = setTimeout(() => {
      patch({ saveStatus: "saving" });
      getRepository().setPrefs({
        favs: state.favs, look: state.look, scale: state.scale, theme: state.theme,
        font: state.font, chords: state.chords, setIds: state.setIds, setName: state.setName,
        layoutSizes: state.layoutSizes, layoutVisibility: state.layoutVisibility, lyricStyle: state.lyricStyle,
        bibleHighlights: state.bibleHighlights, outputEnabled: state.outputEnabled, outputDisplayId: state.outputDisplayId,
        autoUpdateEnabled: state.autoUpdateEnabled, hasSeenOnboarding: state.hasSeenOnboarding,
        performanceMode: state.performanceMode, transitionType: state.transitionType,
        transitionSpeedPct: state.transitionSpeedPct, bibleFavorites: state.bibleFavorites,
        bibleHistory: state.bibleHistory, operatorNotes: state.operatorNotes, tourSeen: state.tourSeen,
        songUsageHistory: state.songUsageHistory, deletedLookIds: state.deletedLookIds,
      }).then(() => {
        patch({ saveStatus: "saved" });
        setTimeout(() => patch({ saveStatus: "idle" }), 1500);
      });
    }, 400);
    return () => clearTimeout(persistTimeout);
  }, [
    patch,
    state.favs, state.look, state.scale, state.theme, state.font, state.chords, state.setIds, state.setName,
    state.layoutSizes, state.layoutVisibility, state.lyricStyle, state.bibleHighlights,
    state.outputEnabled, state.outputDisplayId, state.autoUpdateEnabled, state.hasSeenOnboarding,
    state.performanceMode, state.transitionType, state.transitionSpeedPct, state.bibleFavorites,
    state.bibleHistory, state.operatorNotes, state.tourSeen, state.songUsageHistory, state.deletedLookIds,
  ]);

  const [bibleCache, setBibleCache] = useState<Record<string, BibleTranslation>>({});
  const bibleCacheRef = useRef(bibleCache);
  bibleCacheRef.current = bibleCache;
  // Tracks translations that aren't locally imported — distinct from "still
  // loading", so the UI can tell the two apart instead of showing
  // LOADING_PASSAGE forever (see NOT_DOWNLOADED_PASSAGE). This app bundles no
  // Bible data at all: every translation comes from the repository,
  // populated only via importBibleTranslation.
  const [bibleLoadFailed, setBibleLoadFailed] = useState<Record<string, boolean>>({});
  // Bumped by removeBibleTranslation so the lookup effect re-runs even though
  // state.trans itself didn't change — otherwise deleting the *currently
  // viewed* translation would clear its cache entry but never re-check
  // whether it's still available, leaving the passage stuck.
  const [bibleRefreshTick, setBibleRefreshTick] = useState(0);

  useEffect(() => {
    if (bibleCacheRef.current[state.trans]) return;
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
  // The language whose book names this translation is using — the same value the
  // parser keyed its name table off, and what bookAbbreviation needs to label a
  // reference in the reader's own language rather than an English code.
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

  // Follows the selected book across a translation switch between languages,
  // which name the same book differently ("Psalms" vs "Mga Salmo"). Without
  // this, switching translations leaves state.book pointing at a name the new
  // one has never heard of and the whole Bible view dead-ends on "this chapter
  // isn't available". Matched by canonical book number, falling back to the
  // first book only when the name is unrecognizable.
  //
  // A genuine correction of state that has gone stale relative to newly-loaded
  // data, not state derived from render — eslint's set-state-in-effect check
  // doesn't distinguish the two.
  useEffect(() => {
    if (!translation || bibleBooks.length === 0 || currentBook) return;
    const bookNumber = canonicalBookNumber(state.book);
    const replacement = (bookNumber !== null && bibleBooks.find((book) => book.number === bookNumber)) || bibleBooks[0];
    if (!replacement || replacement.name === state.book) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    patch({ book: replacement.name, chapter: 1, idx: 0 });
  }, [translation, bibleBooks, currentBook, state.book, patch]);
  const vnum = useCallback((verseIndex: number) => currentChapter?.verses[verseIndex]?.number ?? verseIndex + 1, [currentChapter]);
  // Display label for a verse — a plain number normally, or a range
  // ("1-3") for a verse bridge (see BibleVerse.endNumber). vnum above stays
  // the raw start number since it's also used as a stable highlight-cache
  // key; this is purely for what the presenter/audience sees.
  const vlabel = useCallback((verseIndex: number) => {
    const verse = currentChapter?.verses[verseIndex];
    return verse ? formatVerseLabel(verse) : String(verseIndex + 1);
  }, [currentChapter]);

  // Bible Compare (BibleComparePanel/Sidebar) — a second translation's text
  // at the same book/chapter/verse position, fetched independently of the
  // primary bibleCache (see useBibleTranslation's own doc comment for why).
  //
  // state.compareMode is only a *request* to compare; it is re-validated here
  // rather than trusted, because the conditions that make comparison possible
  // can disappear under it — the second translation gets deleted, or the primary
  // is switched to the very translation being compared against. Left unchecked
  // that put the same verse on the audience screen twice, captioned as if it
  // were two different translations.
  const compareTranslationBCode = useMemo(
    () => resolveCompareTranslation(
      state.compareMode?.translationB,
      state.trans,
      state.downloadedTranslations.map((entry) => entry.code)
    ),
    [state.compareMode, state.trans, state.downloadedTranslations]
  );

  // Drops a compare request once it can no longer be honoured, so the sidebar's
  // Compare panel and the Live output never disagree about whether comparison is
  // running. A genuine correction of state invalidated by other state changing
  // (a translation removed, the primary switched), not state derived from
  // render — eslint's set-state-in-effect check doesn't distinguish the two.
  useEffect(() => {
    if (!state.compareMode || compareTranslationBCode) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    patch({ compareMode: null });
  }, [state.compareMode, compareTranslationBCode, patch]);

  const compareTranslationB = useBibleTranslation(compareTranslationBCode);
  const compareVerseTextB = useMemo(() => {
    if (!compareTranslationBCode || !compareTranslationB) return null;
    const bookB = compareTranslationB.books.find((entry) => entry.name === state.book);
    const chapterB = bookB?.chapters.find((entry) => entry.number === state.chapter);
    return chapterB?.verses[state.idx]?.text ?? null;
  }, [compareTranslationBCode, compareTranslationB, state.book, state.chapter, state.idx]);

  // songMetaOverrides is applied on top of both custom and built-in songs —
  // lets tags/CCLI/title/etc. be edited on any song, not just custom-*
  // (see setSongMetaOverride and SongEditorModal, which use this for every
  // song uniformly).
  const allSongs = useMemo(
    () => [...state.customSongs, ...SONGS].map((baseSong) => {
      const metaOverride = state.songMetaOverrides[baseSong.id];
      return metaOverride ? { ...baseSong, ...metaOverride } : baseSong;
    }),
    [state.customSongs, state.songMetaOverrides]
  );

  const song = useMemo(() => {
    const baseSong = allSongs.find((candidate) => candidate.id === state.songId) || allSongs[0];
    const override = state.songOverrides[baseSong.id];
    return override ? { ...baseSong, sections: override } : baseSong;
  }, [state.songId, state.songOverrides, allSongs]);
  const allLooks = useMemo(
    () => [...state.customBackgrounds, ...LOOKS.filter((lookEntry) => !state.deletedLookIds.includes(lookEntry.id))],
    [state.customBackgrounds, state.deletedLookIds]
  );
  const look = useMemo(() => allLooks.find((lookEntry) => lookEntry.id === state.look) || allLooks[0] || LOOKS[0], [allLooks, state.look]);

  const setSongs = useMemo(
    () => state.setIds.map((songId) => allSongs.find((candidate) => candidate.id === songId)).filter((maybeSong): maybeSong is Song => !!maybeSong),
    [state.setIds, allSongs]
  );
  const inSet = state.mode === "songs" && state.setIds.includes(song.id);
  const toggleSetSong = useCallback((songId: string) => {
    patch((previousState) => ({
      setIds: previousState.setIds.includes(songId)
        ? previousState.setIds.filter((existingSongId) => existingSongId !== songId)
        : [...previousState.setIds, songId],
      // Editing the working set by hand detaches it from whichever saved
      // lineup it was copied from — otherwise the header would keep
      // claiming a song count that no longer matches that lineup.
      activeLineupId: null,
    }));
  }, [patch]);

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
    patch((previousState) => ({
      lineups: previousState.lineups.filter((lineup) => lineup.id !== lineupId),
      // The header shows the working set's name/count, copied from the
      // lineup that seeded it — if that's the lineup just deleted, the
      // label would otherwise keep pointing at a lineup that no longer
      // exists anywhere in the Lineups tab.
      ...(previousState.activeLineupId === lineupId ? { setName: "Untitled set", activeLineupId: null } : {}),
    }));
  }, [patch]);

  const activateLineup = useCallback((lineupId: string) => {
    patch((previousState) => {
      const targetLineup = previousState.lineups.find((entry) => entry.id === lineupId);
      return targetLineup
        ? { setIds: targetLineup.songIds, setName: targetLineup.name, activeLineupId: lineupId, setPanelOpen: false }
        : {};
    });
  }, [patch]);

  // Shared by every lineup-membership mutation (reorder here, add/remove-
  // from-library in Stage 6's Sidebar drag-and-drop) — looks up the lineup,
  // runs `updater` over its songIds, persists, and patches state, so each
  // call site only has to supply the actual songIds transform.
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
    // The object URL works immediately in this session regardless of backend —
    // the repository's own URL resolution (blob vs custom protocol) only
    // matters for backgrounds reloaded via loadAll() on a later launch.

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

    // Video: left untouched (client-side transcoding isn't worth the cost/
    // complexity here), but a poster frame is captured once so every preview
    // spot can skip decoding it — including MainPanel's own Live output box
    // while a different live decode is already showing the same background
    // elsewhere (presenting fullscreen or to a second monitor; see its
    // `preview` prop), since two simultaneous full decodes of the same
    // source is real, avoidable CPU cost on low-end hardware.
    const objectUrl = URL.createObjectURL(file);
    const fileData = await file.arrayBuffer();
    getRepository().addBackground({ id: backgroundId, name: file.name, mediaType, mimeType: file.type, data: fileData });
    patch((previousState) => ({
      customBackgrounds: [{ id: backgroundId, name: file.name, mediaType, url: objectUrl }, ...previousState.customBackgrounds],
      look: backgroundId,
    }));
    // Deliberately not awaited before the patch above: capturing a frame means
    // loading and seeking the clip, which would otherwise stall the upload for
    // seconds on a large file. Attached the moment it's ready, exactly the way
    // loadAll's hydration fills posters in for already-stored videos.
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

  // Imports a translation file the user downloaded from the Bible
  // translations page (BIBLE_DOWNLOADS_URL) — mirrors addBackground's
  // file-upload pattern, but the source is a manual download rather than
  // in-app networking, since this app bundles no Bible data at all.
  //
  // Format is detected by content, not filename/extension — deliberately,
  // so a renamed download or a browser's "(1)" duplicate-filename suffix on
  // a re-download can never cause a misdetection. JSON is tried first (the
  // original, still-supported format real users already have imported);
  // XML (the new format) is only attempted if that fails.
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
      // file.name as a fallback identity — real-world files (e.g. the
      // Cebuano RCPV sample in public/bible/) often have no `code`/`id`
      // attribute of their own; parseBibleXml only falls back to this when
      // the file's own content doesn't supply one.
      parsed = parseBibleXml(text, file.name) as BibleTranslation;
      format = "xml";
    }
    if (!parsed?.meta?.code || !parsed?.meta?.name || !Array.isArray(parsed?.books) || parsed.books.length === 0) {
      setBibleImportError(file.name + " doesn't look like a Bible translation file.");
      return;
    }
    const { code, name } = parsed.meta;
    // parseBibleXml already normalizes this, but the JSON import path above
    // doesn't go through it — a pre-converted manifest could carry a
    // title-shaped language, so both paths get normalized here.
    const language = normalizeBibleLanguage(parsed.meta.language, name);
    const license = parsed.meta.license || "";
    const link = parsed.meta.link ?? null;
    const data = await file.arrayBuffer();
    getRepository().addBibleTranslation({ code, language, name, license, link, data, format });
    patch((previousState) => ({
      downloadedTranslations: [
        { code, language, name, license, link, downloadedAt: Date.now(), sizeBytes: data.byteLength },
        ...previousState.downloadedTranslations.filter((entry) => entry.code !== code),
      ],
    }));
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

  // ---- Slide filmstrip editing (song mode only — Bible slides aren't
  // Section-based, so these operate on song.sections via saveLyrics, riding
  // the same songOverrides persistence with no new backend table). ----

  const duplicateSlide = useCallback((sectionIndex: number) => {
    const target = song.sections[sectionIndex];
    if (!target) return;
    const next = song.sections.slice();
    next.splice(sectionIndex + 1, 0, { ...target, lines: [...target.lines] });
    saveLyrics(next);
  }, [song.sections, saveLyrics]);

  const mergeSlideWithNext = useCallback((sectionIndex: number) => {
    const current = song.sections[sectionIndex];
    const next = song.sections[sectionIndex + 1];
    if (!current || !next) return;
    const merged: Section = {
      label: current.label,
      lines: [...current.lines, ...next.lines],
      lineHighlights: (current.lineHighlights || current.lines.map(() => [])).concat(next.lineHighlights || next.lines.map(() => [])),
    };
    const updated = song.sections.slice();
    updated.splice(sectionIndex, 2, merged);
    saveLyrics(updated);
  }, [song.sections, saveLyrics]);

  const splitSlide = useCallback((sectionIndex: number, atLineIndex: number) => {
    const target = song.sections[sectionIndex];
    if (!target || atLineIndex <= 0 || atLineIndex >= target.lines.length) return;
    const firstHalf: Section = {
      label: target.label, lines: target.lines.slice(0, atLineIndex), lineHighlights: target.lineHighlights?.slice(0, atLineIndex),
    };
    const secondHalf: Section = {
      label: target.label, lines: target.lines.slice(atLineIndex), lineHighlights: target.lineHighlights?.slice(atLineIndex),
    };
    const updated = song.sections.slice();
    updated.splice(sectionIndex, 1, firstHalf, secondHalf);
    saveLyrics(updated);
  }, [song.sections, saveLyrics]);

  const reorderSlides = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const updated = song.sections.slice();
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    saveLyrics(updated);
  }, [song.sections, saveLyrics]);

  const setSlideNote = useCallback((sectionIndex: number, note: string) => {
    const updated = song.sections.map((section, index) => (index === sectionIndex ? { ...section, note } : section));
    saveLyrics(updated);
  }, [song.sections, saveLyrics]);

  const setSlideLook = useCallback((sectionIndex: number, lookId: string | undefined) => {
    const updated = song.sections.map((section, index) => (index === sectionIndex ? { ...section, lookId } : section));
    saveLyrics(updated);
  }, [song.sections, saveLyrics]);

  // Bulk-applies a look to every section sharing sectionIndex's label
  // ("apply to all"), or to that label's sections from sectionIndex onward
  // ("apply to remaining") — both still just one saveLyrics call.
  const applySlideLookToLabel = useCallback((sectionIndex: number, lookId: string | undefined, scope: "all" | "remaining") => {
    const label = song.sections[sectionIndex]?.label;
    if (label === undefined) return;
    const updated = song.sections.map((section, index) => {
      if (section.label !== label) return section;
      if (scope === "remaining" && index < sectionIndex) return section;
      return { ...section, lookId };
    });
    saveLyrics(updated);
  }, [song.sections, saveLyrics]);

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

  // Only ever called on a custom (user-created) song — the built-in SONGS
  // sample data isn't persisted anywhere, so there's nothing to delete there.
  const deleteSong = useCallback((songId: string) => {
    getRepository().deleteSong(songId);
    patch((previousState) => ({
      customSongs: previousState.customSongs.filter((customSong) => customSong.id !== songId),
      // Falls back to the first built-in song if the deleted one was active —
      // same reasoning as deleteBackground falling back to LOOKS[0].
      ...(previousState.songId === songId ? { songId: SONGS[0].id, idx: 0 } : {}),
    }));
  }, [patch]);

  // A shallow-patch overlay on top of ANY song (custom or built-in) — unlike
  // updateSongMetadata above (full replacement, custom-* only), this is what
  // lets tags/CCLI/etc. be edited on the built-in SONGS sample data too (see
  // the allSongs memo, which applies this on top of both lists).
  const setSongMetaOverride = useCallback((songId: string, metaPatch: Partial<Song>) => {
    getRepository().setSongMetaOverride(songId, metaPatch);
    patch((previousState) => ({
      songMetaOverrides: {
        ...previousState.songMetaOverrides,
        [songId]: { ...previousState.songMetaOverrides[songId], ...metaPatch },
      },
    }));
  }, [patch]);

  // Copies a song (its current effective title/artist/sections, including
  // any override) as a new custom song titled "<title> (Reprise)" — for
  // reusing a song later in the same service with its own independent
  // slide/lyric edits, without touching the original.
  const duplicateSongAsReprise = useCallback((songId: string) => {
    const baseSong = allSongs.find((candidate) => candidate.id === songId);
    if (!baseSong) return;
    const sections = state.songOverrides[songId] ?? baseSong.sections;
    const newSongId = "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const newSong: Song = { ...baseSong, id: newSongId, title: baseSong.title + " (Reprise)", fav: false, when: "Just added", sections };
    getRepository().upsertSong(newSong);
    patch((previousState) => ({ customSongs: [newSong, ...previousState.customSongs] }));
  }, [allSongs, state.songOverrides, patch]);

  // Recorded whenever a song becomes the selected/live song (Sidebar song
  // click, Header's set-panel jump) — there's no dedicated "history" field on
  // Song itself, so this lives as its own capped-per-song timestamp list.
  const recordSongUsage = useCallback((songId: string) => {
    patch((previousState) => ({
      songUsageHistory: {
        ...previousState.songUsageHistory,
        [songId]: [Date.now(), ...(previousState.songUsageHistory[songId] ?? [])].slice(0, SONG_USAGE_HISTORY_CAP),
      },
    }));
  }, [patch]);

  const askConfirm = useCallback((options: ConfirmDialogState) => {
    patch({ confirmDialog: options });
  }, [patch]);

  const closeConfirm = useCallback(() => {
    patch({ confirmDialog: null });
  }, [patch]);

  const toggleBibleFavorite = useCallback((key: string) => {
    patch((previousState) => ({ bibleFavorites: { ...previousState.bibleFavorites, [key]: !previousState.bibleFavorites[key] } }));
  }, [patch]);

  // Records the most recently viewed Bible reference — de-duplicated (a
  // re-visit moves it back to the front rather than appearing twice) and
  // capped, mirroring the BIBLE_CACHE_LIMIT eviction pattern above.
  const recordBibleHistory = useCallback((key: string, label: string) => {
    patch((previousState) => ({
      bibleHistory: [
        { key, label, viewedAt: Date.now() },
        ...previousState.bibleHistory.filter((entry) => entry.key !== key),
      ].slice(0, BIBLE_HISTORY_CAP),
    }));
  }, [patch]);

  const upsertBibleCollection = useCallback((collection: BibleCollection) => {
    getRepository().upsertBibleCollection(collection);
    patch((previousState) => ({
      bibleCollections: previousState.bibleCollections.some((entry) => entry.id === collection.id)
        ? previousState.bibleCollections.map((entry) => (entry.id === collection.id ? collection : entry))
        : [collection, ...previousState.bibleCollections],
    }));
  }, [patch]);

  const createBibleCollection = useCallback((name: string) => {
    const id = "coll-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    upsertBibleCollection({ id, name, verseRefs: [] });
  }, [upsertBibleCollection]);

  const deleteBibleCollection = useCallback((id: string) => {
    getRepository().deleteBibleCollection(id);
    patch((previousState) => ({ bibleCollections: previousState.bibleCollections.filter((entry) => entry.id !== id) }));
  }, [patch]);

  const addVerseToCollection = useCallback((collectionId: string, verseRef: { book: string; chapter: number; verse: number }) => {
    patch((previousState) => {
      const target = previousState.bibleCollections.find((entry) => entry.id === collectionId);
      if (!target) return {};
      const exists = target.verseRefs.some((ref) => ref.book === verseRef.book && ref.chapter === verseRef.chapter && ref.verse === verseRef.verse);
      if (exists) return {};
      const updated = { ...target, verseRefs: [...target.verseRefs, verseRef] };
      getRepository().upsertBibleCollection(updated);
      return { bibleCollections: previousState.bibleCollections.map((entry) => (entry.id === collectionId ? updated : entry)) };
    });
  }, [patch]);

  const removeVerseFromCollection = useCallback((collectionId: string, verseRef: { book: string; chapter: number; verse: number }) => {
    patch((previousState) => {
      const target = previousState.bibleCollections.find((entry) => entry.id === collectionId);
      if (!target) return {};
      const updated = {
        ...target,
        verseRefs: target.verseRefs.filter((ref) => !(ref.book === verseRef.book && ref.chapter === verseRef.chapter && ref.verse === verseRef.verse)),
      };
      getRepository().upsertBibleCollection(updated);
      return { bibleCollections: previousState.bibleCollections.map((entry) => (entry.id === collectionId ? updated : entry)) };
    });
  }, [patch]);

  const slides = useMemo<Slide[]>(() => {
    if (state.mode === "bible") {
      return passage.map((verseText, verseIndex) => {
        const key = bibleHighlightKey(state.trans, state.book, state.chapter, vnum(verseIndex));
        return {
          label: "v" + vlabel(verseIndex), lines: [verseText], lineHighlights: [state.bibleHighlights[key] ?? []],
          // Compact reference caption ("PSA 23:2 KJV") — kept short so it reads
          // as a footnote under the verse rather than a second line of content.
          slideNumber: verseIndex + 1,
          caption: bookAbbreviation(state.book, bibleLanguage) + " " + state.chapter + ":" + vlabel(verseIndex) + " " + shortTransLabel(state.trans),
        };
      });
    }
    return song.sections.map((section, sectionIndex) => ({
      label: section.label, lines: section.lines, lineHighlights: section.lineHighlights,
      slideNumber: sectionIndex + 1, caption: "", lookId: section.lookId, note: section.note,
    }));
  }, [state.mode, passage, vnum, vlabel, state.trans, state.book, state.chapter, state.bibleHighlights, song, bibleLanguage]);

  // Effective slide count for any song, override included — needed to land on
  // the *last* slide of the previous song when stepping backwards over a set
  // boundary.
  const sectionCountOf = useCallback((songId: string) => {
    const override = state.songOverrides[songId];
    if (override) return override.length;
    return allSongs.find((candidate) => candidate.id === songId)?.sections.length ?? 0;
  }, [state.songOverrides, allSongs]);

  // Stepping one slide in either direction.
  //
  // Which items a step is allowed to cross out of is deliberately narrow:
  //   - Bible: across chapter and book boundaries, in both directions.
  //   - Lineups: into the neighbouring song of the running set.
  //   - Songs tab: never. A song browsed from the library is self-contained;
  //     advancing off the end of it must not pull an unrelated song onto the
  //     audience screen, even when that song also happens to be in the set.
  //
  // Where no crossing applies, the step lands on the blank overflow position
  // (PAST_START_INDEX / slideCount) rather than being refused — that empty state
  // is what tells the operator they've reached the end. Only a step from *there*
  // is a no-op, which is also the only point Next/Previous disable.
  const go = useCallback((direction: number) => {
    if (direction === 0) return;
    setState((previousState) => {
      const clearedFlags = { black: false, blank: false };
      const count = previousState.mode === "bible" ? passage.length : song.sections.length;
      const currentIndex = Math.min(Math.max(previousState.idx, PAST_START_INDEX), count);
      const step = resolveDeckStep(currentIndex, count, direction);

      if (step.kind === "hold") return previousState;
      if (step.kind === "index") return { ...previousState, idx: step.idx, ...clearedFlags };

      if (previousState.mode === "bible") {
        const position = direction > 0
          ? resolveNextVerse(bibleBooks, previousState.book, previousState.chapter, currentIndex)
          : resolvePreviousVerse(bibleBooks, previousState.book, previousState.chapter, currentIndex);
        if (position) {
          return { ...previousState, book: position.book, chapter: position.chapter, idx: position.verseIndex, ...clearedFlags };
        }
      } else if (previousState.mode === "lineups") {
        const neighbour = resolveAdjacentSetSong(previousState.setIds, previousState.songId, direction, sectionCountOf);
        if (neighbour) {
          return { ...previousState, songId: neighbour.songId, idx: neighbour.idx, ...clearedFlags };
        }
      }

      // Nothing to cross into: land on the blank end-of-the-line position.
      return { ...previousState, idx: step.overflowIndex, ...clearedFlags };
    });
  }, [passage.length, song.sections.length, bibleBooks, sectionCountOf]);

  const lyricFamily = (LYRIC_FONTS.find((font) => font.id === (state.font || props.lyricFont)) ?? LYRIC_FONTS[0]).className;

  const canvas = "absolute inset-0 flex flex-col items-center justify-center p-[6%_8%] text-center z-[1]";

  const bible = state.mode === "bible";

  // The deck has two extra positions the operator can deliberately step onto:
  // one blank slide *before* the first and one *after* the last. They are real
  // navigable positions, not refusals — stepping past the final verse blanks the
  // output, flips Next up to "End", and only then disables Next. That's the
  // signal that there is nothing further; a button that greys out while a verse
  // is still on screen would be reporting the end one step early.
  //
  // Only the true ends get an overflow slot. Within Scripture (or a lineup) the
  // step crosses into the next chapter/book/song instead — see go().
  const slideCount = slides.length;
  const idx = Math.min(Math.max(state.idx, PAST_START_INDEX), slideCount);
  const atStartOverflow = idx <= PAST_START_INDEX;
  const atEndOverflow = idx >= slideCount;
  const cur = slides[idx] ?? BLANK_SLIDE;

  // When Bible Compare is active, the Live output (and the real audience
  // screen, via OutputState.compare below) shows both translations' wording
  // stacked instead of the normal single-slide text — each line prefixed with
  // the same superscript verse number, and both translation codes folded into
  // one reference caption ("PSA 23:2 KJV - NIV") rather than a label per line,
  // so the two wordings read as a single passage.
  const liveCompare = useMemo(() => {
    // compareTranslationBCode, not state.compareMode — see its definition for
    // why the request has to be re-validated before anything reaches the screen.
    if (!bible || !compareTranslationBCode || !compareVerseTextB) return null;
    const primaryText = cur.lines[0] ?? "";
    if (!primaryText) return null;
    const verseNumber = String(vlabel(idx));
    return {
      verseNumber,
      lines: [primaryText, compareVerseTextB] as [string, string],
      caption: bookAbbreviation(state.book, bibleLanguage) + " " + state.chapter + ":" + verseNumber + " "
        + shortTransLabel(state.trans) + " - " + shortTransLabel(compareTranslationBCode),
    };
  }, [bible, compareTranslationBCode, compareVerseTextB, cur.lines, state.trans, state.book, state.chapter, vlabel, idx, bibleLanguage]);

  // Records chapter-level Bible reading history (not per-verse — vnum(idx)
  // stepping within the same chapter doesn't need a new entry each time,
  // since recordBibleHistory dedupes by key and this key is chapter-scoped).
  // This is a genuine effect (logging a navigation event when the viewed
  // chapter changes), not state derived from render — eslint's stricter
  // set-state-in-effect check doesn't distinguish the two.
  useEffect(() => {
    if (!bible || !translation) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recordBibleHistory(state.trans + "|" + state.book + "|" + state.chapter, ref + "  ·  " + shortTransLabel(state.trans));
    // recordBibleHistory/ref intentionally omitted: recordBibleHistory is a
    // stable useCallback ([patch] only) and ref is purely derived from
    // state.book/state.chapter, both already listed below — including them
    // would just be redundant, not fix any staleness.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bible, translation, state.trans, state.book, state.chapter]);

  // Builds the Slide shape for a verse at some other book/chapter position, so
  // the Previous/Next up boxes can preview across a boundary go() will actually
  // cross. Returns undefined when the position doesn't resolve to real verse
  // text, which is also how "there is nothing that way" is signalled.
  const bibleSlideAt = useCallback((position: VersePosition | null): Slide | undefined => {
    if (!position) return undefined;
    const book = bibleBooks.find((entry) => entry.name === position.book);
    const chapter = book?.chapters.find((entry) => entry.number === position.chapter);
    const verse = chapter?.verses[position.verseIndex];
    if (!verse) return undefined;
    const label = formatVerseLabel(verse);
    const key = bibleHighlightKey(state.trans, position.book, position.chapter, verse.number);
    return {
      label: "v" + label, lines: [verse.text], lineHighlights: [state.bibleHighlights[key] ?? []],
      slideNumber: position.verseIndex + 1,
      caption: bookAbbreviation(position.book, bibleLanguage) + " " + position.chapter + ":" + label + " " + shortTransLabel(state.trans),
    };
  }, [bibleBooks, state.trans, state.bibleHighlights, bibleLanguage]);

  // Same for a slide belonging to a neighbouring song in the set.
  const setSongSlideAt = useCallback((neighbour: { songId: string; idx: number } | null): Slide | undefined => {
    if (!neighbour) return undefined;
    const baseSong = allSongs.find((candidate) => candidate.id === neighbour.songId);
    if (!baseSong) return undefined;
    const sections = state.songOverrides[neighbour.songId] ?? baseSong.sections;
    const section = sections[neighbour.idx];
    if (!section) return undefined;
    return {
      label: section.label, lines: section.lines, lineHighlights: section.lineHighlights,
      slideNumber: neighbour.idx + 1, caption: "", lookId: section.lookId, note: section.note,
    };
  }, [allSongs, state.songOverrides]);

  // Previous/Next up previews show whatever go() would actually land on — the
  // adjacent slide normally, otherwise a synthesized preview of the next verse
  // across a chapter/book boundary or of the neighbouring set song's first/last
  // slide. undefined exactly where go() refuses to move: the true ends of the
  // Bible, the ends of the set, and both ends of a standalone song.
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

  // A transport button is live right up to and including the last real slide —
  // stepping off the end onto the blank overflow position is a legitimate move,
  // and the empty output plus the "End" label are what report the end. Only once
  // the operator is already *on* that blank position does the button disable,
  // because from there the step genuinely has nowhere to go.
  const canGoNext = !atEndOverflow;
  const canGoPrev = !atStartOverflow;

  // Badges on the Previous/Next preview cards, shown only where that direction
  // has nothing left — naming what ran out rather than just going blank. In
  // lineups mode the set is what a song flows through, so the end of the last
  // song is the end of the set; in the Songs tab a song is self-contained.
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

  // Highlighting a slice of the currently-live slide — driven by selecting
  // text directly on the Live output box (PreviewPanel), not a separate editor.
  // The selection may span multiple lines (a song section can have several
  // lines; a Bible slide is always exactly one). Song lines are persisted
  // as a lyric override (same path as manual lyric edits); Bible verses
  // aren't part of any Song, so they get their own reference-keyed store.
  // (LiveHighlightSelection itself now lives in data.ts — it's part of
  // LumenState, which is declared above this point in the file.)

  // Ranges for each line touched by the selection: the first line runs from
  // its startOffset to its own end, the last line runs from 0 to its
  // endOffset, and anything in between is highlighted/cleared in full.
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

  // onClasses is a complete literal Tailwind class string (border/background/text color for the "on" state) —
  // passed in by the caller rather than built from a runtime color value, since Tailwind can only
  // generate CSS for class names that appear as literal text in source, not ones assembled at runtime.
  const toolBtn = (on: boolean, onClasses: string) => cx(
    "h-[44px] px-[18px] rounded-[11px] text-[13.5px] font-semibold cursor-pointer border",
    on ? onClasses : "border-border bg-panel2 text-muted"
  );

  // Was recomputed on every patch() anywhere in the app, not just when its
  // own inputs changed — cheap today at built-in-song-list scale, but
  // customSongs is user-uploaded and uncapped, so this scales with real
  // usage on low-end devices.
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

  const longestLineLength = cur.lines.reduce((maxLength, line) => Math.max(maxLength, line.length), 0);
  const fit = longestLineLength > 110 ? 0.62 : longestLineLength > 70 ? 0.78 : 1;
  const bigLine: CSSProperties = {
    fontSize: 26 * state.scale * fit + "px", lineHeight: 1.34, fontWeight: state.lyricStyle.bold ? 700 : 600,
    fontStyle: state.lyricStyle.italic ? "italic" : "normal",
    letterSpacing: "-0.015em", color: state.lyricStyle.color || "#fff",
    WebkitTextStroke: state.lyricStyle.outlineWidth
      ? state.lyricStyle.outlineWidth + "px " + (state.lyricStyle.outlineColor || "rgba(0,0,0,.55)")
      : undefined,
    textShadow: "0 2px 24px rgba(0,0,0,.5)",
  };

  // ---- Second-monitor "audience output" (Electron only; a no-op in the
  // plain browser build, since getElectronDisplay() returns null there) ----

  const [outputStatus, setOutputStatus] = useState<OutputStatus>(DEFAULT_OUTPUT_STATUS);

  useEffect(() => {
    const electronDisplay = getElectronDisplay();
    if (!electronDisplay) return;
    electronDisplay.getStatus().then(setOutputStatus).catch(() => {});
    return electronDisplay.onStatusChanged(setOutputStatus);
  }, []);

  // Opens/closes (or re-targets) the actual second-monitor window whenever
  // the user's choice changes — the main process resolves "auto" to the
  // first non-primary display and re-resolves it live if displays change.
  useEffect(() => {
    const electronDisplay = getElectronDisplay();
    if (!electronDisplay) return;
    if (state.outputEnabled) {
      electronDisplay.openOutput(state.outputDisplayId).then((result) => {
        if (!result.ok) console.error("Failed to open second-monitor output window:", result.reason);
        setOutputStatusFromOpenResult();
      }).catch((error) => {
        console.error("output:open IPC call failed:", error);
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
  }, [state.outputEnabled, state.outputDisplayId]);

  // Present/F5/Fullscreen: if a second monitor is available, route the
  // audience view there (same mechanism as the Settings output toggle) and
  // leave the operator's own window alone; only fall back to taking over the
  // operator's own screen (the same-window overlay below, real OS fullscreen
  // and all) when there's nowhere else to send it.
  const secondaryDisplayAvailable = useMemo(
    () => outputStatus.displays.some((display) => !display.isPrimary),
    [outputStatus.displays]
  );

  // The real aspect ratio backgrounds actually get cropped to on the
  // audience screen — prefer whichever display is currently doing the
  // presenting, otherwise whichever one would if Present were pressed, so
  // every preview (Live output, Previous/Next up, Slides strip) crops
  // uploads the same way the real output will. Falls back to 16:9 (the old
  // hardcoded assumption) in the browser build or when no second display is
  // detected, since there's nothing more specific to go on there.
  const outputAspectRatio = useMemo(() => {
    const targetDisplay = outputStatus.display ?? outputStatus.displays.find((display) => !display.isPrimary) ?? null;
    return targetDisplay && targetDisplay.height > 0 ? targetDisplay.width / targetDisplay.height : 16 / 9;
  }, [outputStatus.display, outputStatus.displays]);

  const startPresenting = useCallback(() => {
    if (secondaryDisplayAvailable) {
      patch((previousState) => (previousState.outputEnabled ? {} : { outputEnabled: true }));
      return;
    }
    patch({ presenting: true });
  }, [patch, secondaryDisplayAvailable]);

  // Mirrors state.presenting into the operator BrowserWindow's real OS
  // fullscreen state (a no-op in the plain browser build). Only reached in
  // the single-screen fallback above — when a second display is doing the
  // presenting instead, state.presenting is never set, so the operator's own
  // window stays a normal window with full desktop access.
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
        patch({
          presenting: false, settingsOpen: false, setPanelOpen: false, lyricsEditorOpen: false, uploadOpen: false,
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
      // B = Blank, Shift+B = Black — Shift checked first since "B" alone
      // (without Shift) is the lowercase pressedKey value either way; only
      // shiftKey distinguishes them. (No binding intentionally implements
      // the hotkeys reference's "Go Live lock" — no backing feature exists.)
      else if (keyboardEvent.shiftKey && (pressedKey === "b" || pressedKey === "B")) {
        patch((previousState) => ({ black: !previousState.black, blank: false }));
      } else if (pressedKey === "b" || pressedKey === "B") {
        patch((previousState) => ({ blank: !previousState.blank, black: false }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, patch, startPresenting, undo, redo]);

  // Pushes the current live slide to the output window on every change —
  // this is the one place that assembles exactly what OutputWindowApp needs,
  // so the audience screen never has to run useLumen or touch the DB itself.
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
      transitionType: state.transitionType, transitionSpeedPct: state.transitionSpeedPct, performanceMode: state.performanceMode,
      compare: liveCompare ?? undefined,
    };
    electronDisplay.sendState(payload);
  }, [
    outputStatus.active, cur, look, allLooks, state.black, hidden, state.lyricStyle, lyricFamily, state.scale, fit,
    state.mode, bible, state.book, state.chapter, song.id, idx, state.transitionType, state.transitionSpeedPct, state.performanceMode,
    liveCompare,
  ]);

  // ---- Update-notification bell (Electron only; a no-op in the plain
  // browser build, since getElectronUpdater() returns null there) ----

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

  // Mirrors the Settings toggle into the main process, which is the one
  // that actually decides whether to call autoUpdater.checkForUpdatesAndNotify
  // — main.js also reads this same pref straight from its own SQLite db at
  // startup (before this effect can ever fire), so a launch respects
  // whatever was last saved even before the renderer finishes loading.
  useEffect(() => {
    getElectronUpdater()?.setAutoUpdateEnabled(state.autoUpdateEnabled).catch(() => {});
  }, [state.autoUpdateEnabled]);

  // ---- Compatibility mode (disables GPU acceleration; Electron only) ----
  // Kept as its own tiny bit of state rather than folded into the generic
  // `prefs` mechanism above: main.js has to decide whether to call
  // app.disableHardwareAcceleration() before app.ready, which is before the
  // SQLite db (and therefore the prefs table) even opens — so it's backed by
  // a plain marker file instead (see main.js's gpuCompatFlagPath) and only
  // takes effect after a restart.

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
    bible, list, chipBase, tabStyle, pill, toolBtn, canvas, lyricFamily, fit, bigLine,
    setSongs, inSet, toggleSetSong, saveLyrics, applyLiveHighlight, removeLiveHighlight, addSong, deleteSong, allSongs, toggleFavorite,
    createLineup, updateLineup, deleteLineup, activateLineup, reorderLineupSongs,
    addSongToLineup, removeSongFromLineup, renameLineup,
    adjustLayoutSize, toggleLayoutPanel, resetLayout, addBackground, deleteBackground,
    bibleBooks, currentBook, currentTransMeta, shortTransLabel, outputStatus, outputAspectRatio,
    importBibleTranslation, removeBibleTranslation, openBibleDownloadsPage, bibleImportError,
    updateStatus, installUpdate, startPresenting, prefsLoaded,
    gpuAccelerationDisabled, setGpuAccelerationDisabled,
    undo, redo, canUndo, canRedo,
    setSongMetaOverride, duplicateSongAsReprise, recordSongUsage,
    askConfirm, closeConfirm,
    toggleBibleFavorite, recordBibleHistory,
    upsertBibleCollection, createBibleCollection, deleteBibleCollection, addVerseToCollection, removeVerseFromCollection,
    duplicateSlide, mergeSlideWithNext, splitSlide, reorderSlides, setSlideNote, setSlideLook, applySlideLookToLabel,
    liveCompare, boundaryNextLabel, boundaryPrevLabel, canGoNext, canGoPrev,
    atStartOverflow, atEndOverflow, slideCount, compareTranslationBCode,
  };
}

export type UseLumen = ReturnType<typeof useLumen>;
