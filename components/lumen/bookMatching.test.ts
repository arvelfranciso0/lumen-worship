import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { bookNumberOf, canonicalBookNumber, findBookAcrossTranslations } from "./data.ts";

// Book 20 in both translations, named in each one's own language.
const ENGLISH_BOOKS = [
  { number: 1, name: "Genesis" },
  { number: 19, name: "Psalms" },
  { number: 20, name: "Proverbs" },
];
const CEBUANO_BOOKS = [
  { number: 1, name: "Genesis" },
  { number: 19, name: "Mga Salmo" },
  { number: 20, name: "Mga Panultihon" },
];

describe("findBookAcrossTranslations", () => {
  test("finds a book whose name is translated — the reported case", () => {
    const number = bookNumberOf(CEBUANO_BOOKS, "Mga Panultihon");
    assert.equal(number, 20);
    assert.equal(findBookAcrossTranslations(ENGLISH_BOOKS, number, "Mga Panultihon")?.name, "Proverbs");
  });

  test("works in the other direction too", () => {
    const number = bookNumberOf(ENGLISH_BOOKS, "Proverbs");
    assert.equal(findBookAcrossTranslations(CEBUANO_BOOKS, number, "Proverbs")?.name, "Mga Panultihon");
  });

  test("is not specific to Proverbs — any translated name crosses", () => {
    const number = bookNumberOf(CEBUANO_BOOKS, "Mga Salmo");
    assert.equal(findBookAcrossTranslations(ENGLISH_BOOKS, number, "Mga Salmo")?.name, "Psalms");
  });

  test("still matches a book spelled identically in both languages", () => {
    const number = bookNumberOf(CEBUANO_BOOKS, "Genesis");
    assert.equal(findBookAcrossTranslations(ENGLISH_BOOKS, number, "Genesis")?.name, "Genesis");
  });

  test("falls back to the name when the number is unknown", () => {
    assert.equal(findBookAcrossTranslations(ENGLISH_BOOKS, null, "Psalms")?.name, "Psalms");
  });

  test("falls back to the name when the number isn't in the target translation", () => {
    assert.equal(findBookAcrossTranslations(ENGLISH_BOOKS, 66, "Proverbs")?.name, "Proverbs");
  });

  test("returns undefined when the book genuinely isn't there", () => {
    assert.equal(findBookAcrossTranslations(ENGLISH_BOOKS, 66, "Revelation"), undefined);
  });
});

describe("bookNumberOf", () => {
  test("prefers the number the translation itself recorded", () => {
    assert.equal(bookNumberOf(CEBUANO_BOOKS, "Mga Panultihon"), 20);
  });

  test("falls back to the canonical name tables for a name not in the list", () => {
    assert.equal(bookNumberOf([], "Proverbs"), canonicalBookNumber("Proverbs"));
    assert.equal(bookNumberOf([], "Proverbs"), 20);
  });

  test("null for a name no table knows", () => {
    assert.equal(bookNumberOf([], "Not A Book"), null);
  });
});
