"use client";

import { useEffect, useState } from "react";
import { getRepository } from "@/lib/repository";
import type { BibleTranslation } from "./data";

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
      setCache((previous) => ({ ...previous, [code]: data }));
    }).catch(() => {
      if (!cancelled) setCache((previous) => ({ ...previous, [code]: null }));
    });
    return () => { cancelled = true; };
  }, [code, cache]);

  return code ? cache[code] : null;
}
