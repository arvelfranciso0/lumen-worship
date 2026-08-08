import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { matchBibleBooks, parseBibleQuery, resolveBibleQueryTarget } from "./bibleSearch.ts";

const BOOKS = [
  { name: "Genesis", chapters: [{ number: 1, verses: [{ number: 1 }, { number: 2 }, { number: 3 }] }] },
  { name: "Job", chapters: [{ number: 1, verses: [{ number: 1 }] }] },
  { name: "John", chapters: [
    { number: 1, verses: [{ number: 1 }] },
    { number: 3, verses: [{ number: 15 }, { number: 16 }, { number: 17 }] },
  ] },
  { name: "1 John", chapters: [{ number: 1, verses: [{ number: 1 }] }] },
  { name: "Song of Solomon", chapters: [{ number: 1, verses: [{ number: 1 }] }] },
];

describe("parseBibleQuery", () => {
  test("splits book, chapter and verse", () => {
    assert.deepEqual(parseBibleQuery("John 3:16"), { bookQuery: "John", chapter: 3, verse: 16, verseEnd: null });
  });

  test("keeps a leading number as part of the book name", () => {
    assert.deepEqual(parseBibleQuery("1 John"), { bookQuery: "1 John", chapter: null, verse: null, verseEnd: null });
    assert.deepEqual(parseBibleQuery("1 Cor 13"), { bookQuery: "1 Cor", chapter: 13, verse: null, verseEnd: null });
  });

  test("accepts a bare book name", () => {
    assert.deepEqual(parseBibleQuery("gen"), { bookQuery: "gen", chapter: null, verse: null, verseEnd: null });
  });

  test("accepts a chapter:verse with no book — a jump within the open book", () => {
    assert.deepEqual(parseBibleQuery("3:16"), { bookQuery: "", chapter: 3, verse: 16, verseEnd: null });
  });

  test("tolerates a period as the chapter/verse separator", () => {
    assert.deepEqual(parseBibleQuery("John 3.16"), { bookQuery: "John", chapter: 3, verse: 16, verseEnd: null });
  });

  test("an empty query asks for nothing", () => {
    assert.deepEqual(parseBibleQuery("   "), { bookQuery: "", chapter: null, verse: null, verseEnd: null });
  });

  test("parses a verse range without corrupting the book name", () => {
    assert.deepEqual(
      parseBibleQuery("1 Corinthians 13:4-7"),
      { bookQuery: "1 Corinthians", chapter: 13, verse: 4, verseEnd: 7 }
    );
  });

  test("accepts an en dash in a range", () => {
    assert.deepEqual(parseBibleQuery("John 3:16–17"), { bookQuery: "John", chapter: 3, verse: 16, verseEnd: 17 });
  });

  test("parses a range on a localized book name", () => {
    assert.deepEqual(
      parseBibleQuery("Mga Panultihon 3:5-6"),
      { bookQuery: "Mga Panultihon", chapter: 3, verse: 5, verseEnd: 6 }
    );
  });
});

describe("matchBibleBooks", () => {
  test("an empty query keeps every book", () => {
    assert.equal(matchBibleBooks(BOOKS, "").length, BOOKS.length);
  });

  test("prefers prefix matches over mere containment", () => {
    // "jo" is contained in "Song of Solomon" too; John/Job must win.
    assert.deepEqual(matchBibleBooks(BOOKS, "jo").map((book) => book.name), ["Job", "John"]);
  });

  test("falls back to containment when nothing starts with the query", () => {
    assert.deepEqual(matchBibleBooks(BOOKS, "solomon").map((book) => book.name), ["Song of Solomon"]);
  });

  test("ignores case, spacing and punctuation", () => {
    assert.deepEqual(matchBibleBooks(BOOKS, "1john").map((book) => book.name), ["1 John"]);
    assert.deepEqual(matchBibleBooks(BOOKS, "  GENESIS ").map((book) => book.name), ["Genesis"]);
  });

  test("returns nothing for a book that doesn't exist", () => {
    assert.deepEqual(matchBibleBooks(BOOKS, "zzz"), []);
  });
});

describe("resolveBibleQueryTarget", () => {
  test("resolves a full reference to a verse index", () => {
    assert.deepEqual(
      resolveBibleQueryTarget(BOOKS, "Genesis", parseBibleQuery("John 3:16")),
      { book: "John", chapter: 3, verseIndex: 1, label: "John 3:16" }
    );
  });

  test("resolves the reported case — a plain book chapter:verse", () => {
    assert.deepEqual(
      resolveBibleQueryTarget(BOOKS, "John", parseBibleQuery("Genesis 1:1")),
      { book: "Genesis", chapter: 1, verseIndex: 0, label: "Genesis 1:1" }
    );
  });

  test("a range lands on its first verse", () => {
    assert.deepEqual(
      resolveBibleQueryTarget(BOOKS, "Genesis", parseBibleQuery("John 3:16-17")),
      { book: "John", chapter: 3, verseIndex: 1, label: "John 3:16" }
    );
  });

  test("a book with no chapter opens its first", () => {
    assert.deepEqual(
      resolveBibleQueryTarget(BOOKS, "Genesis", parseBibleQuery("John")),
      { book: "John", chapter: 1, verseIndex: 0, label: "John 1" }
    );
  });

  test("a bare chapter:verse stays in the currently open book", () => {
    assert.deepEqual(
      resolveBibleQueryTarget(BOOKS, "Genesis", parseBibleQuery("1:3")),
      { book: "Genesis", chapter: 1, verseIndex: 2, label: "Genesis 1:3" }
    );
  });

  test("clamps an out-of-range chapter to the book's last rather than refusing", () => {
    assert.deepEqual(
      resolveBibleQueryTarget(BOOKS, "Genesis", parseBibleQuery("John 99")),
      { book: "John", chapter: 3, verseIndex: 0, label: "John 3" }
    );
  });

  test("clamps an out-of-range verse into the chapter", () => {
    assert.deepEqual(
      resolveBibleQueryTarget(BOOKS, "Genesis", parseBibleQuery("John 3:99")),
      { book: "John", chapter: 3, verseIndex: 2, label: "John 3:17" }
    );
  });

  test("returns null when the book doesn't exist", () => {
    assert.equal(resolveBibleQueryTarget(BOOKS, "Genesis", parseBibleQuery("Zzz 1:1")), null);
  });

  test("an empty query resolves to nothing to go to", () => {
    assert.equal(resolveBibleQueryTarget(BOOKS, "Genesis", parseBibleQuery("")), null);
  });
});
