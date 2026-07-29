"use client";

import { useEffect, useState } from "react";
import { CHIPS, SONGS, SORTS } from "./data";
import { cx } from "./cx";
import { InteractiveButton, InteractiveInput } from "./Interactive";
import type { UseLumen } from "./useLumen";

const RECENT = SONGS.slice(0, 3);
const BIBLE_LANGUAGES = ["English", "Cebuano", "Tagalog"] as const;

export function Sidebar({ v }: { v: UseLumen }) {
  const {
    state, patch, bible, list, chipBase, tabStyle, ref, passage, vnum, idx,
    bibleManifest, bibleBooks, currentBook, currentTransMeta, shortTransLabel,
    allSongs, deleteLineup, toggleFavorite,
  } = v;
  const [transLang, setTransLang] = useState<(typeof BIBLE_LANGUAGES)[number]>("English");
  const [viewingLineupId, setViewingLineupId] = useState<string | null>(null);
  const lineupsMode = state.mode === "lineups";

  useEffect(() => {
    if (!lineupsMode) setViewingLineupId(null);
  }, [lineupsMode]);

  const viewingLineup = state.lineups.find((l) => l.id === viewingLineupId) || null;
  const lineupSongs = (viewingLineup?.songIds ?? [])
    .map((id) => allSongs.find((s) => s.id === id))
    .filter((s): s is (typeof allSongs)[number] => !!s);

  const resultCount = bible ? passage.length + " verses" : list.length + " songs";
  const showRecent = state.chip === "All" && !state.query;

  return (
    <aside className="w-82 flex-none border-r border-border bg-panel flex flex-col min-h-0">
      <div className="p-[14px_14px_10px] flex flex-col gap-2.5 border-b border-border">
        <div className="flex p-0.75 gap-0.75 rounded-[10px] bg-panel2 border border-border">
          <button onClick={() => patch({ mode: "songs", idx: 0, black: false, blank: false })} className={tabStyle(state.mode === "songs")}>Songs</button>
          <button onClick={() => patch({ mode: "bible", idx: 0, black: false, blank: false })} className={tabStyle(state.mode === "bible")}>Bible</button>
          <button onClick={() => patch({ mode: "lineups", idx: 0, black: false, blank: false })} className={tabStyle(lineupsMode)}>Lineups</button>
        </div>

        {!lineupsMode && (
        <>
        <div className="relative flex items-center">
          <span className="absolute left-2.75 text-[13px] text-faint">⌕</span>
          <InteractiveInput
            value={state.query}
            onChange={(e) => patch({ query: e.target.value })}
            placeholder={bible ? "Go to reference — e.g. John 3:16" : "Search songs, lyrics, tags"}
            className="w-full h-9 p-[0_44px_0_28px] rounded-[10px] border border-border bg-panel2 text-[13px] outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]"
          />
          <span className="absolute right-2.5 font-mono text-[10px] text-faint border border-border rounded-[5px] p-[2px_5px]">⌘K</span>
        </div>

        {bible && (
          <div className="flex flex-wrap gap-1.5">
            {BIBLE_LANGUAGES.map((lang) => (
              <button key={lang} onClick={() => setTransLang(lang)} className={chipBase(transLang === lang)}>
                {lang}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {bible
            ? bibleManifest
                .filter((m) => m.language === transLang)
                .map((m) => (
                  <button
                    key={m.code}
                    onClick={() => patch({ trans: m.code })}
                    className={chipBase(state.trans === m.code)}
                    title={m.name}
                  >
                    {shortTransLabel(m.code)}
                  </button>
                ))
            : CHIPS.map((c) => (
                <button key={c} onClick={() => patch({ chip: c })} className={chipBase(state.chip === c)}>
                  {c}
                </button>
              ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-[11px] text-faint font-medium tracking-[.04em] uppercase">
            {resultCount}
          </div>
          {!bible && (
            <InteractiveButton
              onClick={() => patch((s) => ({ sort: SORTS[(SORTS.indexOf(s.sort) + 1) % SORTS.length] }))}
              className="text-[12px] text-muted border-none cursor-pointer px-1 py-0.5 flex items-center gap-1.25 hover:text-text"
            >
              Sort: {state.sort} <span className="text-faint">⇅</span>
            </InteractiveButton>
          )}
          {bible && (
            <InteractiveButton
              onClick={() => patch({ idx: 0, black: false, blank: false })}
              className="text-[12px] text-accent border-none cursor-pointer px-1 py-0.5 hover:text-text"
            >
              Queue whole chapter
            </InteractiveButton>
          )}
        </div>
        </>
        )}
      </div>

      {bible && (
        <>
          <div className="flex-none flex border-b border-border h-43">
            <div className="w-29.5 flex-none border-r border-border overflow-y-auto p-1.5">
              {bibleBooks.map((b) => (
                <button
                  key={b.number}
                  onClick={() => patch({ book: b.name, chapter: 1, idx: 0 })}
                  className={cx(
                    "block w-full text-left p-[6px_8px] rounded-[7px] border-none cursor-pointer text-[12px]",
                    b.name === state.book ? "bg-accent-soft text-text font-semibold" : "bg-transparent text-muted font-normal"
                  )}
                >
                  {b.name}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="text-[10px] font-semibold tracking-[.06em] uppercase text-faint p-[2px_2px_7px]">
                Chapter
              </div>
              <div className="grid grid-cols-5 gap-1.25">
                {Array.from({ length: currentBook?.chapters.length || 1 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => patch({ chapter: n, idx: 0 })}
                    className={cx(
                      "h-6.5 rounded-[7px] cursor-pointer text-[11px] font-mono border",
                      n === state.chapter ? "border-accent bg-accent-soft text-text" : "border-border bg-panel2 text-muted"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-[10px_10px_20px]">
            <div className="p-[4px_6px_9px]">
              <div className="flex items-baseline gap-2">
                <div className="text-[13.5px] font-semibold tracking-[-0.01em]">{ref}</div>
                <div className="font-mono text-[10px] text-faint">
                  {currentTransMeta?.name || state.trans}
                </div>
              </div>
              {currentTransMeta && (
                <div className="text-[10px] text-faint mt-0.75 leading-[1.4]">
                  {currentTransMeta.license}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              {passage.map((t, i) => (
                <div
                  key={i}
                  onClick={() => patch({ idx: i, black: false, blank: false })}
                  className={cx(
                    "flex gap-2.25 p-[8px_9px] rounded-2.25 cursor-pointer border",
                    i === idx ? "border-accent bg-accent-soft" : "border-transparent bg-panel2"
                  )}
                >
                  <span className={cx("font-mono text-[10px] pt-0.75", i === idx ? "text-accent" : "text-faint")}>
                    {vnum(i)}
                  </span>
                  <span className="flex-1 text-[12.5px] leading-normal">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {state.mode === "songs" && (
        <div className="flex-1 overflow-y-auto p-[10px_10px_20px]">
          {showRecent && (
            <>
              <div className="p-[8px_6px_6px] text-[11px] font-semibold tracking-[.06em] uppercase text-faint">
                Recently used
              </div>
              <div className="flex flex-col gap-0.5 mb-2.5">
                {RECENT.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => patch({ songId: s.id, idx: 0 })}
                    className={cx(
                      "flex items-center gap-2.25 w-full p-[7px_8px] rounded-2 border border-transparent text-text cursor-pointer",
                      s.id === state.songId ? "bg-raise" : "bg-transparent"
                    )}
                  >
                    <span className="font-mono text-[10px] text-faint w-8.5 text-left">{s.when}</span>
                    <span className="flex-1 text-left text-[13px] truncate">{s.title}</span>
                    <span className="font-mono text-[10px] text-faint">{s.key}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="flex items-center justify-between p-[8px_6px_6px]">
            <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">
              Library
            </div>
            <div className="flex gap-2.5">
              <InteractiveButton
                onClick={() => patch({ lineupModalOpen: true, editingLineupId: null })}
                className="text-[11.5px] font-semibold text-accent border-none cursor-pointer px-1 py-0.5 hover:text-text"
              >
                + New lineup
              </InteractiveButton>
              <InteractiveButton
                onClick={() => patch({ uploadOpen: true })}
                className="text-[11.5px] font-semibold text-accent border-none cursor-pointer px-1 py-0.5 hover:text-text"
              >
                + Upload song
              </InteractiveButton>
            </div>
          </div>
          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-2 text-center p-[40px_18px] text-muted">
              <span className="text-[22px] text-faint">⌕</span>
              <div className="text-[13px] font-semibold text-text">No songs found</div>
              <div className="text-[12px] leading-normal">Try a different search term or filter.</div>
              <InteractiveButton
                onClick={() => patch({ query: "", chip: "All" })}
                className="mt-1 h-7.5 px-3 rounded-2 border border-border bg-panel2 text-[12px] text-muted cursor-pointer hover:text-text hover:bg-raise"
              >
                Clear filters
              </InteractiveButton>
            </div>
          ) : (
          <div className="flex flex-col gap-1.5">
            {list.map((s) => {
              const on = s.id === state.songId;
              const fav = !!state.favs[s.id];
              return (
                <div
                  key={s.id}
                  onClick={() => patch({ songId: s.id, idx: 0, black: false, blank: false })}
                  className={cx(
                    "p-[11px_12px_10px] rounded-xl cursor-pointer border",
                    on ? "border-accent bg-accent-soft shadow-[0_0_0_3px_var(--accent-soft)]" : "border-border bg-panel2 shadow-none"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-semibold tracking-[-0.01em] truncate">
                        {s.title}
                      </div>
                      <div className="text-[12px] text-muted mt-0.5 truncate">
                        {s.artist}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(s.id); }}
                      className={cx("border-none cursor-pointer text-[14px] leading-none p-0.5", fav ? "text-warn" : "text-faint")}
                    >
                      ★
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2.25">
                    <span className="font-mono text-[10px] text-text bg-raise border border-border p-[2px_6px] rounded-[5px]">
                      {s.key}
                    </span>
                    <span className="font-mono text-[10px] text-faint">{s.bpm}</span>
                    <div className="flex-1" />
                    {s.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-[10.5px] text-muted bg-panel2 border border-border p-[2px_7px] rounded-5">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {lineupsMode && !viewingLineup && (
        <div className="flex-1 overflow-y-auto p-[10px_10px_20px]">
          <div className="flex items-center justify-between p-[8px_6px_6px]">
            <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">
              Lineups
            </div>
            <InteractiveButton
              onClick={() => patch({ lineupModalOpen: true, editingLineupId: null })}
              className="text-[11.5px] font-semibold text-accent border-none cursor-pointer px-1 py-0.5 hover:text-text"
            >
              + New lineup
            </InteractiveButton>
          </div>

          {state.lineups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 text-center p-[40px_18px] text-muted">
              <div className="text-[13px] font-semibold text-text">No lineups yet</div>
              <div className="text-[12px] leading-normal">Create one to group songs for a service or event.</div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {state.lineups.map((lu) => (
                <div
                  key={lu.id}
                  onClick={() => setViewingLineupId(lu.id)}
                  className="flex items-center gap-2.5 p-[11px_12px] rounded-xl cursor-pointer border border-border bg-panel2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-semibold tracking-[-0.01em] truncate">
                      {lu.name}
                    </div>
                    <div className="text-[12px] text-muted mt-0.5">
                      {lu.songIds.length === 1 ? "1 song" : lu.songIds.length + " songs"}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); patch({ lineupModalOpen: true, editingLineupId: lu.id }); }}
                    className="border-none cursor-pointer text-[12.5px] text-muted p-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteLineup(lu.id); }}
                    className="border-none cursor-pointer text-[12.5px] text-faint p-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {lineupsMode && viewingLineup && (
        <div className="flex-1 overflow-y-auto p-[10px_10px_20px]">
          <div className="flex items-center gap-2 p-[4px_6px_12px]">
            <button
              onClick={() => setViewingLineupId(null)}
              className="border-none cursor-pointer text-[16px] text-muted p-0.5 leading-none"
              title="Back to lineups"
            >
              ←
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold tracking-[-0.01em] truncate">
                {viewingLineup.name}
              </div>
              <div className="text-[11.5px] text-faint mt-0.5">
                {viewingLineup.songIds.length === 1 ? "1 song" : viewingLineup.songIds.length + " songs"}
              </div>
            </div>
            <InteractiveButton
              onClick={() => patch({ lineupModalOpen: true, editingLineupId: viewingLineup.id })}
              className="text-[12px] text-muted border border-border rounded-[7px] p-[5px_9px] cursor-pointer hover:text-text hover:bg-raise"
            >
              Edit
            </InteractiveButton>
            <InteractiveButton
              onClick={() => { deleteLineup(viewingLineup.id); setViewingLineupId(null); }}
              className="text-[12px] text-danger border border-border rounded-[7px] p-[5px_9px] cursor-pointer hover:text-white hover:bg-danger"
            >
              Delete
            </InteractiveButton>
          </div>

          {lineupSongs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 text-center p-[40px_18px] text-muted">
              <div className="text-[13px] font-semibold text-text">No songs in this lineup</div>
              <div className="text-[12px] leading-normal">Click Edit to add some.</div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {lineupSongs.map((s) => {
                const on = s.id === state.songId;
                return (
                  <div
                    key={s.id}
                    onClick={() => patch({ songId: s.id, idx: 0, black: false, blank: false })}
                    className={cx(
                      "p-[11px_12px_10px] rounded-xl cursor-pointer border",
                      on ? "border-accent bg-accent-soft shadow-[0_0_0_3px_var(--accent-soft)]" : "border-border bg-panel2 shadow-none"
                    )}
                  >
                    <div className="text-[13.5px] font-semibold tracking-[-0.01em] truncate">
                      {s.title}
                    </div>
                    <div className="text-[12px] text-muted mt-0.5 truncate">
                      {s.artist}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2.25">
                      <span className="font-mono text-[10px] text-text bg-raise border border-border p-[2px_6px] rounded-[5px]">
                        {s.key}
                      </span>
                      <span className="font-mono text-[10px] text-faint">{s.bpm}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
