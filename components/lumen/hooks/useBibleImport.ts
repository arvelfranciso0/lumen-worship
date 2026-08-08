"use client";

import { useCallback, useState } from "react";
import { getRepository } from "@/lib/repository";
import { normalizeBibleLanguage, parseBibleXml } from "../../../electron/bibleXml.js";
import { BIBLE_DOWNLOADS_URL, type BibleTranslation } from "../data";
import { getElectronShell } from "../electron-bridges/electronShell";
import type { LumenState } from "../lumenState";
import type { PatchFn } from "./useUndoRedoHistory";

export type BibleCacheActions = {
  cacheTranslation: (code: string, data: BibleTranslation, activeCodeForEviction: string) => void;
  clearLoadFailed: (code: string) => void;
  evictTranslation: (code: string) => void;
  refreshBibleCache: () => void;
};

// Imports/removes downloaded Bible translation files, keeping the in-memory cache in sync.
export function useBibleImport(patch: PatchFn<LumenState>, activeTranslationCode: string, bibleCacheActions: BibleCacheActions) {
  const { cacheTranslation, clearLoadFailed, evictTranslation, refreshBibleCache } = bibleCacheActions;
  const [bibleImportError, setBibleImportError] = useState<string | null>(null);

  // Imports a Bible translation file (JSON or XML, detected by content) downloaded from BIBLE_DOWNLOADS_URL.
  const importBibleTranslation = useCallback(async (file: File) => {
    setBibleImportError(null);
    const text = await file.text();
    let parsed: BibleTranslation;
    let format: "json" | "xml";
    try {
      parsed = JSON.parse(text);
      format = "json";
    } catch {
      // Falls back to file.name for files with no code/id of their own.
      parsed = parseBibleXml(text, file.name) as BibleTranslation;
      format = "xml";
    }
    if (!parsed?.meta?.code || !parsed?.meta?.name || !Array.isArray(parsed?.books) || parsed.books.length === 0) {
      setBibleImportError(file.name + " doesn't look like a Bible translation file.");
      return;
    }
    const { code, name } = parsed.meta;
    // Re-normalizes language here since the JSON import path doesn't go through parseBibleXml.
    const language = normalizeBibleLanguage(parsed.meta.language, name);
    const license = parsed.meta.license || "";
    const link = parsed.meta.link ?? null;
    const data = await file.arrayBuffer();
    getRepository().addBibleTranslation({ code, language, name, license, link, data, format });
    patch((previousState) => {
      // The first import lands on a real translation; later imports leave the live position alone.
      const isFirstImport = previousState.downloadedTranslations.length === 0;
      const firstBook = parsed.books[0];
      return {
        downloadedTranslations: [
          { code, language, name, license, link, downloadedAt: Date.now(), sizeBytes: data.byteLength },
          ...previousState.downloadedTranslations.filter((entry) => entry.code !== code),
        ],
        // Starts at the file's own first book, not a hardcoded Genesis.
        ...(isFirstImport && firstBook
          ? {
            trans: code,
            book: firstBook.name,
            chapter: firstBook.chapters[0]?.number ?? 1,
            idx: 0,
            black: false,
            blank: false,
          }
          : {}),
      };
    });
    cacheTranslation(code, parsed, activeTranslationCode);
    clearLoadFailed(code);
  }, [patch, activeTranslationCode, cacheTranslation, clearLoadFailed]);

  const removeBibleTranslation = useCallback((code: string) => {
    getRepository().deleteBibleTranslation(code);
    patch((previousState) => ({
      downloadedTranslations: previousState.downloadedTranslations.filter((entry) => entry.code !== code),
    }));
    evictTranslation(code);
    refreshBibleCache();
  }, [patch, evictTranslation, refreshBibleCache]);

  const openBibleDownloadsPage = useCallback(() => {
    const electronShell = getElectronShell();
    if (electronShell) electronShell.openExternal(BIBLE_DOWNLOADS_URL);
    else window.open(BIBLE_DOWNLOADS_URL, "_blank", "noopener,noreferrer");
  }, []);

  return { bibleImportError, importBibleTranslation, removeBibleTranslation, openBibleDownloadsPage };
}
