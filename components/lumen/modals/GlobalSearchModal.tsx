"use client";

import { useMemo } from "react";
import { InteractiveInput } from "../ui/Interactive";
import { searchAll, type SearchResult } from "../search/globalSearch";
import { useBackdropClose } from "../hooks/useBackdropClose";
import type { UseLumen } from "../useLumen";

const KIND_LABEL: Record<SearchResult["kind"], string> = {
  song: "Song", "bible-book": "Bible", lineup: "Lineup", background: "Background", "slide-note": "Note",
};

export function GlobalSearchModal({ lumen }: { lumen: UseLumen }) {
  const { state, patch, allSongs, bibleBooks, allLooks } = lumen;
  const close = () => patch({ globalSearchOpen: false });
  const backdropProps = useBackdropClose(close);

  const results = useMemo(
    () => searchAll(state.globalSearchQuery, { songs: allSongs, bibleBooks, lineups: state.lineups, looks: allLooks }),
    [state.globalSearchQuery, allSongs, bibleBooks, state.lineups, allLooks]
  );

  if (!state.globalSearchOpen) return null;

  const select = (result: SearchResult) => {
    if (result.kind === "song") {
      patch({ mode: "songs", songId: result.id, idx: 0, globalSearchOpen: false, globalSearchQuery: "" });
    } else if (result.kind === "slide-note") {
      const songId = result.id.split("|")[0];
      patch({ mode: "songs", songId, idx: 0, globalSearchOpen: false, globalSearchQuery: "" });
    } else if (result.kind === "bible-book") {
      patch({ mode: "bible", book: result.id, chapter: 1, idx: 0, globalSearchOpen: false, globalSearchQuery: "" });
    } else if (result.kind === "lineup") {
      const lineup = state.lineups.find((entry) => entry.id === result.id);
      if (lineup) patch({ setIds: lineup.songIds, setName: lineup.name, activeLineupId: lineup.id, mode: "lineups", globalSearchOpen: false, globalSearchQuery: "" });
    } else if (result.kind === "background") {
      patch({ look: result.id, globalSearchOpen: false, globalSearchQuery: "" });
    }
  };

  return (
    <div
      {...backdropProps}
      className="fixed inset-0 z-140 bg-[rgba(6,6,8,.6)] backdrop-blur-[6px] flex items-start justify-center pt-[12vh]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-130 max-w-[92vw] max-h-[60vh] flex flex-col rounded-[18px] border border-border2 bg-panel shadow-app overflow-hidden animate-[fadeUp_.18s_ease_both]"
      >
        <div className="p-3 border-b border-border">
          <InteractiveInput
            autoFocus
            value={state.globalSearchQuery}
            onChange={(changeEvent) => patch({ globalSearchQuery: changeEvent.target.value })}
            placeholder="Search songs, Bible books, lineups, backgrounds…"
            className="w-full h-10 px-3 rounded-2.25 border border-border bg-panel2 text-text text-[14px] outline-none focus:border-accent"
          />
        </div>
        <div className="overflow-y-auto flex-1 p-1.5">
          {state.globalSearchQuery.trim() === "" ? (
            <div className="p-[24px_16px] text-center text-[12.5px] text-muted">Start typing to search everything.</div>
          ) : results.length === 0 ? (
            <div className="p-[24px_16px] text-center text-[12.5px] text-muted">No results for &ldquo;{state.globalSearchQuery}&rdquo;.</div>
          ) : (
            results.map((result) => (
              <button
                key={result.kind + "|" + result.id}
                onClick={() => select(result)}
                className="flex items-center gap-2.5 w-full text-left p-[9px_10px] rounded-2 border-none bg-transparent cursor-pointer hover:bg-panel2"
              >
                <span className="text-[10px] font-mono text-faint border border-border rounded-1.5 px-1.5 py-0.5 flex-none">
                  {KIND_LABEL[result.kind]}
                </span>
                <span className="flex-1 min-w-0 truncate text-[13px] text-text">{result.title}</span>
                {result.subtitle && <span className="text-[11.5px] text-muted truncate flex-none max-w-30">{result.subtitle}</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
