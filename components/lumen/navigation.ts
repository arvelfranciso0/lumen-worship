import type { BibleBook, BibleVerse } from "./data";

// Where Next/Previous land, and — just as importantly — where they refuse to
// move. Every one of these is a pure function of the data it's given, split out
// of useLumen so the boundary rules can be tested directly: an off-by-one here
// is the difference between stopping at Revelation 22:21 and stepping into an
// empty slide mid-service.
//
// The rules, in one place:
//   - Scripture flows across chapter and book boundaries.
//   - In the Lineups tab a song flows into its neighbour in the running set.
//   - In the Songs tab a song never flows anywhere: it is self-contained, even
//     when it also happens to be in the set.
//
// Where no crossing applies the caller lands on a blank overflow position
// bracketing the deck (see PAST_START_INDEX / slideCount in useLumen) rather
// than refusing to move — that empty output is what reports the end, and only a
// step from there is a no-op.

export type VersePosition = { book: string; chapter: number; verseIndex: number };

// The blank position immediately before the first slide; `slideCount` is the one
// immediately after the last. Together they bracket the deck with the two
// navigable empty states.
export const PAST_START_INDEX = -1;

export type DeckStep =
  // A real slide inside the deck.
  | { kind: "index"; idx: number }
  // Off the end of the deck: the caller may continue into the next
  // chapter/book/song, and lands on `overflowIndex` when it can't.
  | { kind: "cross"; overflowIndex: number }
  // Already on the overflow position in this direction — nothing further exists.
  | { kind: "hold" };

// Where one step lands relative to the current deck, before any cross-item
// continuation is considered. Split out and tested because the exact moment a
// step stops being possible is what drives the transport buttons' disabled
// state, and being one off there either strands the operator on the last verse
// or lets Next run on forever.
export function resolveDeckStep(currentIndex: number, slideCount: number, direction: number): DeckStep {
  const clamped = Math.min(Math.max(currentIndex, PAST_START_INDEX), slideCount);
  const next = clamped + (direction > 0 ? 1 : -1);
  if (next >= 0 && next < slideCount) return { kind: "index", idx: next };
  if (next < PAST_START_INDEX || next > slideCount) return { kind: "hold" };
  return { kind: "cross", overflowIndex: direction > 0 ? slideCount : PAST_START_INDEX };
}

// Display label for a verse — a plain number normally, or a range ("1-3") for a
// verse bridge (see BibleVerse.endNumber).
export function formatVerseLabel(verse: BibleVerse): string {
  return verse.endNumber && verse.endNumber !== verse.number ? verse.number + "-" + verse.endNumber : String(verse.number);
}

// Chapters are stepped by position in the list rather than by number + 1: a
// partially-converted translation can be missing a chapter, and number
// arithmetic would silently skip the whole rest of the book in that case.
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

// Mirror of resolveNextVerse: stepping back before a chapter's first verse lands
// on the previous chapter's last verse, and before a book's first chapter on the
// previous book's last verse — down to Genesis 1:1, before which this returns
// null.
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

// Only ever called for the Lineups tab — the Songs tab has no continuation at
// all, which is enforced by go() not calling this rather than by anything here.
//
// `sectionCountOf` has to be passed in because a song's slide count depends on
// its lyric override, not just its stored sections.
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
  // Forward lands on the neighbour's first slide, backward on its last, so
  // stepping across a boundary and immediately back returns you where you were.
  return { songId: neighbourId, idx: direction > 0 ? 0 : sectionCount - 1 };
}
