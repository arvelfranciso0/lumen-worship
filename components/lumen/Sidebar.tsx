"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BibleComparePanel } from "./BibleComparePanel";
import { matchBibleBooks, parseBibleQuery, resolveBibleQueryTarget } from "./bibleSearch";
import { CHIPS, SONGS, SORTS, type Song } from "./data";
import { cx } from "./cx";
import { InteractiveButton, InteractiveInput } from "./Interactive";
import type { UseLumen } from "./useLumen";
import type { Breakpoint } from "./useViewportBreakpoint";

const RECENT = SONGS.slice(0, 3);

const BIBLE_SUB_TABS: { id: "browse" | "compare"; label: string }[] = [
  { id: "browse", label: "Browse" },
  { id: "compare", label: "Compare" },
];

export function Sidebar({ lumen, breakpoint }: { lumen: UseLumen; breakpoint: Breakpoint }) {
  const {
    state, patch, bible, list, chipBase, tabStyle, ref, passage, vlabel, idx,
    bibleBooks, currentBook, currentTransMeta, shortTransLabel,
    allSongs, deleteLineup, activateLineup, toggleFavorite, deleteSong,
    duplicateSongAsReprise, askConfirm,
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
  // Book names come from whichever translation is actually loaded, so picking a
  // language has to move state.trans as well — otherwise the list keeps the old
  // language's names until a Version is picked too, which is not what "changed
  // the language" should mean. Landing on the first version of that language is
  // enough; useLumen's book-remap effect then carries the current book across by
  // canonical number once the new translation finishes loading, so "Psalms"
  // becomes "Mga Salmo" rather than dead-ending on an unknown name.
  const selectLanguage = (language: string) => {
    setTransLang(language);
    const current = state.downloadedTranslations.find((entry) => entry.code === state.trans);
    if (current?.language === language) return;
    const firstOfLanguage = state.downloadedTranslations.find((entry) => entry.language === language);
    if (firstOfLanguage) patch({ trans: firstOfLanguage.code, idx: 0, black: false, blank: false });
  };

  // Keeps the live verse in view. Jumping to "Genesis 1:1" selects the verse
  // but the Browse list holds its own scroll position, so a verse far down a
  // long chapter would be selected off-screen and the jump would read as having
  // done nothing. "nearest" so an already-visible verse doesn't shift the list.
  const activeVerseRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    activeVerseRef.current?.scrollIntoView({ block: "nearest" });
  }, [idx, state.book, state.chapter, state.bibleSubTab, state.mode]);

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

  // Bible search. The box wrote state.query all along, but only the song list
  // ever read it — in Bible mode every book rendered regardless, so typing a
  // reference did nothing. The book list is now filtered as you type, and Enter
  // jumps to the full reference.
  const bibleQuery = useMemo(() => parseBibleQuery(state.query), [state.query]);
  const visibleBibleBooks = useMemo(
    () => matchBibleBooks(bibleBooks, bibleQuery.bookQuery),
    [bibleBooks, bibleQuery.bookQuery]
  );
  const bibleTarget = useMemo(
    () => resolveBibleQueryTarget(bibleBooks, state.book, bibleQuery),
    [bibleBooks, state.book, bibleQuery]
  );
  const goToBibleQuery = () => {
    if (!bibleTarget) return;
    patch({
      book: bibleTarget.book, chapter: bibleTarget.chapter, idx: bibleTarget.verseIndex,
      black: false, blank: false,
      // Back to Browse: a reference jump that landed the operator on the Compare
      // tab would look like it had done nothing.
      bibleSubTab: "browse",
    });
  };

  const resultCount = bible
    ? (bibleQuery.bookQuery && visibleBibleBooks.length !== bibleBooks.length
      ? visibleBibleBooks.length + " books"
      : passage.length + " verses")
    : list.length + " songs";
  const showRecent = state.chip === "All" && !state.query;

  return (
    // Desktop is the only breakpoint where the operator drags this width;
    // tablet renders it as a fixed-width drawer (positioned by LumenApp) and
    // mobile gives it the whole body as one of MobileTabBar's panes.
    <aside
      className={cx(
        "bg-panel flex flex-col min-h-0 overflow-hidden",
        breakpoint === "mobile" ? "flex-1 w-full" : "flex-none",
        // On desktop the resize handle next to it is the divider; adding a
        // border here too would read as one thicker, uneven rule.
        breakpoint !== "desktop" && "border-r border-border"
      )}
      style={breakpoint === "desktop" ? { width: state.layoutSizes.sidebarWidth } : breakpoint === "tablet" ? { width: 320, maxWidth: "85vw" } : undefined}
    >
      <div className="p-[14px_14px_10px] flex flex-col gap-2.5 border-b border-border">
        <div className="flex p-0.75 gap-0.75 rounded-[10px] bg-panel2 border border-border">
          <button onClick={() => patch({ mode: "songs", idx: 0, black: false, blank: false })} className={tabStyle(state.mode === "songs")}>Songs</button>
          <button onClick={() => patch({ mode: "bible", idx: 0, black: false, blank: false })} className={tabStyle(state.mode === "bible")}>Bible</button>
          <button onClick={() => patch({ mode: "lineups", idx: 0, black: false, blank: false })} className={tabStyle(lineupsMode)}>Lineups</button>
        </div>

        {!lineupsMode && (
        <>
        <div data-tour="search" className="relative flex items-center">
          <span className="absolute left-2.75 text-[13px] text-faint">⌕</span>
          <InteractiveInput
            value={state.query}
            onChange={(changeEvent) => patch({ query: changeEvent.target.value })}
            onKeyDown={bible ? (keyEvent) => { if (keyEvent.key === "Enter") goToBibleQuery(); } : undefined}
            placeholder={bible ? "Go to reference — e.g. John 3:16" : "Search songs, lyrics, tags"}
            className="w-full h-9 p-[0_44px_0_28px] rounded-[10px] border border-border bg-panel2 text-[13px] outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]"
          />
          <span className="absolute right-2.5 font-mono text-[10px] text-faint border border-border rounded-[5px] p-[2px_5px]">⌘K</span>
        </div>

        {/* A reference the query resolves to is offered as a real row rather than
            left to a bare Enter press. Navigation was already wired to Enter, but
            nothing on screen said so — so typing "Genesis 1:1" looked like it
            only ever filtered the book list. */}
        {bible && bibleTarget && (
          <InteractiveButton
            onClick={goToBibleQuery}
            className="flex items-center gap-2 h-8 px-2.5 rounded-2 border border-accent bg-accent-soft text-[12px] text-text cursor-pointer text-left"
          >
            <span className="text-accent flex-none">↵</span>
            <span className="truncate">Go to <strong className="font-semibold">{bibleTarget.label}</strong></span>
          </InteractiveButton>
        )}

        {/* Language/version pickers are no longer up here — in Bible mode they
            live in their own labelled block below the book/chapter grid (see
            further down), which is where the operator-screen design puts them. */}
        {!bible && (
          <div className="flex flex-wrap gap-1.5">
            {CHIPS.map((chip) => (
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
          {/* Translation management hangs off the Version block's "Get more
              translations →" button further down, not from here. "Queue whole
              chapter" used to sit here too and was removed on request. */}
        </div>
        )}
        </>
        )}
      </div>

      {bible && (
        hasBibleTranslations ? (
        <>
          <div data-tour="bible-nav" className="flex-none flex border-b border-border h-43">
            <div className="w-29.5 flex-none border-r border-border overflow-y-auto p-1.5">
              {visibleBibleBooks.length === 0 ? (
                <div className="text-[11px] text-faint p-[6px_8px] leading-normal">No books match “{state.query.trim()}”</div>
              ) : (
                visibleBibleBooks.map((book) => (
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
                ))
              )}
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

          {/* Language, then version within that language — two labelled rows
              rather than one flat chip list, so it's obvious that picking a
              language re-scopes which version codes are on offer. Both lists
              are built purely from what's been imported: this app bundles no
              Bible data, so there is no fixed catalogue to grey out against. */}
          <div className="flex-none flex flex-col gap-2 p-[10px_14px] border-b border-border">
            <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">Language</div>
            <div className="flex flex-wrap gap-1.5">
              {bibleLanguages.map((language) => (
                <button
                  key={language}
                  onClick={() => selectLanguage(language)}
                  className={cx(
                    "h-6.5 px-2.5 rounded-full border text-[11.5px] cursor-pointer",
                    transLang === language ? "border-accent bg-accent-soft text-accent" : "border-border bg-panel2 text-muted hover:text-text"
                  )}
                >
                  {language}
                </button>
              ))}
            </div>
            <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint mt-1">Version</div>
            <div data-tour="bible-version" className="flex flex-wrap gap-1.5">
              {state.downloadedTranslations
                .filter((entry) => entry.language === transLang)
                .map((entry) => (
                  <button
                    key={entry.code}
                    onClick={() => patch({ trans: entry.code })}
                    title={entry.name}
                    className={cx(
                      "h-6 px-2.25 rounded-1.5 border font-mono text-[10.5px] cursor-pointer",
                      state.trans === entry.code ? "border-accent bg-accent-soft text-accent" : "border-border bg-panel2 text-muted hover:text-text"
                    )}
                  >
                    {shortTransLabel(entry.code)}
                  </button>
                ))}
            </div>
            <InteractiveButton
              data-tour="bible-import"
              onClick={() => patch({ bibleTranslationsPanelOpen: true })}
              className="flex items-center justify-center gap-1.5 h-7.5 mt-0.5 rounded-2 border border-border bg-panel2 text-muted text-[11.5px] cursor-pointer hover:text-text hover:bg-raise"
            >
              Get more translations →
            </InteractiveButton>
          </div>

          <div className="flex-none flex items-center gap-1 px-2 pt-2 border-b border-border overflow-x-auto">
            {BIBLE_SUB_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => patch({ bibleSubTab: tab.id })}
                className={cx(
                  "flex-none h-6 px-2.5 rounded-full border text-[11px] cursor-pointer mb-2",
                  state.bibleSubTab === tab.id ? "border-accent bg-accent-soft text-text font-semibold" : "border-border bg-panel2 text-muted"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-[10px_10px_20px]">
            {state.bibleSubTab === "browse" && (
              <>
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
                <div data-tour="bible-verse" className="flex flex-col gap-1">
                  {passage.map((verseText, verseIndex) => (
                    <div
                      key={verseIndex}
                      ref={verseIndex === idx ? activeVerseRef : undefined}
                      onClick={() => patch({ idx: verseIndex, black: false, blank: false })}
                      className={cx(
                        "flex gap-2.25 p-[8px_9px] rounded-2.25 cursor-pointer border",
                        verseIndex === idx ? "border-accent bg-accent-soft" : "border-transparent bg-panel2"
                      )}
                    >
                      <span className={cx("font-mono text-[10px] pt-0.75", verseIndex === idx ? "text-accent" : "text-faint")}>
                        {vlabel(verseIndex)}
                      </span>
                      <span className="flex-1 text-[12.5px] leading-normal">{verseText}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {state.bibleSubTab === "compare" && <BibleComparePanel lumen={lumen} />}
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
                data-tour="bible-import"
                onClick={() => patch({ bibleTranslationsPanelOpen: true })}
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
                data-tour="upload"
                onClick={() => patch({ songEditorOpen: true, songEditorMode: "create" })}
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
                    on
                      ? "border-accent bg-accent-soft shadow-[0_0_0_3px_var(--accent-soft)]"
                      : "border-border bg-panel2 shadow-none"
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
                          onClick={(clickEvent) => { clickEvent.stopPropagation(); duplicateSongAsReprise(songEntry.id); }}
                          className="border-none cursor-pointer text-[12px] leading-none p-0.5 text-faint hover:text-text"
                          title="Duplicate as reprise"
                        >
                          ⧉
                        </button>
                        <button
                          onClick={(clickEvent) => { clickEvent.stopPropagation(); toggleFavorite(songEntry.id); }}
                          className={cx("border-none cursor-pointer text-[14px] leading-none p-0.5", fav ? "text-warn" : "text-faint")}
                        >
                          ★
                        </button>
                        {songEntry.id.startsWith("custom-") && (
                          <button
                            onClick={(clickEvent) => {
                              clickEvent.stopPropagation();
                              askConfirm({
                                title: "Delete song?", body: songEntry.title, danger: true,
                                onConfirm: () => deleteSong(songEntry.id),
                              });
                            }}
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
              data-tour="lineup-new"
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
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      askConfirm({ title: "Delete lineup?", body: lineup.name, danger: true, onConfirm: () => deleteLineup(lineup.id) });
                    }}
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
        <LineupDetail
          lumen={lumen}
          lineup={viewingLineup}
          lineupSongs={lineupSongs}
          allSongs={allSongs}
          draggedSongIndex={draggedSongIndex}
          setDraggedSongIndex={setDraggedSongIndex}
          onBack={() => setViewingLineupId(null)}
        />
      )}
    </aside>
  );
}

// Membership editing is drag-and-drop (from the collapsible "All songs"
// library below, or a click-to-add "+") plus an explicit remove ✕ per row —
// LineupModal is only used for *creating* a lineup now (name + checkbox
// picker), not for editing an existing one's membership.
function LineupDetail({
  lumen, lineup, lineupSongs, allSongs, draggedSongIndex, setDraggedSongIndex, onBack,
}: {
  lumen: UseLumen;
  lineup: { id: string; name: string; songIds: string[] };
  lineupSongs: Song[];
  allSongs: Song[];
  draggedSongIndex: number | null;
  setDraggedSongIndex: (index: number | null) => void;
  onBack: () => void;
}) {
  const {
    state, patch, activateLineup, reorderLineupSongs, addSongToLineup, removeSongFromLineup,
    renameLineup, deleteLineup, askConfirm,
  } = lumen;
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(lineup.name);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [draggedLibrarySongId, setDraggedLibrarySongId] = useState<string | null>(null);

  const availableSongs = allSongs.filter((songEntry) => !lineup.songIds.includes(songEntry.id));
  const filteredLibrary = libraryQuery.trim()
    ? availableSongs.filter((songEntry) => (songEntry.title + " " + songEntry.artist).toLowerCase().includes(libraryQuery.trim().toLowerCase()))
    : availableSongs;

  const commitRename = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== lineup.name) renameLineup(lineup.id, trimmed);
    setRenaming(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-[10px_10px_20px]">
      <div className="flex items-center gap-2 p-[4px_6px_12px]">
        <button onClick={onBack} className="border-none cursor-pointer text-[16px] text-muted p-0.5 leading-none" title="Back to lineups">
          ←
        </button>
        <div className="flex-1 min-w-0">
          {renaming ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(changeEvent) => setNameDraft(changeEvent.target.value)}
              onBlur={commitRename}
              onKeyDown={(keyEvent) => { if (keyEvent.key === "Enter") commitRename(); if (keyEvent.key === "Escape") { setNameDraft(lineup.name); setRenaming(false); } }}
              className="w-full h-6.5 px-1.5 rounded-1.5 border border-accent bg-panel2 text-[15px] font-semibold text-text outline-none"
            />
          ) : (
            <button
              onClick={() => { setNameDraft(lineup.name); setRenaming(true); }}
              className="flex items-center gap-1.5 border-none bg-transparent cursor-pointer p-0 text-left"
              title="Rename lineup"
            >
              <span className="text-[15px] font-semibold tracking-[-0.01em] truncate">{lineup.name}</span>
              <span className="text-faint text-[11px]">✎</span>
            </button>
          )}
          <div className="text-[11.5px] text-faint mt-0.5">
            {lineup.songIds.length === 1 ? "1 song" : lineup.songIds.length + " songs"}
            {lineup.songIds.length > 1 && " · drag ⠿ to reorder"}
          </div>
        </div>
        {lineup.id === state.activeLineupId ? (
          <span className="text-[12px] font-semibold text-accent border border-accent rounded-[7px] p-[5px_9px] bg-accent-soft">
            Active
          </span>
        ) : (
          <InteractiveButton
            onClick={() => activateLineup(lineup.id)}
            className="text-[12px] text-white bg-accent border-none rounded-[7px] p-[5px_9px] cursor-pointer hover:brightness-110"
          >
            Activate
          </InteractiveButton>
        )}
        <InteractiveButton
          onClick={() => askConfirm({ title: "Delete lineup?", body: lineup.name, danger: true, onConfirm: () => { deleteLineup(lineup.id); onBack(); } })}
          className="text-[12px] text-danger border border-border rounded-[7px] p-[5px_9px] cursor-pointer hover:text-white hover:bg-danger"
        >
          Delete
        </InteractiveButton>
      </div>

      {lineupSongs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 text-center p-[24px_18px] text-muted">
          <div className="text-[13px] font-semibold text-text">No songs in this lineup</div>
          <div className="text-[12px] leading-normal">Drag songs in from &ldquo;All songs&rdquo; below.</div>
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
                    reorderLineupSongs(lineup.id, draggedSongIndex, lineupSongIndex);
                  } else if (draggedLibrarySongId) {
                    addSongToLineup(lineup.id, draggedLibrarySongId, lineupSongIndex);
                  }
                  setDraggedSongIndex(null);
                  setDraggedLibrarySongId(null);
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
                <button
                  onClick={(clickEvent) => { clickEvent.stopPropagation(); removeSongFromLineup(lineup.id, lineupSong.id); }}
                  className="border-none cursor-pointer text-[12px] leading-none p-0.5 text-faint hover:text-danger"
                  title="Remove from lineup"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div
        onDragOver={(dragEvent) => dragEvent.preventDefault()}
        onDrop={() => {
          if (draggedLibrarySongId) addSongToLineup(lineup.id, draggedLibrarySongId);
          setDraggedLibrarySongId(null);
        }}
        className="mt-4 pt-3 border-t border-border"
      >
        <button
          onClick={() => setLibraryOpen((open) => !open)}
          className="flex items-center gap-1.5 w-full border-none bg-transparent cursor-pointer p-[6px_2px] text-[11px] font-semibold tracking-[.06em] uppercase text-faint"
        >
          <span className={cx("transition-transform", libraryOpen && "rotate-90")}>▸</span>
          All songs — drag or click + to add
        </button>
        {libraryOpen && (
          <div className="flex flex-col gap-1.5 mt-1.5">
            <InteractiveInput
              value={libraryQuery}
              onChange={(changeEvent) => setLibraryQuery(changeEvent.target.value)}
              placeholder="Search songs"
              className="h-7.5 px-2 rounded-2 border border-border bg-panel2 text-[12px] outline-none"
            />
            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
              {filteredLibrary.map((songEntry) => (
                <div
                  key={songEntry.id}
                  draggable
                  onDragStart={() => setDraggedLibrarySongId(songEntry.id)}
                  onDragEnd={() => setDraggedLibrarySongId(null)}
                  className="flex items-center gap-2 p-[7px_8px] rounded-2 border border-border bg-panel2 cursor-grab active:cursor-grabbing"
                >
                  <span className="flex-1 min-w-0 truncate text-[12.5px]">{songEntry.title}</span>
                  <span className="text-[11px] text-muted truncate">{songEntry.artist}</span>
                  <button
                    onClick={() => addSongToLineup(lineup.id, songEntry.id)}
                    className="border-none cursor-pointer text-[12px] text-accent p-0.5 flex-none"
                    title="Add to lineup"
                  >
                    +
                  </button>
                </div>
              ))}
              {filteredLibrary.length === 0 && (
                <div className="text-[11.5px] text-faint p-[8px_2px]">Every song is already in this lineup.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
