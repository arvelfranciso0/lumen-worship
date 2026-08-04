import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolveCompareTranslation } from "./data.ts";

// Regression: with only one translation imported, the sidebar correctly said
// "Compare needs at least 2 downloaded translations" while the Live output was
// simultaneously showing a comparison — the same verse rendered twice, captioned
// "1999 - RCPV" as though the two halves came from different translations.
// state.compareMode had outlived the conditions that made it valid.
describe("resolveCompareTranslation", () => {
  const DOWNLOADED = ["kjv", "rcpv", "niv"];

  test("honours a valid pairing", () => {
    assert.equal(resolveCompareTranslation("rcpv", "kjv", DOWNLOADED), "rcpv");
  });

  test("refuses when nothing was requested", () => {
    assert.equal(resolveCompareTranslation(null, "kjv", DOWNLOADED), null);
    assert.equal(resolveCompareTranslation(undefined, "kjv", DOWNLOADED), null);
    assert.equal(resolveCompareTranslation("", "kjv", DOWNLOADED), null);
  });

  test("refuses to compare a translation with itself", () => {
    assert.equal(resolveCompareTranslation("kjv", "kjv", DOWNLOADED), null);
  });

  test("refuses once the compared translation is no longer imported", () => {
    assert.equal(resolveCompareTranslation("rcpv", "kjv", ["kjv"]), null);
  });

  test("refuses when the primary itself is no longer imported", () => {
    assert.equal(resolveCompareTranslation("rcpv", "kjv", ["rcpv"]), null);
  });

  test("refuses when nothing is imported at all — the reported case", () => {
    assert.equal(resolveCompareTranslation("rcpv", "kjv", []), null);
  });

  test("a single imported translation can never produce a comparison", () => {
    for (const primary of ["only"]) {
      for (const requested of ["only", "other", null]) {
        assert.equal(resolveCompareTranslation(requested, primary, ["only"]), null);
      }
    }
  });

  test("switching the primary onto the compared translation cancels the pairing", () => {
    assert.equal(resolveCompareTranslation("rcpv", "rcpv", DOWNLOADED), null);
  });
});
