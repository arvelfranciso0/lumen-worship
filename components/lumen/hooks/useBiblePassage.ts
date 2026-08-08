"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  canonicalBookNumber, findBookAcrossTranslations, LOADING_PASSAGE, MISSING_PASSAGE, NOT_DOWNLOADED_PASSAGE,
  bookNumberOf, resolveCompareTranslation, type BibleTranslation,
} from "../data";
import { formatVerseLabel } from "../song/navigation";
import type { LumenState } from "../lumenState";
import { useBibleTranslation } from "./useBibleTranslation";
import type { PatchFn } from "./useUndoRedoHistory";

// Resolves the active book/chapter/passage/compare-translation for the Bible tab.
export function useBiblePassage(
  state: LumenState, patch: PatchFn<LumenState>,
  bibleCache: Record<string, BibleTranslation>, bibleLoadFailed: Record<string, boolean>
) {
  const translation = bibleCache[state.trans];
  const bibleBooks = useMemo(() => translation?.books ?? [], [translation]);
  // Language this translation's book names are keyed to.
  const bibleLanguage = translation?.meta.language;
  const currentTransMeta = useMemo(
    () => state.downloadedTranslations.find((entry) => entry.code === state.trans),
    [state.downloadedTranslations, state.trans]
  );

  const currentBook = useMemo(() => bibleBooks.find((book) => book.name === state.book), [bibleBooks, state.book]);
  const currentChapter = useMemo(
    () => currentBook?.chapters.find((chapter) => chapter.number === state.chapter),
    [currentBook, state.chapter]
  );
  const passage = useMemo(() => {
    if (!translation) return bibleLoadFailed[state.trans] ? NOT_DOWNLOADED_PASSAGE : LOADING_PASSAGE;
    return currentChapter ? currentChapter.verses.map((verse) => verse.text) : MISSING_PASSAGE;
  }, [translation, currentChapter, bibleLoadFailed, state.trans]);

  // Re-maps the selected book by canonical number when switching translations.
  useEffect(() => {
    if (!translation || bibleBooks.length === 0 || currentBook) return;
    const bookNumber = canonicalBookNumber(state.book);
    const replacement = (bookNumber !== null && bibleBooks.find((book) => book.number === bookNumber)) || bibleBooks[0];
    if (!replacement || replacement.name === state.book) return;
    patch({ book: replacement.name, chapter: 1, idx: 0 });
  }, [translation, bibleBooks, currentBook, state.book, patch]);

  const vnum = useCallback((verseIndex: number) => currentChapter?.verses[verseIndex]?.number ?? verseIndex + 1, [currentChapter]);
  // Display label for a verse: a plain number, or a range for a verse bridge.
  const vlabel = useCallback((verseIndex: number) => {
    const verse = currentChapter?.verses[verseIndex];
    return verse ? formatVerseLabel(verse) : String(verseIndex + 1);
  }, [currentChapter]);

  // Resolves the second translation for Bible Compare, re-validated against current state.
  const compareTranslationBCode = useMemo(
    () => resolveCompareTranslation(
      state.compareMode?.translationB,
      state.trans,
      state.downloadedTranslations.map((entry) => entry.code)
    ),
    [state.compareMode, state.trans, state.downloadedTranslations]
  );

  // Clears compareMode once it can no longer be honoured.
  useEffect(() => {
    if (!state.compareMode || compareTranslationBCode) return;
    patch({ compareMode: null });
  }, [state.compareMode, compareTranslationBCode, patch]);

  const compareTranslationB = useBibleTranslation(compareTranslationBCode);

  // Looks up the compared translation's wording for any verse position.
  const compareTextAt = useCallback((bookName: string, chapterNumber: number, verseIndex: number): string | null => {
    if (!compareTranslationBCode || !compareTranslationB) return null;
    // Matches by canonical book number since translations may use different book names.
    const bookB = findBookAcrossTranslations(compareTranslationB.books, bookNumberOf(bibleBooks, bookName), bookName);
    const chapterB = bookB?.chapters.find((entry) => entry.number === chapterNumber);
    return chapterB?.verses[verseIndex]?.text ?? null;
  }, [compareTranslationBCode, compareTranslationB, bibleBooks]);

  return {
    translation, bibleBooks, bibleLanguage, currentTransMeta, currentBook, currentChapter, passage,
    vnum, vlabel, compareTranslationBCode, compareTranslationB, compareTextAt,
  };
}
