"use client";

import { useEffect, useState } from "react";
import { getRepository } from "@/lib/repository";
import type { BibleTranslation } from "../data";

// Max number of compare translations kept cached at once.
const COMPARE_CACHE_LIMIT = 2;

// Evicts the oldest entry once the cache exceeds COMPARE_CACHE_LIMIT.
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

// Fetches and caches a translation independently of useLumen's own bibleCache.
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
