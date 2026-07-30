"use client";

import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getRepository } from "@/lib/repository";
import { cx } from "./cx";
import {
  addHighlightRange, BIBLE_DOWNLOADS_URL, bibleHighlightKey, DEFAULT_LAYOUT_SIZES, DEFAULT_LAYOUT_VISIBILITY,
  DEFAULT_LYRIC_FONT, DEFAULT_LYRIC_STYLE, DEFAULT_TRANSLATION, LAYOUT_SIZE_LIMITS, LOADING_PASSAGE, LOOKS,
  LYRIC_FONTS, MISSING_PASSAGE, NOT_DOWNLOADED_PASSAGE, SONGS, subtractHighlightRange,
  type BibleHighlights, type BibleTranslation, type CustomBackground,
  type DownloadedBibleTranslation, type HighlightRange,
  type LayoutPanelId, type LayoutSizes, type LayoutVisibility, type Lineup, type LyricFontId, type LyricStyle,
  type Section, type Song,
} from "./data";
import { getElectronDisplay, type OutputState, type OutputStatus } from "./electronDisplay";
import { getElectronShell } from "./electronShell";
import { getElectronUpdater, type UpdateStatus } from "./electronUpdater";
import type { ParsedSong } from "./songImport";

const DEFAULT_OUTPUT_STATUS: OutputStatus = { active: false, selectedDisplayId: "auto", display: null, displays: [] };
const DEFAULT_UPDATE_STATUS: UpdateStatus = { status: "idle" };

const shortTransLabel = (code: string) => code.replace(/^(English|Cebuano)/, "") || code;

const MAX_BACKGROUND_IMAGE_DIMENSION = 1920;

// Captures a single frame from a video as a data URL, so preview spots (the
// slides strip, the Toolbar/Settings pickers, the "Next up" box) can show a
// still instead of independently decoding the full video.
function generateVideoPoster(videoUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
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
    video.addEventListener("loadeddata", () => {
      const posterCanvas = document.createElement("canvas");
      posterCanvas.width = video.videoWidth;
      posterCanvas.height = video.videoHeight;
      const context = posterCanvas.getContext("2d");
      if (!context) { reject(new Error("2d context unavailable")); return; }
      context.drawImage(video, 0, 0);
      resolve(posterCanvas.toDataURL("image/jpeg", 0.8));
    }, { once: true });
    video.addEventListener("error", () => reject(new Error("Failed to load video for poster generation")), { once: true });
  });
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

export type LumenProps = {
  accent?: string;
  theme?: "dark" | "light";
  lyricFont?: LyricFontId;
};

type Mode = "songs" | "bible" | "lineups";

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
};

type Slide = { label: string; lines: string[]; lineHighlights?: HighlightRange[][]; slideNumber: number; caption: string };

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
};

export function useLumen(props: LumenProps = {}) {
  const [state, setState] = useState<LumenState>(INITIAL_STATE);

  const patch = useCallback((next: Partial<LumenState> | ((previousState: LumenState) => Partial<LumenState>)) => {
    setState((previousState) => ({ ...previousState, ...(typeof next === "function" ? next(previousState) : next) }));
  }, []);

  const theme = state.theme || props.theme || "dark";
  const accent = props.accent || "#8b5cf6";

  useEffect(() => {
    let cancelled = false;
    getRepository().loadAll().then((data) => {
      if (cancelled) return;
      // The repository returns these in insertion order (oldest first) —
      // reversed here so the most recently added/downloaded item is always
      // first, matching how new items get prepended in-session below.
      patch({
        customSongs: [...data.customSongs].reverse(),
        lineups: [...data.lineups].reverse(),
        customBackgrounds: [...data.customBackgrounds].reverse(),
        downloadedTranslations: [...data.downloadedBibleTranslations].reverse(),
        songOverrides: data.songOverrides,
        ...data.prefs,
      });
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
            // Left as a live <video> everywhere until a reload retries this —
            // LookBackground falls back to real playback when posterUrl is
            // missing, which is exactly the simultaneous-decode lag this
            // poster mechanism exists to avoid. Logged so a silent failure
            // here doesn't read as "just laggy" with no further clue.
            console.error("Failed to generate poster for background " + background.id + ":", error);
          });
        });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [patch]);

  useEffect(() => {
    const persistTimeout = setTimeout(() => {
      getRepository().setPrefs({
        favs: state.favs, look: state.look, scale: state.scale, theme: state.theme,
        font: state.font, chords: state.chords, setIds: state.setIds, setName: state.setName,
        layoutSizes: state.layoutSizes, layoutVisibility: state.layoutVisibility, lyricStyle: state.lyricStyle,
        bibleHighlights: state.bibleHighlights, outputEnabled: state.outputEnabled, outputDisplayId: state.outputDisplayId,
      });
    }, 400);
    return () => clearTimeout(persistTimeout);
  }, [
    state.favs, state.look, state.scale, state.theme, state.font, state.chords, state.setIds, state.setName,
    state.layoutSizes, state.layoutVisibility, state.lyricStyle, state.bibleHighlights,
    state.outputEnabled, state.outputDisplayId,
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
        setBibleCache((previousCache) => ({ ...previousCache, [state.trans]: data }));
        setBibleLoadFailed((previous) => (previous[state.trans] ? { ...previous, [state.trans]: false } : previous));
        return;
      }
      setBibleLoadFailed((previous) => ({ ...previous, [state.trans]: true }));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [state.trans, bibleRefreshTick]);

  const translation = bibleCache[state.trans];
  const bibleBooks = useMemo(() => translation?.books ?? [], [translation]);
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
  const vnum = useCallback((verseIndex: number) => currentChapter?.verses[verseIndex]?.number ?? verseIndex + 1, [currentChapter]);

  const allSongs = useMemo(() => [...state.customSongs, ...SONGS], [state.customSongs]);

  const song = useMemo(() => {
    const baseSong = allSongs.find((candidate) => candidate.id === state.songId) || allSongs[0];
    const override = state.songOverrides[baseSong.id];
    return override ? { ...baseSong, sections: override } : baseSong;
  }, [state.songId, state.songOverrides, allSongs]);
  const allLooks = useMemo(() => [...state.customBackgrounds, ...LOOKS], [state.customBackgrounds]);
  const look = useMemo(() => allLooks.find((lookEntry) => lookEntry.id === state.look) || LOOKS[0], [allLooks, state.look]);

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

  const reorderLineupSongs = useCallback((lineupId: string, fromIndex: number, toIndex: number) => {
    patch((previousState) => {
      const targetLineup = previousState.lineups.find((lineup) => lineup.id === lineupId);
      if (!targetLineup || fromIndex === toIndex) return {};
      const reorderedSongIds = targetLineup.songIds.slice();
      const [movedSongId] = reorderedSongIds.splice(fromIndex, 1);
      reorderedSongIds.splice(toIndex, 0, movedSongId);
      const updatedLineup = { ...targetLineup, songIds: reorderedSongIds };
      getRepository().upsertLineup(updatedLineup);
      return {
        lineups: previousState.lineups.map((lineup) => (lineup.id === lineupId ? updatedLineup : lineup)),
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
    // spot except the actual live output can skip decoding it.
    const objectUrl = URL.createObjectURL(file);
    const fileData = await file.arrayBuffer();
    getRepository().addBackground({ id: backgroundId, name: file.name, mediaType, mimeType: file.type, data: fileData });
    const posterUrl = await generateVideoPoster(objectUrl).catch((error) => {
      console.error("Failed to generate poster for background " + backgroundId + ":", error);
      return undefined;
    });
    patch((previousState) => ({
      customBackgrounds: [{ id: backgroundId, name: file.name, mediaType, url: objectUrl, posterUrl }, ...previousState.customBackgrounds],
      look: backgroundId,
    }));
  }, [patch]);

  const deleteBackground = useCallback((backgroundId: string) => {
    getRepository().deleteBackground(backgroundId);
    patch((previousState) => ({
      customBackgrounds: previousState.customBackgrounds.filter((background) => background.id !== backgroundId),
      look: previousState.look === backgroundId ? LOOKS[0].id : previousState.look,
    }));
  }, [patch]);

  // Imports a translation JSON file the user downloaded from the Bible
  // translations page (BIBLE_DOWNLOADS_URL) — mirrors addBackground's
  // file-upload pattern, but the source is a manual download rather than
  // in-app networking, since this app bundles no Bible data at all.
  const [bibleImportError, setBibleImportError] = useState<string | null>(null);

  const importBibleTranslation = useCallback(async (file: File) => {
    setBibleImportError(null);
    const text = await file.text();
    let parsed: BibleTranslation;
    try {
      parsed = JSON.parse(text);
    } catch {
      setBibleImportError(file.name + " isn't valid JSON.");
      return;
    }
    if (!parsed?.meta?.code || !parsed?.meta?.name || !Array.isArray(parsed?.books)) {
      setBibleImportError(file.name + " doesn't look like a Bible translation file.");
      return;
    }
    const { code, name } = parsed.meta;
    const language = parsed.meta.language || "Unknown";
    const license = parsed.meta.license || "";
    const link = parsed.meta.link ?? null;
    const data = await file.arrayBuffer();
    getRepository().addBibleTranslation({ code, language, name, license, link, data });
    patch((previousState) => ({
      downloadedTranslations: [
        { code, language, name, license, link, downloadedAt: Date.now(), sizeBytes: data.byteLength },
        ...previousState.downloadedTranslations.filter((entry) => entry.code !== code),
      ],
    }));
    setBibleCache((previousCache) => ({ ...previousCache, [code]: parsed }));
    setBibleLoadFailed((previous) => (previous[code] ? { ...previous, [code]: false } : previous));
  }, [patch]);

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

  const slides = useMemo<Slide[]>(() => {
    if (state.mode === "bible") {
      return passage.map((verseText, verseIndex) => {
        const key = bibleHighlightKey(state.trans, state.book, state.chapter, vnum(verseIndex));
        return {
          label: "v" + vnum(verseIndex), lines: [verseText], lineHighlights: [state.bibleHighlights[key] ?? []],
          slideNumber: verseIndex + 1, caption: ref + ":" + vnum(verseIndex) + "  ·  " + shortTransLabel(state.trans),
        };
      });
    }
    return song.sections.map((section, sectionIndex) => ({
      label: section.label, lines: section.lines, lineHighlights: section.lineHighlights,
      slideNumber: sectionIndex + 1, caption: "",
    }));
  }, [state.mode, passage, vnum, ref, state.trans, state.book, state.chapter, state.bibleHighlights, song]);

  const go = useCallback((direction: number) => {
    setState((previousState) => {
      const maxIndex = (previousState.mode === "bible" ? passage.length : song.sections.length) - 1;
      return { ...previousState, idx: Math.min(maxIndex, Math.max(0, previousState.idx + direction)), black: false, blank: false };
    });
  }, [passage.length, song.sections.length]);

  const lyricFamily = (LYRIC_FONTS.find((font) => font.id === (state.font || props.lyricFont)) ?? LYRIC_FONTS[0]).className;

  const canvas = "absolute inset-0 flex flex-col items-center justify-center p-[6%_8%] text-center z-[1]";

  const idx = Math.min(state.idx, slides.length - 1);
  const cur = slides[idx];
  const nxt = slides[idx + 1];
  const prv = slides[idx - 1];
  const hidden = state.black || state.blank;
  const bible = state.mode === "bible";

  // Highlighting a slice of the currently-live slide — driven by selecting
  // text directly on the Live output box (MainPanel), not a separate editor.
  // The selection may span multiple lines (a song section can have several
  // lines; a Bible slide is always exactly one). Song lines are persisted
  // as a lyric override (same path as manual lyric edits); Bible verses
  // aren't part of any Song, so they get their own reference-keyed store.
  type LiveHighlightSelection = { startLineIndex: number; startOffset: number; endLineIndex: number; endOffset: number };

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

  let list = allSongs.filter((songEntry) => {
    const query = state.query.trim().toLowerCase();
    const matchesQuery = !query || (songEntry.title + " " + songEntry.artist + " " + songEntry.tags.join(" ")).toLowerCase().includes(query);
    const matchesChip = state.chip === "All" || (state.chip === "Favorites" ? !!state.favs[songEntry.id] : songEntry.cat === state.chip);
    return matchesQuery && matchesChip;
  });
  if (state.sort === "A–Z") list = list.slice().sort((songA, songB) => songA.title.localeCompare(songB.title));
  if (state.sort === "Key") list = list.slice().sort((songA, songB) => songA.key.localeCompare(songB.key));

  const longestLineLength = cur.lines.reduce((maxLength, line) => Math.max(maxLength, line.length), 0);
  const fit = longestLineLength > 110 ? 0.62 : longestLineLength > 70 ? 0.78 : 1;
  const bigLine: CSSProperties = {
    fontSize: 26 * state.scale * fit + "px", lineHeight: 1.34, fontWeight: state.lyricStyle.bold ? 700 : 600,
    fontStyle: state.lyricStyle.italic ? "italic" : "normal",
    letterSpacing: "-0.015em", color: state.lyricStyle.color || "#fff",
    WebkitTextStroke: state.lyricStyle.outline ? "1.5px rgba(0,0,0,.55)" : undefined,
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
      if (pressedKey === "F5") { keyboardEvent.preventDefault(); startPresenting(); return; }
      if (pressedKey === "Escape") {
        patch({ presenting: false, settingsOpen: false, setPanelOpen: false, lyricsEditorOpen: false, uploadOpen: false, lineupModalOpen: false, editingLineupId: null });
        return;
      }
      const target = keyboardEvent.target as HTMLElement | null;
      const isTyping = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isTyping) return;
      if (pressedKey === "ArrowRight" || pressedKey === " " || pressedKey === "PageDown") { keyboardEvent.preventDefault(); go(1); }
      else if (pressedKey === "ArrowLeft" || pressedKey === "PageUp") { keyboardEvent.preventDefault(); go(-1); }
      else if (pressedKey === "b" || pressedKey === "B") { patch((previousState) => ({ black: !previousState.black, blank: false })); }
      else if (pressedKey === "w" || pressedKey === "W") { patch((previousState) => ({ blank: !previousState.blank, black: false })); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, patch, startPresenting]);

  // Pushes the current live slide to the output window on every change —
  // this is the one place that assembles exactly what OutputWindowApp needs,
  // so the audience screen never has to run useLumen or touch the DB itself.
  useEffect(() => {
    const electronDisplay = getElectronDisplay();
    if (!electronDisplay || !outputStatus.active) return;
    const payload: OutputState = {
      lines: hidden ? [] : cur.lines,
      lineHighlights: cur.lineHighlights,
      look, black: state.black, hidden,
      lyricStyle: state.lyricStyle, fontClassName: lyricFamily,
      scale: state.scale, fit, caption: !hidden ? cur.caption : "",
    };
    electronDisplay.sendState(payload);
  }, [outputStatus.active, cur, look, state.black, hidden, state.lyricStyle, lyricFamily, state.scale, fit]);

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

  return {
    state, patch, theme, accent, ref, passage, vnum, song, look, allLooks, slides, go, idx, cur, nxt, prv, hidden,
    bible, list, chipBase, tabStyle, pill, toolBtn, canvas, lyricFamily, fit, bigLine,
    setSongs, inSet, toggleSetSong, saveLyrics, applyLiveHighlight, removeLiveHighlight, addSong, deleteSong, allSongs, toggleFavorite,
    createLineup, updateLineup, deleteLineup, activateLineup, reorderLineupSongs,
    adjustLayoutSize, toggleLayoutPanel, resetLayout, addBackground, deleteBackground,
    bibleBooks, currentBook, currentTransMeta, shortTransLabel, outputStatus,
    importBibleTranslation, removeBibleTranslation, openBibleDownloadsPage, bibleImportError,
    updateStatus, installUpdate, startPresenting,
  };
}

export type UseLumen = ReturnType<typeof useLumen>;
