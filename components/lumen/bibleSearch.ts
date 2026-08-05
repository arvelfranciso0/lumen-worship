// Reference parsing and book matching for the Bible sidebar's search box.
//
// The box has always written state.query, but in Bible mode nothing read it —
// the book list rendered every book regardless, so typing did nothing at all
// despite the placeholder promising "Go to reference — e.g. John 3:16". These
// are the pure pieces of making it work; Sidebar.tsx wires them to the list and
// to Enter.

export type BibleQuery = {
  // The book portion, as typed. Empty when the query is only a chapter/verse
  // ("3:16"), which reads as a jump within the book already open.
  bookQuery: string;
  chapter: number | null;
  verse: number | null;
  // The end of a verse range ("13:4-7"), or null for a single verse. The deck
  // presents one verse per slide, so a range navigates to its first verse —
  // what this field really buys is that the "-7" no longer gets swallowed into
  // the book name and breaks the whole match.
  verseEnd: number | null;
};

// Folds away the differences that shouldn't affect a match: case, spacing and
// punctuation. "1 John", "1john" and "1 jn." all normalize to a common shape,
// so an operator typing quickly mid-service still lands on the right book.
function normalize(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

// "John 3:16" -> { bookQuery: "John", chapter: 3, verse: 16 }
// "1 Cor 13"  -> { bookQuery: "1 Cor", chapter: 13, verse: null }
// "gen"       -> { bookQuery: "gen", chapter: null, verse: null }
// "3:16"      -> { bookQuery: "", chapter: 3, verse: 16 }
//
// The trailing-number match is deliberately anchored to the end, so a leading
// number stays part of the book name: "1 John" is the book, not chapter 1.
export function parseBibleQuery(query: string): BibleQuery {
  const trimmed = query.trim();
  if (!trimmed) return { bookQuery: "", chapter: null, verse: null, verseEnd: null };
  // Trailing range is matched before the plain verse, so "13:4-7" doesn't end
  // with the parser treating "1 Corinthians 13:4-" as a book name and "7" as the
  // chapter — which matched no book at all and made the whole query look dead.
  const match = /^(.*?)[\s.]*(\d+)(?:\s*[:.]\s*(\d+)(?:\s*[-–—]\s*(\d+))?)?\s*$/.exec(trimmed);
  if (!match) return { bookQuery: trimmed, chapter: null, verse: null, verseEnd: null };
  return {
    bookQuery: match[1].trim(),
    chapter: Number(match[2]),
    verse: match[3] === undefined ? null : Number(match[3]),
    verseEnd: match[4] === undefined ? null : Number(match[4]),
  };
}

// Books whose name matches the typed book portion. Prefix matches win outright
// when there are any — typing "jo" should offer John before Song of Solomon,
// rather than burying it in everything that merely contains those letters.
export function matchBibleBooks<BookType extends { name: string }>(
  books: BookType[], bookQuery: string
): BookType[] {
  const needle = normalize(bookQuery);
  if (!needle) return books;
  const prefixMatches = books.filter((book) => normalize(book.name).startsWith(needle));
  if (prefixMatches.length > 0) return prefixMatches;
  return books.filter((book) => normalize(book.name).includes(needle));
}

// Where Enter should navigate to, or null when the query names nothing that
// exists. Chapter and verse are clamped into the book rather than rejected, so
// "John 99" opens John's last chapter instead of refusing to move.
export function resolveBibleQueryTarget<
  VerseType extends { number: number },
  ChapterType extends { number: number; verses: VerseType[] },
  BookType extends { name: string; chapters: ChapterType[] },
>(
  books: BookType[], currentBookName: string, query: BibleQuery
): { book: string; chapter: number; verseIndex: number; label: string } | null {
  // An empty box asks for nothing — without this, "no query" would resolve to
  // the open book's first verse and the UI would offer to "go" there always.
  if (!query.bookQuery && query.chapter === null) return null;

  const book = query.bookQuery
    ? matchBibleBooks(books, query.bookQuery)[0]
    : books.find((candidate) => candidate.name === currentBookName);
  if (!book || book.chapters.length === 0) return null;

  const requestedChapter = query.chapter ?? book.chapters[0].number;
  const chapter =
    book.chapters.find((candidate) => candidate.number === requestedChapter)
    ?? book.chapters[book.chapters.length - 1];

  // Verse numbers aren't always their own index — a verse bridge ("1-3")
  // occupies one entry covering several numbers — so look the number up rather
  // than subtracting one from it.
  let verseIndex = 0;
  if (query.verse !== null) {
    const found = chapter.verses.findIndex((verse) => verse.number === query.verse);
    verseIndex = found >= 0 ? found : Math.min(Math.max(query.verse - 1, 0), Math.max(chapter.verses.length - 1, 0));
  }
  // Built from what actually resolved, not from what was typed — so the UI can
  // show "Genesis 1:1" for "gen 1:1", and show the clamped chapter when the
  // query overshot the end of the book.
  const label = book.name + " " + chapter.number
    + (query.verse === null ? "" : ":" + (chapter.verses[verseIndex]?.number ?? query.verse));
  return { book: book.name, chapter: chapter.number, verseIndex, label };
}
