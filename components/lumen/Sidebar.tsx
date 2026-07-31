"use client";

import { useEffect, useMemo, useState } from "react";
import { CHIPS, SONGS, SORTS } from "./data";
import { cx } from "./cx";
import { InteractiveButton, InteractiveInput } from "./Interactive";
import type { UseLumen } from "./useLumen";

const RECENT = SONGS.slice(0, 3);

export function Sidebar({ lumen }: { lumen: UseLumen }) {
  const {
    state, patch, bible, list, chipBase, tabStyle, ref, passage, vnum, idx,
    bibleBooks, currentBook, currentTransMeta, shortTransLabel,
    allSongs, deleteLineup, activateLineup, toggleFavorite, deleteSong, reorderLineupSongs,
  } = lumen;
  // Driven entirely by what's been imported (Settings > Bible Translations)
  // — this app bundles no Bible data at all, so there's no fixed language
  // list to fall back to.
  const bibleLanguages = useMemo(
    () => Array.from(new Set(state.downloadedTranslations.map((entry) => entry.language))),
    [state.downloadedTranslations]
  );
  const [transLang, setTransLang] = useState<string | null>(null);
  useEffect(() => {
    if (bibleLanguages.length && (!transLang || !bibleLanguages.includes(transLang))) {
      setTransLang(bibleLanguages[0]);
    }
  }, [bibleLanguages, transLang]);
  const [viewingLineupId, setViewingLineupId] = useState<string | null>(null);
  const [draggedSongIndex, setDraggedSongIndex] = useState<number | null>(null);
  const lineupsMode = state.mode === "lineups";

  useEffect(() => {
    if (!lineupsMode) setViewingLineupId(null);
  }, [lineupsMode]);

  const viewingLineup = state.lineups.find((lineup) => lineup.id === viewingLineupId) || null;
  const lineupSongs = (viewingLineup?.songIds ?? [])
    .map((songId) => allSongs.find((candidate) => candidate.id === songId))
    .filter((maybeSong): maybeSong is (typeof allSongs)[number] => !!maybeSong);

  const hasBibleTranslations = state.downloadedTranslations.length > 0;
  const resultCount = bible ? passage.length + " verses" : list.length + " songs";
  const showRecent = state.chip === "All" && !state.query;

  return (
    <aside
      className="flex-none border-r border-border bg-panel flex flex-col min-h-0"
      style={{ width: state.layoutSizes.sidebarWidth }}
    >
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
            onChange={(changeEvent) => patch({ query: changeEvent.target.value })}
            placeholder={bible ? "Go to reference — e.g. John 3:16" : "Search songs, lyrics, tags"}
            className="w-full h-9 p-[0_44px_0_28px] rounded-[10px] border border-border bg-panel2 text-[13px] outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]"
          />
          <span className="absolute right-2.5 font-mono text-[10px] text-faint border border-border rounded-[5px] p-[2px_5px]">⌘K</span>
        </div>

        <div className=" border-b border-border ">
          {bible && bibleLanguages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {bibleLanguages.map((language) => (
              <button key={language} onClick={() => setTransLang(language)} className={chipBase(transLang === language)}>
                {language}
              </button>
            ))}
          </div>
        )}
        </div>

        {bible && !hasBibleTranslations ? null : (
          <div className="flex flex-wrap gap-1.5">
            {bible
              ? state.downloadedTranslations
                  .filter((entry) => entry.language === transLang)
                  .map((entry) => (
                    <button
                      key={entry.code}
                      onClick={() => patch({ trans: entry.code })}
                      className={chipBase(state.trans === entry.code)}
                      title={entry.name}
                    >
                      {shortTransLabel(entry.code)}
                    </button>
                  ))
              : CHIPS.map((chip) => (
                  <button key={chip} onClick={() => patch({ chip })} className={chipBase(state.chip === chip)}>
                    {chip}
                  </button>
                ))}
          </div>
        )}

        {(!bible || hasBibleTranslations) && (
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-faint font-medium tracking-[.04em] uppercase">
            {resultCount}
          </div>
          {!bible && (
            <InteractiveButton
              onClick={() => patch((previousState) => ({ sort: SORTS[(SORTS.indexOf(previousState.sort) + 1) % SORTS.length] }))}
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
        )}
        </>
        )}
      </div>

      {bible && (
        hasBibleTranslations ? (
        <>
          <div className="flex-none flex border-b border-border h-43">
            <div className="w-29.5 flex-none border-r border-border overflow-y-auto p-1.5">
              {bibleBooks.map((book) => (
                <button
                  key={book.number}
                  onClick={() => patch({ book: book.name, chapter: 1, idx: 0 })}
                  className={cx(
                    "block w-full text-left p-[6px_8px] rounded-[7px] border-none cursor-pointer text-[12px]",
                    book.name === state.book ? "bg-accent-soft text-text font-semibold" : "bg-transparent text-muted font-normal"
                  )}
                >
                  {book.name}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="text-[10px] font-semibold tracking-[.06em] uppercase text-faint p-[2px_2px_7px]">
                Chapter
              </div>
              <div className="grid grid-cols-5 gap-1.25">
                {Array.from({ length: currentBook?.chapters.length || 1 }, (_, chapterOffset) => chapterOffset + 1).map((chapterNumber) => (
                  <button
                    key={chapterNumber}
                    onClick={() => patch({ chapter: chapterNumber, idx: 0 })}
                    className={cx(
                      "h-6.5 rounded-[7px] cursor-pointer text-[11px] font-mono border",
                      chapterNumber === state.chapter ? "border-accent bg-accent-soft text-text" : "border-border bg-panel2 text-muted"
                    )}
                  >
                    {chapterNumber}
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
              {passage.map((verseText, verseIndex) => (
                <div
                  key={verseIndex}
                  onClick={() => patch({ idx: verseIndex, black: false, blank: false })}
                  className={cx(
                    "flex gap-2.25 p-[8px_9px] rounded-2.25 cursor-pointer border",
                    verseIndex === idx ? "border-accent bg-accent-soft" : "border-transparent bg-panel2"
                  )}
                >
                  <span className={cx("font-mono text-[10px] pt-0.75", verseIndex === idx ? "text-accent" : "text-faint")}>
                    {vnum(verseIndex)}
                  </span>
                  <span className="flex-1 text-[12.5px] leading-normal">{verseText}</span>
                </div>
              ))}
            </div>
          </div>
        </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-[24px_18px]">
            <div className="flex flex-col items-center gap-2 text-center text-muted">
              <span className="text-[22px] text-faint">📖</span>
              <div className="text-[13px] font-semibold text-text">No Bible translations imported</div>
              <div className="text-[12px] leading-normal max-w-55">
                Import a translation to start browsing and presenting Scripture.
              </div>
              <InteractiveButton
                onClick={() => patch({ settingsOpen: true })}
                className="mt-1 h-7.5 px-3 rounded-2 border border-border bg-panel2 text-[12px] text-muted cursor-pointer hover:text-text hover:bg-raise"
              >
                Import translation
              </InteractiveButton>
            </div>
          </div>
        )
      )}

      {state.mode === "songs" && (
        <div className="flex-1 overflow-y-auto p-[10px_10px_20px]">
          {showRecent && (
            <>
              <div className="p-[8px_6px_6px] text-[11px] font-semibold tracking-[.06em] uppercase text-faint">
                Recently used
              </div>
              <div className="flex flex-col gap-0.5 mb-2.5">
                {RECENT.map((recentSong) => (
                  <button
                    key={recentSong.id}
                    onClick={() => patch({ songId: recentSong.id, idx: 0 })}
                    className={cx(
                      "flex items-center gap-2.25 w-full p-[7px_8px] rounded-2 border border-transparent text-text cursor-pointer",
                      recentSong.id === state.songId ? "bg-raise" : "bg-transparent"
                    )}
                  >
                    <span className="font-mono text-[10px] text-faint w-8.5 text-left">{recentSong.when}</span>
                    <span className="flex-1 text-left text-[13px] truncate">{recentSong.title}</span>
                    <span className="font-mono text-[10px] text-faint">{recentSong.key}</span>
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
            {list.map((songEntry) => {
              const on = songEntry.id === state.songId;
              const fav = !!state.favs[songEntry.id];
              return (
                <div
                  key={songEntry.id}
                  onClick={() => patch({ songId: songEntry.id, idx: 0, black: false, blank: false })}
                  className={cx(
                    "p-[11px_12px_10px] rounded-xl cursor-pointer border",
                    on ? "border-accent bg-accent-soft shadow-[0_0_0_3px_var(--accent-soft)]" : "border-border bg-panel2 shadow-none"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-semibold tracking-[-0.01em] truncate">
                        {songEntry.title}
                      </div>
                      <div className="text-[12px] text-muted mt-0.5 truncate">
                        {songEntry.artist}
                      </div>
                    </div>
                    <button
                      onClick={(clickEvent) => { clickEvent.stopPropagation(); toggleFavorite(songEntry.id); }}
                      className={cx("border-none cursor-pointer text-[14px] leading-none p-0.5", fav ? "text-warn" : "text-faint")}
                    >
                      ★
                    </button>
                    {songEntry.id.startsWith("custom-") && (
                      <button
                        onClick={(clickEvent) => { clickEvent.stopPropagation(); deleteSong(songEntry.id); }}
                        className="border-none cursor-pointer text-[13px] leading-none p-0.5 text-faint hover:text-danger"
                        title="Delete song"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2.25">
                    {songEntry.key && (
                      <span className="font-mono text-[10px] text-text bg-raise border border-border p-[2px_6px] rounded-[5px]">
                        {songEntry.key}
                      </span>
                    )}
                    <span className="font-mono text-[10px] text-faint">{songEntry.bpm}</span>
                    <div className="flex-1" />
                    {songEntry.tags.slice(0, 2).map((tag) => (
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
              {state.lineups.map((lineup) => (
                <div
                  key={lineup.id}
                  onClick={() => setViewingLineupId(lineup.id)}
                  className="flex items-center gap-2.5 p-[11px_12px] rounded-xl cursor-pointer border border-border bg-panel2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-semibold tracking-[-0.01em] truncate">
                      {lineup.name}
                    </div>
                    <div className="text-[12px] text-muted mt-0.5">
                      {lineup.songIds.length === 1 ? "1 song" : lineup.songIds.length + " songs"}
                    </div>
                  </div>
                  {lineup.id === state.activeLineupId ? (
                    <span className="text-[11.5px] font-semibold text-accent px-1.5 py-0.5 rounded-1.5 bg-accent-soft">
                      Active
                    </span>
                  ) : (
                    <button
                      onClick={(clickEvent) => { clickEvent.stopPropagation(); activateLineup(lineup.id); }}
                      className="border-none cursor-pointer text-[12.5px] text-accent p-1"
                    >
                      Activate
                    </button>
                  )}
                  <button
                    onClick={(clickEvent) => { clickEvent.stopPropagation(); patch({ lineupModalOpen: true, editingLineupId: lineup.id }); }}
                    className="border-none cursor-pointer text-[12.5px] text-muted p-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(clickEvent) => { clickEvent.stopPropagation(); deleteLineup(lineup.id); }}
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
                {viewingLineup.songIds.length > 1 && " · drag ⠿ to reorder"}
              </div>
            </div>
            {viewingLineup.id === state.activeLineupId ? (
              <span className="text-[12px] font-semibold text-accent border border-accent rounded-[7px] p-[5px_9px] bg-accent-soft">
                Active
              </span>
            ) : (
              <InteractiveButton
                onClick={() => activateLineup(viewingLineup.id)}
                className="text-[12px] text-white bg-accent border-none rounded-[7px] p-[5px_9px] cursor-pointer hover:brightness-110"
              >
                Activate
              </InteractiveButton>
            )}
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
              {lineupSongs.map((lineupSong, lineupSongIndex) => {
                const on = lineupSong.id === state.songId;
                const isDragging = draggedSongIndex === lineupSongIndex;
                return (
                  <div
                    key={lineupSong.id}
                    draggable
                    onDragStart={() => setDraggedSongIndex(lineupSongIndex)}
                    onDragOver={(dragEvent) => dragEvent.preventDefault()}
                    onDrop={() => {
                      if (draggedSongIndex !== null) {
                        reorderLineupSongs(viewingLineup.id, draggedSongIndex, lineupSongIndex);
                      }
                      setDraggedSongIndex(null);
                    }}
                    onDragEnd={() => setDraggedSongIndex(null)}
                    onClick={() => patch({ songId: lineupSong.id, idx: 0, black: false, blank: false })}
                    className={cx(
                      "flex items-start gap-2 p-[11px_12px_10px] rounded-xl cursor-pointer border",
                      on ? "border-accent bg-accent-soft shadow-[0_0_0_3px_var(--accent-soft)]" : "border-border bg-panel2 shadow-none",
                      isDragging && "opacity-40"
                    )}
                  >
                    <span className="flex-none cursor-grab active:cursor-grabbing text-faint text-[13px] pt-0.5">⠿</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-semibold tracking-[-0.01em] truncate">
                        {lineupSong.title}
                      </div>
                      <div className="text-[12px] text-muted mt-0.5 truncate">
                        {lineupSong.artist}
                      </div>
                      <div className="flex items-center gap-1.5 mt-2.25">
                        {lineupSong.key && (
                          <span className="font-mono text-[10px] text-text bg-raise border border-border p-[2px_6px] rounded-[5px]">
                            {lineupSong.key}
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-faint">{lineupSong.bpm}</span>
                      </div>
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
