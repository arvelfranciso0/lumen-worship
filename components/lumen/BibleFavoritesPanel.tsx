"use client";

import { useEffect, useState } from "react";
import { getRepository } from "@/lib/repository";
import type { BibleTranslation } from "./data";
import type { UseLumen } from "./useLumen";

// state.bibleFavorites is keyed like bibleHighlightKey
// (translation|book|chapter|verse) but is a wholly separate store from the
// per-character-range highlight feature — no interaction between the two.
export function BibleFavoritesPanel({ lumen }: { lumen: UseLumen }) {
  const { state, patch, toggleBibleFavorite } = lumen;
  const favoriteKeys = Object.keys(state.bibleFavorites).filter((key) => state.bibleFavorites[key]);

  // Resolves verse text lazily from whichever translations these favorites
  // reference — most will already be lumen's own bibleCache-loaded
  // translation, but a favorite from a different translation needs its own
  // fetch, kept local to this panel (same pattern as useBibleTranslation).
  const [cache, setCache] = useState<Record<string, BibleTranslation | null>>({});
  const neededCodes = Array.from(new Set(favoriteKeys.map((key) => key.split("|")[0])));
  useEffect(() => {
    for (const code of neededCodes) {
      if (code in cache) continue;
      getRepository().getBibleTranslationData(code).then((data) => {
        setCache((previous) => ({ ...previous, [code]: data }));
      }).catch(() => setCache((previous) => ({ ...previous, [code]: null })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [neededCodes.join(",")]);

  if (favoriteKeys.length === 0) {
    return <div className="text-[12px] text-faint p-[10px_6px]">No favorite verses yet — star a verse to save it here.</div>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {favoriteKeys.map((key) => {
        const [code, book, chapter, verse] = key.split("|");
        const translation = cache[code];
        const verseText = translation?.books
          .find((b) => b.name === book)?.chapters.find((c) => c.number === Number(chapter))
          ?.verses.find((v) => v.number === Number(verse))?.text;
        return (
          <div key={key} className="flex gap-2 items-start p-[8px_9px] rounded-2.25 border border-border bg-panel2">
            <button
              onClick={() => patch({ trans: code, book, chapter: Number(chapter), idx: 0, black: false, blank: false, bibleSubTab: "browse" })}
              className="flex-1 min-w-0 text-left border-none bg-transparent cursor-pointer p-0"
            >
              <div className="text-[11px] font-mono text-accent">{book} {chapter}:{verse}</div>
              <div className="text-[11.5px] text-muted mt-0.5 line-clamp-2">{verseText || "Loading…"}</div>
            </button>
            <button
              onClick={() => toggleBibleFavorite(key)}
              title="Remove favorite"
              className="border-none bg-transparent cursor-pointer text-[12px] text-warn flex-none"
            >
              ★
            </button>
          </div>
        );
      })}
    </div>
  );
}
