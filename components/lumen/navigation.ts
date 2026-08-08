import type { BibleBook, BibleVerse } from "./data";

// Boundary rules for where Next/Previous land or refuse to move.

export type VersePosition = { book: string; chapter: number; verseIndex: number };

// The blank position immediately before the first slide; `slideCount` is the one immediately after the last.
export const PAST_START_INDEX = -1;

export type DeckStep =
  // A real slide inside the deck.
  | { kind: "index"; idx: number }
  // Off the end of the deck; the caller may continue into the next chapter/book/song.
  | { kind: "cross"; overflowIndex: number }
  // Already on the overflow position in this direction.
  | { kind: "hold" };

// Where one step lands relative to the current deck, before any cross-item continuation.
export function resolveDeckStep(currentIndex: number, slideCount: number, direction: number): DeckStep {
  const clamped = Math.min(Math.max(currentIndex, PAST_START_INDEX), slideCount);
  const next = clamped + (direction > 0 ? 1 : -1);
  if (next >= 0 && next < slideCount) return { kind: "index", idx: next };
  if (next < PAST_START_INDEX || next > slideCount) return { kind: "hold" };
  return { kind: "cross", overflowIndex: direction > 0 ? slideCount : PAST_START_INDEX };
}

// Display label for a verse: a plain number, or a range for a verse bridge.
export function formatVerseLabel(verse: BibleVerse): string {
  return verse.endNumber && verse.endNumber !== verse.number ? verse.number + "-" + verse.endNumber : String(verse.number);
}

// Chapters are stepped by list position, not number + 1, so a missing chapter doesn't skip the rest of the book.
export function resolveNextVerse(
  bibleBooks: BibleBook[], bookName: string, chapterNumber: number, verseIndex: number
): VersePosition | null {
  const bookIndex = bibleBooks.findIndex((book) => book.name === bookName);
  if (bookIndex === -1) return null;
  const currentBook = bibleBooks[bookIndex];
  const chapterIndex = currentBook.chapters.findIndex((chapter) => chapter.number === chapterNumber);
  if (chapterIndex === -1) return null;
  if (verseIndex + 1 < currentBook.chapters[chapterIndex].verses.length) {
    return { book: bookName, chapter: chapterNumber, verseIndex: verseIndex + 1 };
  }
  const nextChapter = currentBook.chapters[chapterIndex + 1];
  if (nextChapter) return { book: bookName, chapter: nextChapter.number, verseIndex: 0 };
  const nextBook = bibleBooks[bookIndex + 1];
  if (nextBook?.chapters[0]) return { book: nextBook.name, chapter: nextBook.chapters[0].number, verseIndex: 0 };
  // Past the last verse of the last book — the caller must not move.
  return null;
}

// Mirror of resolveNextVerse, stepping back to the previous chapter/book.
export function resolvePreviousVerse(
  bibleBooks: BibleBook[], bookName: string, chapterNumber: number, verseIndex: number
): VersePosition | null {
  const bookIndex = bibleBooks.findIndex((book) => book.name === bookName);
  if (bookIndex === -1) return null;
  const currentBook = bibleBooks[bookIndex];
  const chapterIndex = currentBook.chapters.findIndex((chapter) => chapter.number === chapterNumber);
  if (chapterIndex === -1) return null;
  if (verseIndex > 0) return { book: bookName, chapter: chapterNumber, verseIndex: verseIndex - 1 };
  const previousChapter = currentBook.chapters[chapterIndex - 1];
  if (previousChapter) {
    return { book: bookName, chapter: previousChapter.number, verseIndex: Math.max(0, previousChapter.verses.length - 1) };
  }
  const previousBook = bibleBooks[bookIndex - 1];
  const lastChapter = previousBook?.chapters[previousBook.chapters.length - 1];
  if (previousBook && lastChapter) {
    return { book: previousBook.name, chapter: lastChapter.number, verseIndex: Math.max(0, lastChapter.verses.length - 1) };
  }
  return null;
}

// Only ever called for the Lineups tab.
export function resolveAdjacentSetSong(
  setIds: string[], currentSongId: string, direction: number, sectionCountOf: (songId: string) => number
): { songId: string; idx: number } | null {
  const setIndex = setIds.indexOf(currentSongId);
  if (setIndex === -1) return null;
  const neighbourIndex = setIndex + (direction > 0 ? 1 : -1);
  const neighbourId = setIds[neighbourIndex];
  if (neighbourId === undefined) return null;
  const sectionCount = sectionCountOf(neighbourId);
  if (sectionCount <= 0) return null;
  // Forward lands on the neighbour's first slide, backward on its last.
  return { songId: neighbourId, idx: direction > 0 ? 0 : sectionCount - 1 };
}
