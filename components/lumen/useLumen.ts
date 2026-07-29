"use client";

import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getRepository } from "@/lib/repository";
import { cx } from "./cx";
import {
  addHighlightRange, bibleHighlightKey, DEFAULT_LAYOUT_SIZES, DEFAULT_LAYOUT_VISIBILITY, DEFAULT_LYRIC_FONT,
  DEFAULT_LYRIC_STYLE, DEFAULT_TRANSLATION, LAYOUT_SIZE_LIMITS, LOADING_PASSAGE, LOOKS, LYRIC_FONTS, MISSING_PASSAGE,
  SONGS, subtractHighlightRange,
  type BibleHighlights, type BibleMeta, type BibleTranslation, type CustomBackground, type HighlightRange,
  type LayoutPanelId, type LayoutSizes, type LayoutVisibility, type Lineup, type LyricFontId, type LyricStyle,
  type Section, type Song,
} from "./data";
import { getElectronDisplay, type OutputState, type OutputStatus } from "./electronDisplay";
import type { ParsedSong } from "./songImport";

const DEFAULT_OUTPUT_STATUS: OutputStatus = { active: false, selectedDisplayId: "auto", display: null, displays: [] };

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
    // electron/main.js — both sides are required.
    video.crossOrigin = "anonymous";
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
      patch({
        customSongs: data.customSongs,
        lineups: data.lineups,
        customBackgrounds: data.customBackgrounds,
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
          }).catch(() => {});
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

  const [bibleManifest, setBibleManifest] = useState<BibleMeta[]>([]);
  const [bibleCache, setBibleCache] = useState<Record<string, BibleTranslation>>({});
  const bibleCacheRef = useRef(bibleCache);
  bibleCacheRef.current = bibleCache;

  useEffect(() => {
    let cancelled = false;
    fetch("/bible/json/manifest.json")
      .then((response) => response.json())
      .then((data: BibleMeta[]) => { if (!cancelled) setBibleManifest(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (bibleCacheRef.current[state.trans]) return;
    let cancelled = false;
    fetch("/bible/json/" + state.trans + ".json")
      .then((response) => response.json())
      .then((data: BibleTranslation) => {
        if (!cancelled) setBibleCache((previousCache) => ({ ...previousCache, [state.trans]: data }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [state.trans]);

  const translation = bibleCache[state.trans];
  const bibleBooks = useMemo(() => translation?.books ?? [], [translation]);
  const currentTransMeta = useMemo(
    () => bibleManifest.find((meta) => meta.code === state.trans),
    [bibleManifest, state.trans]
  );

  const ref = state.book + " " + state.chapter;
  const currentBook = useMemo(() => bibleBooks.find((book) => book.name === state.book), [bibleBooks, state.book]);
  const currentChapter = useMemo(
    () => currentBook?.chapters.find((chapter) => chapter.number === state.chapter),
    [currentBook, state.chapter]
  );
  const passage = useMemo(() => {
    if (!translation) return LOADING_PASSAGE;
    return currentChapter ? currentChapter.verses.map((verse) => verse.text) : MISSING_PASSAGE;
  }, [translation, currentChapter]);
  const vnum = useCallback((verseIndex: number) => currentChapter?.verses[verseIndex]?.number ?? verseIndex + 1, [currentChapter]);

  const allSongs = useMemo(() => [...SONGS, ...state.customSongs], [state.customSongs]);

  const song = useMemo(() => {
    const baseSong = allSongs.find((candidate) => candidate.id === state.songId) || allSongs[0];
    const override = state.songOverrides[baseSong.id];
    return override ? { ...baseSong, sections: override } : baseSong;
  }, [state.songId, state.songOverrides, allSongs]);
  const allLooks = useMemo(() => [...LOOKS, ...state.customBackgrounds], [state.customBackgrounds]);
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
      lineups: [...previousState.lineups, lineup],
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
        customBackgrounds: [...previousState.customBackgrounds, { id: backgroundId, name: file.name, mediaType, url: objectUrl }],
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
    const posterUrl = await generateVideoPoster(objectUrl).catch(() => undefined);
    patch((previousState) => ({
      customBackgrounds: [...previousState.customBackgrounds, { id: backgroundId, name: file.name, mediaType, url: objectUrl, posterUrl }],
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

  const saveLyrics = useCallback((sections: Section[]) => {
    getRepository().setSongOverride(song.id, sections);
    patch((previousState) => ({ songOverrides: { ...previousState.songOverrides, [song.id]: sections } }));
  }, [patch, song.id]);

  const addSong = useCallback((parsed: ParsedSong) => {
    const newSongId = "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const newSong: Song = { ...parsed, id: newSongId, fav: false, when: "Just added" };
    getRepository().upsertSong(newSong);
    patch((previousState) => ({
      customSongs: [...previousState.customSongs, newSong],
      songId: newSongId, idx: 0, mode: "songs", uploadOpen: false,
    }));
  }, [patch]);

  const toggleFavorite = useCallback((songId: string) => {
    patch((previousState) => ({ favs: { ...previousState.favs, [songId]: !previousState.favs[songId] } }));
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

  useEffect(() => {
    const onKey = (keyboardEvent: KeyboardEvent) => {
      const pressedKey = keyboardEvent.key;
      if (pressedKey === "F5") { keyboardEvent.preventDefault(); patch({ presenting: true }); return; }
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
  }, [go, patch]);

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
    if (state.outputEnabled) electronDisplay.openOutput(state.outputDisplayId).then(setOutputStatusFromOpenResult).catch(() => {});
    else electronDisplay.closeOutput().catch(() => {});

    function setOutputStatusFromOpenResult() {
      electronDisplay!.getStatus().then(setOutputStatus).catch(() => {});
    }
  }, [state.outputEnabled, state.outputDisplayId]);

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

  return {
    state, patch, theme, accent, ref, passage, vnum, song, look, allLooks, slides, go, idx, cur, nxt, prv, hidden,
    bible, list, chipBase, tabStyle, pill, toolBtn, canvas, lyricFamily, fit, bigLine,
    setSongs, inSet, toggleSetSong, saveLyrics, applyLiveHighlight, removeLiveHighlight, addSong, allSongs, toggleFavorite,
    createLineup, updateLineup, deleteLineup, activateLineup, reorderLineupSongs,
    adjustLayoutSize, toggleLayoutPanel, resetLayout, addBackground, deleteBackground,
    bibleManifest, bibleBooks, currentBook, currentTransMeta, shortTransLabel, outputStatus,
  };
}

export type UseLumen = ReturnType<typeof useLumen>;
