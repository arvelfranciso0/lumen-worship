import { test, describe } from "node:test";
import assert from "node:assert/strict";
// Type-only import; erased at runtime, so its missing extension is fine.
import type { BibleBook } from "./data";
import {
  formatVerseLabel, PAST_START_INDEX, resolveAdjacentSetSong, resolveDeckStep, resolveNextVerse,
  resolvePreviousVerse,
} from "./navigation.ts";

function chapter(number: number, verseCount: number) {
  return {
    number,
    verses: Array.from({ length: verseCount }, (_, offset) => ({ number: offset + 1, text: "v" + (offset + 1) })),
  };
}

// A miniature two-book canon for exercising boundary crossings.
const BOOKS: BibleBook[] = [
  { number: 1, name: "Genesis", testament: "Old", chapters: [chapter(1, 3), chapter(2, 2)] },
  { number: 66, name: "Revelation", testament: "New", chapters: [chapter(21, 2), chapter(22, 21)] },
];

describe("resolveNextVerse", () => {
  test("steps within a chapter", () => {
    assert.deepEqual(resolveNextVerse(BOOKS, "Genesis", 1, 0), { book: "Genesis", chapter: 1, verseIndex: 1 });
  });

  test("crosses into the next chapter past the last verse", () => {
    assert.deepEqual(resolveNextVerse(BOOKS, "Genesis", 1, 2), { book: "Genesis", chapter: 2, verseIndex: 0 });
  });

  test("crosses into the next book past the last chapter", () => {
    assert.deepEqual(resolveNextVerse(BOOKS, "Genesis", 2, 1), { book: "Revelation", chapter: 21, verseIndex: 0 });
  });

  test("returns null at the last verse of the last book (Revelation 22:21)", () => {
    assert.equal(resolveNextVerse(BOOKS, "Revelation", 22, 20), null);
  });

  test("returns null past the end too, rather than wrapping or overshooting", () => {
    assert.equal(resolveNextVerse(BOOKS, "Revelation", 22, 99), null);
  });

  test("unknown book or chapter resolves to null instead of guessing", () => {
    assert.equal(resolveNextVerse(BOOKS, "Nowhere", 1, 0), null);
    assert.equal(resolveNextVerse(BOOKS, "Genesis", 99, 0), null);
  });

  test("a missing middle chapter steps to the next present one, not past the whole book", () => {
    const sparse: BibleBook[] = [
      { number: 1, name: "Genesis", testament: "Old", chapters: [chapter(1, 1), chapter(3, 1)] },
      { number: 66, name: "Revelation", testament: "New", chapters: [chapter(1, 1)] },
    ];
    assert.deepEqual(resolveNextVerse(sparse, "Genesis", 1, 0), { book: "Genesis", chapter: 3, verseIndex: 0 });
  });
});

describe("resolvePreviousVerse", () => {
  test("steps back within a chapter", () => {
    assert.deepEqual(resolvePreviousVerse(BOOKS, "Genesis", 1, 2), { book: "Genesis", chapter: 1, verseIndex: 1 });
  });

  test("crosses back to the previous chapter's LAST verse", () => {
    assert.deepEqual(resolvePreviousVerse(BOOKS, "Genesis", 2, 0), { book: "Genesis", chapter: 1, verseIndex: 2 });
  });

  test("crosses back to the previous book's last chapter and last verse", () => {
    assert.deepEqual(resolvePreviousVerse(BOOKS, "Revelation", 21, 0), { book: "Genesis", chapter: 2, verseIndex: 1 });
  });

  test("returns null at the very first verse of the Bible", () => {
    assert.equal(resolvePreviousVerse(BOOKS, "Genesis", 1, 0), null);
  });

  test("round-trips: forward across a boundary then back returns to where it started", () => {
    const forward = resolveNextVerse(BOOKS, "Genesis", 1, 2);
    assert.ok(forward);
    assert.deepEqual(
      resolvePreviousVerse(BOOKS, forward.book, forward.chapter, forward.verseIndex),
      { book: "Genesis", chapter: 1, verseIndex: 2 }
    );
  });
});

describe("resolveAdjacentSetSong", () => {
  const sectionCountOf = (songId: string) => ({ a: 2, b: 3, c: 1 }[songId] ?? 0);
  const setIds = ["a", "b", "c"];

  test("forward lands on the next set song's FIRST slide", () => {
    assert.deepEqual(resolveAdjacentSetSong(setIds, "a", 1, sectionCountOf), { songId: "b", idx: 0 });
  });

  test("backward lands on the previous set song's LAST slide", () => {
    assert.deepEqual(resolveAdjacentSetSong(setIds, "b", -1, sectionCountOf), { songId: "a", idx: 1 });
  });

  test("returns null at both ends of the set", () => {
    assert.equal(resolveAdjacentSetSong(setIds, "c", 1, sectionCountOf), null);
    assert.equal(resolveAdjacentSetSong(setIds, "a", -1, sectionCountOf), null);
  });

  // Only consulted from the Lineups tab.
  test("a song that isn't in the set never continues in either direction", () => {
    assert.equal(resolveAdjacentSetSong(setIds, "not-in-set", 1, sectionCountOf), null);
    assert.equal(resolveAdjacentSetSong(setIds, "not-in-set", -1, sectionCountOf), null);
  });

  test("skips over a neighbour with no slides rather than landing on an empty one", () => {
    assert.equal(resolveAdjacentSetSong(["a", "empty"], "a", 1, sectionCountOf), null);
  });

  test("honours an overridden slide count when landing on the last slide", () => {
    // "b" edited down from 3 sections to 2 — backward must land on index 1.
    assert.deepEqual(
      resolveAdjacentSetSong(["b", "c"], "c", -1, (songId) => (songId === "b" ? 2 : 1)),
      { songId: "b", idx: 1 }
    );
  });
});

// Stepping past either end of the deck lands on one blank overflow position.
describe("resolveDeckStep", () => {
  const COUNT = 3; // real slides at 0,1,2; overflow at -1 and 3

  test("steps between real slides", () => {
    assert.deepEqual(resolveDeckStep(0, COUNT, 1), { kind: "index", idx: 1 });
    assert.deepEqual(resolveDeckStep(2, COUNT, -1), { kind: "index", idx: 1 });
  });

  test("the last slide can still step forward — off the end, not refused", () => {
    assert.deepEqual(resolveDeckStep(2, COUNT, 1), { kind: "cross", overflowIndex: COUNT });
  });

  test("the first slide can still step back", () => {
    assert.deepEqual(resolveDeckStep(0, COUNT, -1), { kind: "cross", overflowIndex: PAST_START_INDEX });
  });

  test("only a step FROM the overflow holds — that is where Next/Previous disable", () => {
    assert.deepEqual(resolveDeckStep(COUNT, COUNT, 1), { kind: "hold" });
    assert.deepEqual(resolveDeckStep(PAST_START_INDEX, COUNT, -1), { kind: "hold" });
  });

  test("the overflow positions step back into the deck", () => {
    assert.deepEqual(resolveDeckStep(COUNT, COUNT, -1), { kind: "index", idx: COUNT - 1 });
    assert.deepEqual(resolveDeckStep(PAST_START_INDEX, COUNT, 1), { kind: "index", idx: 0 });
  });

  test("a full round trip: last slide -> blank -> back to last slide", () => {
    const off = resolveDeckStep(COUNT - 1, COUNT, 1);
    assert.equal(off.kind, "cross");
    assert.deepEqual(resolveDeckStep(COUNT, COUNT, -1), { kind: "index", idx: COUNT - 1 });
  });

  test("a single-slide deck still has both blank ends", () => {
    assert.deepEqual(resolveDeckStep(0, 1, 1), { kind: "cross", overflowIndex: 1 });
    assert.deepEqual(resolveDeckStep(0, 1, -1), { kind: "cross", overflowIndex: PAST_START_INDEX });
    assert.deepEqual(resolveDeckStep(1, 1, 1), { kind: "hold" });
  });

  test("an out-of-range index is clamped before stepping", () => {
    assert.deepEqual(resolveDeckStep(99, COUNT, -1), { kind: "index", idx: COUNT - 1 });
    assert.deepEqual(resolveDeckStep(-99, COUNT, 1), { kind: "index", idx: 0 });
  });

  test("an empty deck can never move into it", () => {
    assert.deepEqual(resolveDeckStep(0, 0, 1), { kind: "hold" });
  });
});

describe("formatVerseLabel", () => {
  test("plain verse number", () => {
    assert.equal(formatVerseLabel({ number: 4, text: "" }), "4");
  });

  test("verse bridge renders as a range", () => {
    assert.equal(formatVerseLabel({ number: 1, text: "", endNumber: 3 }), "1-3");
  });

  test("an endNumber equal to number is not a bridge", () => {
    assert.equal(formatVerseLabel({ number: 2, text: "", endNumber: 2 }), "2");
  });
});
