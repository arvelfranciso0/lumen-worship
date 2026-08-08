// Parses and matches Bible references typed into the sidebar search box.

export type BibleQuery = {
  // Book portion of the query; empty when the query is chapter/verse only.
  bookQuery: string;
  chapter: number | null;
  verse: number | null;
  // End of a verse range, or null for a single verse.
  verseEnd: number | null;
};

// Normalizes case, spacing, and punctuation for matching.
function normalize(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

// Parses a typed reference like "John 3:16" into book/chapter/verse parts.
export function parseBibleQuery(query: string): BibleQuery {
  const trimmed = query.trim();
  if (!trimmed) return { bookQuery: "", chapter: null, verse: null, verseEnd: null };
  // Matches an optional book name, chapter, verse, and verse-range end.
  const match = /^(.*?)[\s.]*(\d+)(?:\s*[:.]\s*(\d+)(?:\s*[-–—]\s*(\d+))?)?\s*$/.exec(trimmed);
  if (!match) return { bookQuery: trimmed, chapter: null, verse: null, verseEnd: null };
  return {
    bookQuery: match[1].trim(),
    chapter: Number(match[2]),
    verse: match[3] === undefined ? null : Number(match[3]),
    verseEnd: match[4] === undefined ? null : Number(match[4]),
  };
}

// Filters books matching the query, preferring prefix matches over substring matches.
export function matchBibleBooks<BookType extends { name: string }>(
  books: BookType[], bookQuery: string
): BookType[] {
  const needle = normalize(bookQuery);
  if (!needle) return books;
  const prefixMatches = books.filter((book) => normalize(book.name).startsWith(needle));
  if (prefixMatches.length > 0) return prefixMatches;
  return books.filter((book) => normalize(book.name).includes(needle));
}

// Resolves a parsed query to a navigable book/chapter/verse target, clamping out-of-range values.
export function resolveBibleQueryTarget<
  VerseType extends { number: number },
  ChapterType extends { number: number; verses: VerseType[] },
  BookType extends { name: string; chapters: ChapterType[] },
>(
  books: BookType[], currentBookName: string, query: BibleQuery
): { book: string; chapter: number; verseIndex: number; label: string } | null {
  // Nothing typed means nowhere to go.
  if (!query.bookQuery && query.chapter === null) return null;

  const book = query.bookQuery
    ? matchBibleBooks(books, query.bookQuery)[0]
    : books.find((candidate) => candidate.name === currentBookName);
  if (!book || book.chapters.length === 0) return null;

  const requestedChapter = query.chapter ?? book.chapters[0].number;
  const chapter =
    book.chapters.find((candidate) => candidate.number === requestedChapter)
    ?? book.chapters[book.chapters.length - 1];

  // Looks up the verse index by number rather than assuming index equals number minus one.
  let verseIndex = 0;
  if (query.verse !== null) {
    const found = chapter.verses.findIndex((verse) => verse.number === query.verse);
    verseIndex = found >= 0 ? found : Math.min(Math.max(query.verse - 1, 0), Math.max(chapter.verses.length - 1, 0));
  }
  // Builds the label from the resolved book/chapter/verse, not the raw input.
  const label = book.name + " " + chapter.number
    + (query.verse === null ? "" : ":" + (chapter.verses[verseIndex]?.number ?? query.verse));
  return { book: book.name, chapter: chapter.number, verseIndex, label };
}
