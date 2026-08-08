"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getRepository } from "@/lib/repository";
import type { BibleTranslation } from "../data";

const BIBLE_CACHE_LIMIT = 4;

// Adds a translation to the cache, evicting the least-recently-used entry beyond BIBLE_CACHE_LIMIT (never evicting activeCode).
function withBibleCacheEntry(
  cache: Record<string, BibleTranslation>, code: string, data: BibleTranslation, activeCode: string
): Record<string, BibleTranslation> {
  const { [code]: _evicted, ...rest } = cache;
  const next = { ...rest, [code]: data };
  const evictable = Object.keys(next).filter((key) => key !== code && key !== activeCode);
  while (Object.keys(next).length > BIBLE_CACHE_LIMIT && evictable.length > 0) {
    delete next[evictable.shift() as string];
  }
  return next;
}

// Marks a cached translation as most-recently-used without re-fetching it.
function touchBibleCacheEntry(cache: Record<string, BibleTranslation>, code: string): Record<string, BibleTranslation> {
  const data = cache[code];
  return data ? withBibleCacheEntry(cache, code, data, code) : cache;
}

// In-memory LRU cache of downloaded Bible translations, fetching whichever code is active.
export function useBibleCache(activeCode: string) {
  const [bibleCache, setBibleCache] = useState<Record<string, BibleTranslation>>({});
  const bibleCacheRef = useRef(bibleCache);
  bibleCacheRef.current = bibleCache;
  // Tracks translations not locally imported, distinct from still-loading.
  const [bibleLoadFailed, setBibleLoadFailed] = useState<Record<string, boolean>>({});
  // Bumped by refreshBibleCache to force the lookup effect to re-run.
  const [bibleRefreshTick, setBibleRefreshTick] = useState(0);

  useEffect(() => {
    if (bibleCacheRef.current[activeCode]) {
      setBibleCache((previousCache) => touchBibleCacheEntry(previousCache, activeCode));
      return;
    }
    let cancelled = false;
    getRepository().getBibleTranslationData(activeCode).then((data) => {
      if (cancelled) return;
      if (data) {
        setBibleCache((previousCache) => withBibleCacheEntry(previousCache, activeCode, data, activeCode));
        setBibleLoadFailed((previous) => (previous[activeCode] ? { ...previous, [activeCode]: false } : previous));
        return;
      }
      setBibleLoadFailed((previous) => ({ ...previous, [activeCode]: true }));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [activeCode, bibleRefreshTick]);

  // Inserts or replaces a translation in the cache, e.g. after importing it.
  const cacheTranslation = useCallback((code: string, data: BibleTranslation, activeCodeForEviction: string) => {
    setBibleCache((previousCache) => withBibleCacheEntry(previousCache, code, data, activeCodeForEviction));
  }, []);

  const clearLoadFailed = useCallback((code: string) => {
    setBibleLoadFailed((previous) => (previous[code] ? { ...previous, [code]: false } : previous));
  }, []);

  // Drops a translation from the cache, e.g. after removing it from disk.
  const evictTranslation = useCallback((code: string) => {
    setBibleCache((previousCache) => {
      const { [code]: _removed, ...rest } = previousCache;
      return rest;
    });
  }, []);

  const refreshBibleCache = useCallback(() => setBibleRefreshTick((tick) => tick + 1), []);

  return { bibleCache, bibleLoadFailed, cacheTranslation, clearLoadFailed, evictTranslation, refreshBibleCache };
}
