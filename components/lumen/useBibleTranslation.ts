"use client";

import { useEffect, useState } from "react";
import { getRepository } from "@/lib/repository";
import type { BibleTranslation } from "./data";

// Kept small and separate from useLumen's own BIBLE_CACHE_LIMIT: this cache
// only ever needs the one translation currently being compared against, plus
// a little slack so flipping Compare between two or three recently-used
// translations doesn't re-fetch/re-parse every time.
const COMPARE_CACHE_LIMIT = 2;

// Evicts oldest entries once the cache exceeds COMPARE_CACHE_LIMIT, mirroring
// useLumen's withBibleCacheEntry — without this, a long live-service session
// that compares against several different translations over time accumulates
// every one of them fully parsed in memory, unbounded, for as long as the app
// stays open. `code` is exempted so the entry a caller just requested is
// never the one evicted to make room for itself.
function withCompareCacheEntry(
  cache: Record<string, BibleTranslation | null>, code: string, data: BibleTranslation | null
): Record<string, BibleTranslation | null> {
  const { [code]: _evicted, ...rest } = cache;
  const next = { ...rest, [code]: data };
  const evictable = Object.keys(next).filter((key) => key !== code);
  while (Object.keys(next).length > COMPARE_CACHE_LIMIT && evictable.length > 0) {
    delete next[evictable.shift() as string];
  }
  return next;
}

// Standalone translation fetch/cache, independent of useLumen's own
// bibleCache (which is reserved for the primary/live translation and must
// never be evicted while active — see withBibleCacheEntry there). Used by
// BibleComparePanel to load a second translation's verse data without
// touching that cache at all. undefined = loading, null = failed/not
// found, BibleTranslation = loaded.
export function useBibleTranslation(code: string | null): BibleTranslation | null | undefined {
  const [cache, setCache] = useState<Record<string, BibleTranslation | null>>({});

  useEffect(() => {
    if (!code || code in cache) return;
    let cancelled = false;
    getRepository().getBibleTranslationData(code).then((data) => {
      if (cancelled) return;
      setCache((previous) => withCompareCacheEntry(previous, code, data));
    }).catch(() => {
      if (!cancelled) setCache((previous) => withCompareCacheEntry(previous, code, null));
    });
    return () => { cancelled = true; };
  }, [code, cache]);

  return code ? cache[code] : null;
}
