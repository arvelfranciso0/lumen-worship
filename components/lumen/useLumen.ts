"use client";

import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_TRANSLATION, LOADING_PASSAGE, LOOKS, MISSING_PASSAGE, SONGS,
  type BibleMeta, type BibleTranslation, type Lineup, type Section, type Song,
} from "./data";
import type { ParsedSong } from "./songImport";

const shortTransLabel = (code: string) => code.replace(/^(English|Cebuano)/, "") || code;

export type LumenProps = {
  accent?: string;
  theme?: "dark" | "light";
  lyricFont?: "sans" | "serif";
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
  font: "sans" | "serif";
  chords: boolean;
  theme: "dark" | "light" | null;
  mode: Mode;
  book: string;
  chapter: number;
  trans: string;
  setIds: string[];
  setName: string;
  setPanelOpen: boolean;
  songOverrides: Record<string, Section[]>;
  lyricsEditorOpen: boolean;
  customSongs: Song[];
  uploadOpen: boolean;
  lineups: Lineup[];
  lineupModalOpen: boolean;
  editingLineupId: string | null;
};

type Slide = { label: string; lines: string[]; n: number; caption: string };

const INITIAL_STATE: LumenState = {
  query: "", chip: "All", sort: "Recent", songId: "s3", idx: 2,
  favs: { s1: true, s3: true, s6: true },
  look: "aurora", scale: 1, presenting: false, blank: false, black: false,
  settingsOpen: false, font: "sans", chords: false, theme: null,
  mode: "songs", book: "Psalms", chapter: 23, trans: DEFAULT_TRANSLATION,
  setIds: ["s1", "s3", "s4", "s6"], setName: "Set 1", setPanelOpen: false,
  songOverrides: {}, lyricsEditorOpen: false,
  customSongs: [], uploadOpen: false,
  lineups: [], lineupModalOpen: false, editingLineupId: null,
};

export function useLumen(props: LumenProps = {}) {
  const [state, setState] = useState<LumenState>(INITIAL_STATE);

  const patch = useCallback((next: Partial<LumenState> | ((s: LumenState) => Partial<LumenState>)) => {
    setState((prev) => ({ ...prev, ...(typeof next === "function" ? next(prev) : next) }));
  }, []);

  const theme = state.theme || props.theme || "dark";
  const accent = props.accent || "#8b5cf6";

  const [bibleManifest, setBibleManifest] = useState<BibleMeta[]>([]);
  const [bibleCache, setBibleCache] = useState<Record<string, BibleTranslation>>({});
  const bibleCacheRef = useRef(bibleCache);
  bibleCacheRef.current = bibleCache;

  useEffect(() => {
    let cancelled = false;
    fetch("/bible/json/manifest.json")
      .then((r) => r.json())
      .then((data: BibleMeta[]) => { if (!cancelled) setBibleManifest(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (bibleCacheRef.current[state.trans]) return;
    let cancelled = false;
    fetch("/bible/json/" + state.trans + ".json")
      .then((r) => r.json())
      .then((data: BibleTranslation) => {
        if (!cancelled) setBibleCache((prev) => ({ ...prev, [state.trans]: data }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [state.trans]);

  const translation = bibleCache[state.trans];
  const bibleBooks = useMemo(() => translation?.books ?? [], [translation]);
  const currentTransMeta = useMemo(
    () => bibleManifest.find((m) => m.code === state.trans),
    [bibleManifest, state.trans]
  );

  const ref = state.book + " " + state.chapter;
  const currentBook = useMemo(() => bibleBooks.find((b) => b.name === state.book), [bibleBooks, state.book]);
  const currentChapter = useMemo(
    () => currentBook?.chapters.find((c) => c.number === state.chapter),
    [currentBook, state.chapter]
  );
  const passage = useMemo(() => {
    if (!translation) return LOADING_PASSAGE;
    return currentChapter ? currentChapter.verses.map((v) => v.text) : MISSING_PASSAGE;
  }, [translation, currentChapter]);
  const vnum = useCallback((i: number) => currentChapter?.verses[i]?.number ?? i + 1, [currentChapter]);

  const allSongs = useMemo(() => [...SONGS, ...state.customSongs], [state.customSongs]);

  const song = useMemo(() => {
    const base = allSongs.find((s) => s.id === state.songId) || allSongs[0];
    const override = state.songOverrides[base.id];
    return override ? { ...base, sections: override } : base;
  }, [state.songId, state.songOverrides, allSongs]);
  const look = useMemo(() => LOOKS.find((l) => l.id === state.look) || LOOKS[0], [state.look]);

  const setSongs = useMemo(
    () => state.setIds.map((id) => allSongs.find((s) => s.id === id)).filter((s): s is Song => !!s),
    [state.setIds, allSongs]
  );
  const inSet = state.mode === "songs" && state.setIds.includes(song.id);
  const toggleSetSong = useCallback((id: string) => {
    patch((s) => ({
      setIds: s.setIds.includes(id) ? s.setIds.filter((sid) => sid !== id) : [...s.setIds, id],
    }));
  }, [patch]);

  const createLineup = useCallback((name: string, songIds: string[]) => {
    const id = "lineup-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const lineup: Lineup = { id, name, songIds };
    patch((s) => ({
      lineups: [...s.lineups, lineup],
      setIds: songIds, setName: name,
      lineupModalOpen: false, editingLineupId: null,
    }));
  }, [patch]);

  const updateLineup = useCallback((id: string, name: string, songIds: string[]) => {
    patch((s) => ({
      lineups: s.lineups.map((l) => (l.id === id ? { ...l, name, songIds } : l)),
      lineupModalOpen: false, editingLineupId: null,
    }));
  }, [patch]);

  const deleteLineup = useCallback((id: string) => {
    patch((s) => ({ lineups: s.lineups.filter((l) => l.id !== id) }));
  }, [patch]);

  const activateLineup = useCallback((id: string) => {
    patch((s) => {
      const lineup = s.lineups.find((l) => l.id === id);
      return lineup ? { setIds: lineup.songIds, setName: lineup.name, setPanelOpen: false } : {};
    });
  }, [patch]);

  const saveLyrics = useCallback((sections: Section[]) => {
    patch((s) => ({ songOverrides: { ...s.songOverrides, [song.id]: sections } }));
  }, [patch, song.id]);

  const addSong = useCallback((parsed: ParsedSong) => {
    const id = "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const newSong: Song = { ...parsed, id, fav: false, when: "Just added" };
    patch((s) => ({
      customSongs: [...s.customSongs, newSong],
      songId: id, idx: 0, mode: "songs", uploadOpen: false,
    }));
  }, [patch]);

  const slides = useMemo<Slide[]>(() => {
    if (state.mode === "bible") {
      return passage.map((t, i) => ({
        label: "v" + vnum(i), lines: [t], n: i + 1,
        caption: ref + ":" + vnum(i) + "  ·  " + shortTransLabel(state.trans),
      }));
    }
    return song.sections.map((sec, i) => ({ label: sec.label, lines: sec.lines, n: i + 1, caption: "" }));
  }, [state.mode, passage, vnum, ref, state.trans, song]);

  const go = useCallback((d: number) => {
    setState((s) => {
      const max = (s.mode === "bible" ? passage.length : song.sections.length) - 1;
      return { ...s, idx: Math.min(max, Math.max(0, s.idx + d)), black: false, blank: false };
    });
  }, [passage.length, song.sections.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "F5") { e.preventDefault(); patch({ presenting: true }); return; }
      if (k === "Escape") {
        patch({ presenting: false, settingsOpen: false, setPanelOpen: false, lyricsEditorOpen: false, uploadOpen: false, lineupModalOpen: false, editingLineupId: null });
        return;
      }
      const target = e.target as HTMLElement | null;
      const isTyping = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isTyping) return;
      if (k === "ArrowRight" || k === " " || k === "PageDown") { e.preventDefault(); go(1); }
      else if (k === "ArrowLeft" || k === "PageUp") { e.preventDefault(); go(-1); }
      else if (k === "b" || k === "B") { patch((s) => ({ black: !s.black, blank: false })); }
      else if (k === "w" || k === "W") { patch((s) => ({ blank: !s.blank, black: false })); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, patch]);

  const lyricFamily = state.font === "serif" || (!state.font && props.lyricFont === "serif")
    ? "var(--font-serif)"
    : "var(--font-sans)";

  const canvas = (pad: string): CSSProperties => ({
    position: "absolute", inset: 0, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: pad, padding: "6% 8%",
    textAlign: "center", zIndex: 1,
  });

  const idx = Math.min(state.idx, slides.length - 1);
  const cur = slides[idx];
  const nxt = slides[idx + 1];
  const prv = slides[idx - 1];
  const hidden = state.black || state.blank;
  const bible = state.mode === "bible";

  const chipBase = (on: boolean): CSSProperties => ({
    height: "26px", padding: "0 11px", borderRadius: "20px", fontSize: "12px", cursor: "pointer",
    border: "1px solid " + (on ? "var(--accent)" : "var(--border)"),
    background: on ? "var(--accent-soft)" : "var(--panel2)",
    color: on ? "var(--text)" : "var(--muted)", fontWeight: on ? 600 : 400,
  });

  const tabStyle = (on: boolean): CSSProperties => ({
    flex: 1, height: 28, borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "12.5px",
    fontWeight: on ? 600 : 500, background: on ? "var(--raise)" : "transparent",
    color: on ? "var(--text)" : "var(--muted)", boxShadow: on ? "var(--shadow-sm)" : "none",
  });

  const pill = (isAccent: boolean): CSSProperties => ({
    fontSize: "11px", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase",
    padding: "3px 9px", borderRadius: "6px",
    background: isAccent ? "var(--accent-soft)" : "var(--raise)",
    color: isAccent ? "var(--accent)" : "var(--muted)",
    border: "1px solid " + (isAccent ? "var(--accent)" : "var(--border)"),
  });

  const toolBtn = (on: boolean, tone: string): CSSProperties => ({
    height: "44px", padding: "0 18px", borderRadius: "11px", fontSize: "13.5px", fontWeight: 600, cursor: "pointer",
    border: "1px solid " + (on ? tone : "var(--border)"),
    background: on ? tone : "var(--panel2)",
    color: on ? (tone === "#000" ? "#fff" : "#0a0a0c") : "var(--muted)",
  });

  let list = allSongs.filter((s) => {
    const q = state.query.trim().toLowerCase();
    const okQ = !q || (s.title + " " + s.artist + " " + s.tags.join(" ")).toLowerCase().includes(q);
    const okC = state.chip === "All" || (state.chip === "Favorites" ? !!state.favs[s.id] : s.cat === state.chip);
    return okQ && okC;
  });
  if (state.sort === "A–Z") list = list.slice().sort((a, b) => a.title.localeCompare(b.title));
  if (state.sort === "Key") list = list.slice().sort((a, b) => a.key.localeCompare(b.key));

  const longest = cur.lines.reduce((m, l) => Math.max(m, l.length), 0);
  const fit = longest > 110 ? 0.62 : longest > 70 ? 0.78 : 1;
  const bigLine: CSSProperties = {
    fontFamily: lyricFamily, fontSize: 26 * state.scale * fit + "px", lineHeight: 1.34, fontWeight: 600,
    letterSpacing: "-0.015em", color: "#fff", textShadow: "0 2px 24px rgba(0,0,0,.5)",
  };

  return {
    state, patch, theme, accent, ref, passage, vnum, song, look, slides, go, idx, cur, nxt, prv, hidden,
    bible, list, chipBase, tabStyle, pill, toolBtn, canvas, lyricFamily, fit, bigLine,
    setSongs, inSet, toggleSetSong, saveLyrics, addSong, allSongs,
    createLineup, updateLineup, deleteLineup, activateLineup,
    bibleManifest, bibleBooks, currentBook, currentTransMeta, shortTransLabel,
  };
}

export type UseLumen = ReturnType<typeof useLumen>;
