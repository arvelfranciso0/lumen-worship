"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  bibleHighlightKey, bookAbbreviation, LOOKS, LYRIC_FONTS, SONGS, type LyricFontId,
} from "./data";
import {
  formatVerseLabel, PAST_START_INDEX, resolveAdjacentSetSong, resolveDeckStep, resolveNextVerse,
  resolvePreviousVerse, type VersePosition,
} from "./song/navigation";
import { getElectronDisplay, type OutputState } from "./electron-bridges/electronDisplay";
import { fitForLines } from "./presentation/stage";
import { chipBase, pill, tabStyle, toolBtn } from "./styles/lumenStyles";
import { BLANK_SLIDE, HISTORY_TRACKED_KEYS, INITIAL_STATE, UNDO_STACK_CAP, type ConfirmDialogState, type Slide } from "./lumenState";
import { useUndoRedoHistory } from "./hooks/useUndoRedoHistory";
import { usePersistedData } from "./hooks/usePersistedData";
import { useBibleCache } from "./hooks/useBibleCache";
import { useBiblePassage } from "./hooks/useBiblePassage";
import { useBibleImport } from "./hooks/useBibleImport";
import { useLayoutPanels } from "./hooks/useLayoutPanels";
import { useBackgroundLibrary } from "./hooks/useBackgroundLibrary";
import { useLineupActions } from "./hooks/useLineupActions";
import { useSongActions } from "./hooks/useSongActions";
import { useSlideEditing } from "./hooks/useSlideEditing";
import { useLiveHighlighting } from "./hooks/useLiveHighlighting";
import { useOutputWindow } from "./hooks/useOutputWindow";
import { usePresentationControl } from "./hooks/usePresentationControl";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useAppUpdater } from "./hooks/useAppUpdater";
import { useGpuCompat } from "./hooks/useGpuCompat";

export type { ConfirmDialogState } from "./lumenState";

const shortTransLabel = (code: string) => code.replace(/^(English|Cebuano)/, "") || code;

export type LumenProps = {
  accent?: string;
  theme?: "dark" | "light";
  lyricFont?: LyricFontId;
};

export function useLumen(props: LumenProps = {}) {
  const [state, setState] = useState(INITIAL_STATE);

  const patch = useCallback((next: Partial<typeof state> | ((previousState: typeof state) => Partial<typeof state>)) => {
    setState((previousState) => ({ ...previousState, ...(typeof next === "function" ? next(previousState) : next) }));
  }, []);

  // ---- Undo/redo (content edits only — see HISTORY_TRACKED_KEYS) ----
  const { undo, redo, canUndo, canRedo, markAsHydration } = useUndoRedoHistory(state, patch, HISTORY_TRACKED_KEYS, UNDO_STACK_CAP);

  const theme = state.theme || props.theme || "dark";
  const accent = props.accent || "#8b5cf6";

  const { prefsLoaded } = usePersistedData(state, patch, markAsHydration);

  const { bibleCache, bibleLoadFailed, cacheTranslation, clearLoadFailed, evictTranslation, refreshBibleCache } = useBibleCache(state.trans);

  const {
    bibleBooks, bibleLanguage, currentTransMeta, currentBook, passage, vnum, vlabel, compareTranslationBCode, compareTextAt,
  } = useBiblePassage(state, patch, bibleCache, bibleLoadFailed);

  const ref = state.book + " " + state.chapter;

  const { bibleImportError, importBibleTranslation, removeBibleTranslation, openBibleDownloadsPage } = useBibleImport(
    patch, state.trans, { cacheTranslation, clearLoadFailed, evictTranslation, refreshBibleCache }
  );

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
    () => state.setIds.map((songId) => allSongs.find((candidate) => candidate.id === songId)).filter((maybeSong): maybeSong is typeof allSongs[number] => !!maybeSong),
    [state.setIds, allSongs]
  );

  const { createLineup, updateLineup, deleteLineup, activateLineup, reorderLineupSongs, addSongToLineup, removeSongFromLineup, renameLineup } =
    useLineupActions(patch);

  const { adjustLayoutSize, toggleLayoutPanel, resetLayout } = useLayoutPanels(patch);

  const { addBackground, deleteBackground } = useBackgroundLibrary(patch);

  const { addSong, toggleFavorite, deleteSong, setSongMetaOverride, duplicateSongAsReprise } = useSongActions(patch, allSongs, state.songOverrides);

  const { saveLyrics, duplicateSlide, mergeSlideWithNext, splitSlide, reorderSlides, setSlideLook, applySlideLookToLabel, applyLookToAllSlides } =
    useSlideEditing(song, patch, lineupScopeId);

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

  const { applyLiveHighlight, removeLiveHighlight } = useLiveHighlighting(bible, state, idx, vnum, song, patch, saveLyrics);

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

  const { outputStatus, secondaryDisplayAvailable, outputAspectRatio } = useOutputWindow(state, patch);

  const { isPresenting, startPresenting, stopPresenting } = usePresentationControl(state, patch, secondaryDisplayAvailable);

  useKeyboardShortcuts({ go, patch, startPresenting, stopPresenting, undo, redo });

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

  const { updateStatus, installUpdate } = useAppUpdater(state.autoUpdateEnabled);

  // ---- Compatibility mode (disables GPU acceleration; Electron only); takes effect after restart ----

  const { gpuAccelerationDisabled, setGpuAccelerationDisabled } = useGpuCompat();

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
