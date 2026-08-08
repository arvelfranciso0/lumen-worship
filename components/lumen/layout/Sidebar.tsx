"use client";

import { useEffect, useMemo } from "react";
import { matchBibleBooks, parseBibleQuery, resolveBibleQueryTarget } from "../bible/bibleSearch";
import { cx } from "../cx";
import type { UseLumen } from "../useLumen";
import type { Breakpoint } from "../hooks/useViewportBreakpoint";
import { BibleBrowser } from "./sidebar/BibleBrowser";
import { LineupDetail } from "./sidebar/LineupDetail";
import { LineupList } from "./sidebar/LineupList";
import { SidebarFilterBar } from "./sidebar/SidebarFilterBar";
import { SidebarTabSwitcher } from "./sidebar/SidebarTabSwitcher";
import { SongList } from "./sidebar/SongList";

export function Sidebar({ lumen, breakpoint }: { lumen: UseLumen; breakpoint: Breakpoint }) {
  const { state, patch, bible, list, tabStyle, passage, bibleBooks } = lumen;

  const lineupsMode = state.mode === "lineups";

  // Clears the viewed lineup id when leaving lineups mode.
  useEffect(() => {
    if (!lineupsMode) patch({ viewingLineupId: null });
  }, [lineupsMode, patch]);

  const viewingLineup = state.lineups.find((lineup) => lineup.id === state.viewingLineupId) || null;
  const hasBibleTranslations = state.downloadedTranslations.length > 0;

  // Parses the search query as a Bible reference for filtering/navigation.
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
      // Switches back to the Browse tab.
      bibleSubTab: "browse",
    });
  };

  const resultCount = bible
    ? (bibleQuery.bookQuery && visibleBibleBooks.length !== bibleBooks.length
      ? visibleBibleBooks.length + " books"
      : passage.length + " verses")
    : list.length + " songs";

  return (
    // Sidebar width is only draggable on desktop.
    <aside
      className={cx(
        "bg-panel flex flex-col min-h-0 overflow-hidden",
        breakpoint === "mobile" ? "flex-1 w-full" : "flex-none",
        // Desktop gets its divider from the resize handle, not a border.
        breakpoint !== "desktop" && "border-r border-border"
      )}
      style={breakpoint === "desktop" ? { width: state.layoutSizes.sidebarWidth } : breakpoint === "tablet" ? { width: 320, maxWidth: "85vw" } : undefined}
    >
      <div className="p-[14px_14px_10px] flex flex-col gap-2.5 border-b border-border">
        <SidebarTabSwitcher mode={state.mode} patch={patch} tabStyle={tabStyle} />

        {!lineupsMode && (
          <SidebarFilterBar
            lumen={lumen}
            bible={bible}
            bibleTarget={bibleTarget}
            onGoToBibleQuery={goToBibleQuery}
            hasBibleTranslations={hasBibleTranslations}
            resultCount={resultCount}
          />
        )}
      </div>

      {bible && (
        <BibleBrowser lumen={lumen} hasBibleTranslations={hasBibleTranslations} visibleBibleBooks={visibleBibleBooks} />
      )}

      {state.mode === "songs" && <SongList lumen={lumen} />}

      {lineupsMode && !viewingLineup && <LineupList lumen={lumen} />}

      {lineupsMode && viewingLineup && (
        <LineupDetail lumen={lumen} lineup={viewingLineup} onBack={() => patch({ viewingLineupId: null })} />
      )}
    </aside>
  );
}
