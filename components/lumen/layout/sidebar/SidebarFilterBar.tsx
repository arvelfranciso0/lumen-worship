"use client";

import { useMemo } from "react";
import { CHIPS, SORTS } from "../../data";
import { InteractiveButton, InteractiveInput } from "../../ui/Interactive";
import type { UseLumen } from "../../useLumen";

type BibleTarget = { book: string; chapter: number; verseIndex: number; label: string } | null;

type SidebarFilterBarProps = {
  lumen: UseLumen;
  bible: boolean;
  bibleTarget: BibleTarget;
  onGoToBibleQuery: () => void;
  hasBibleTranslations: boolean;
  resultCount: string;
};

// Search box, Bible-reference shortcut, song category chips, and sort/result count.
export function SidebarFilterBar({
  lumen, bible, bibleTarget, onGoToBibleQuery, hasBibleTranslations, resultCount,
}: SidebarFilterBarProps) {
  const { state, patch, chipBase, allSongs } = lumen;

  // Filter chips: curated categories first, then other song categories alphabetically.
  const songFilterChips = useMemo(() => {
    const curated = CHIPS.slice(2);
    const discovered = Array.from(new Set(allSongs.map((songEntry) => songEntry.cat).filter(Boolean)))
      .filter((cat) => !curated.includes(cat))
      .sort();
    return [...CHIPS.slice(0, 2), ...curated, ...discovered];
  }, [allSongs]);

  return (
    <>
      <div data-tour="search" className="relative flex items-center">
        <span className="absolute left-2.75 text-[13px] text-faint">⌕</span>
        <InteractiveInput
          value={state.query}
          onChange={(changeEvent) => patch({ query: changeEvent.target.value })}
          onKeyDown={bible ? (keyEvent) => { if (keyEvent.key === "Enter") onGoToBibleQuery(); } : undefined}
          placeholder={bible ? "Go to reference — e.g. John 3:16" : "Search songs, lyrics, tags"}
          className="w-full h-9 p-[0_44px_0_28px] rounded-[10px] border border-border bg-panel2 text-[13px] outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]"
        />
        <span className="absolute right-2.5 font-mono text-[10px] text-faint border border-border rounded-[5px] p-[2px_5px]">⌘K</span>
      </div>

      {/* Shows the resolved Bible reference as a clickable row. */}
      {bible && bibleTarget && (
        <InteractiveButton
          onClick={onGoToBibleQuery}
          className="flex items-center gap-2 h-8 px-2.5 rounded-2 border border-accent bg-accent-soft text-[12px] text-text cursor-pointer text-left"
        >
          <span className="text-accent flex-none">↵</span>
          <span className="truncate">Go to <strong className="font-semibold">{bibleTarget.label}</strong></span>
        </InteractiveButton>
      )}

      {!bible && (
        <div className="flex flex-wrap gap-1.5">
          {songFilterChips.map((chip) => (
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
        </div>
      )}
    </>
  );
}
