import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { bookAbbreviation, canonicalBookNumber } from "./data.ts";
// Book name tables come from the Bible XML parser.
import bibleXml from "../../electron/bibleXml.js";

const { BOOKS, BOOK_NAMES_BY_LANGUAGE } = bibleXml as unknown as {
  BOOKS: string[];
  BOOK_NAMES_BY_LANGUAGE: Record<string, string[]>;
};

describe("English book labels", () => {
  test("all 66 books map to an explicit three-letter code", () => {
    BOOKS.forEach((name, index) => {
      const label = bookAbbreviation(name, "English");
      assert.match(label, /^[0-9A-Z]{3}$/, name + " (book " + (index + 1) + ") -> " + label);
    });
  });

  test("codes are unique, so two books can never share a caption", () => {
    const codes = BOOKS.map((name) => bookAbbreviation(name, "English"));
    assert.equal(new Set(codes).size, 66);
  });

  test("spot checks", () => {
    assert.equal(bookAbbreviation("Psalms", "English"), "PSA");
    assert.equal(bookAbbreviation("Revelation", "English"), "REV");
    assert.equal(bookAbbreviation("Song of Solomon", "English"), "SNG");
  });
});

// Cebuano labels use the book's full name instead of an English abbreviation.
describe("Cebuano book labels", () => {
  const CEBUANO = BOOK_NAMES_BY_LANGUAGE.Cebuano;

  test("every book labels as its own full name, not an English code", () => {
    CEBUANO.forEach((name, index) => {
      assert.equal(
        bookAbbreviation(name, "Cebuano"),
        name,
        name + " (book " + (index + 1) + ") should label as itself"
      );
    });
  });

  test("spot checks", () => {
    assert.equal(bookAbbreviation("Mga Salmo", "Cebuano"), "Mga Salmo");
    assert.equal(bookAbbreviation("Pinadayag", "Cebuano"), "Pinadayag");
    assert.equal(bookAbbreviation("Awit ni Solomon", "Cebuano"), "Awit ni Solomon");
  });

  test("names spelled the same in both languages still resolve per language", () => {
    for (const shared of ["Genesis", "Ruth", "Ezra", "Job", "Daniel", "Joel", "Amos", "Nahum", "1 Samuel", "2 Samuel"]) {
      assert.equal(bookAbbreviation(shared, "Cebuano"), shared, shared + " in Cebuano");
      assert.match(bookAbbreviation(shared, "English"), /^[0-9A-Z]{3}$/, shared + " in English");
    }
    assert.equal(bookAbbreviation("Genesis", "English"), "GEN");
    assert.equal(bookAbbreviation("Genesis", "Cebuano"), "Genesis");
  });
});

describe("parser names and label maps stay in step", () => {
  test("Cebuano: the parser's name order matches the label map's key order", () => {
    const CEBUANO = BOOK_NAMES_BY_LANGUAGE.Cebuano;
    assert.equal(CEBUANO.length, 66);
    CEBUANO.forEach((name, index) => {
      assert.equal(canonicalBookNumber(name), index + 1, name + " should be book " + (index + 1));
    });
  });

  test("English: every parser name resolves to its canonical number", () => {
    BOOKS.forEach((name, index) => {
      assert.equal(canonicalBookNumber(name), index + 1, name + " should be book " + (index + 1));
    });
  });

  test("the same book has the same number in both languages", () => {
    const CEBUANO = BOOK_NAMES_BY_LANGUAGE.Cebuano;
    BOOKS.forEach((english, index) => {
      assert.equal(canonicalBookNumber(CEBUANO[index]), canonicalBookNumber(english), english + " / " + CEBUANO[index]);
    });
  });
});

describe("fallbacks", () => {
  test("an unknown language falls back to the English code", () => {
    assert.equal(bookAbbreviation("Psalms", "Klingon"), "PSA");
    assert.equal(bookAbbreviation("Psalms"), "PSA");
  });

  test("an unknown book name still yields something printable", () => {
    assert.equal(bookAbbreviation("Nowhere", "English"), "NOW");
    assert.equal(bookAbbreviation("Nowhere", "Cebuano"), "NOW");
    assert.equal(canonicalBookNumber("Nowhere"), null);
  });
});
