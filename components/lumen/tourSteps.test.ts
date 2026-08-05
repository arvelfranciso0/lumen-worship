import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { stepSurface, tourStepsFor, type TourContext, type TourStep } from "./tourSteps.ts";

const EMPTY_LIBRARY: TourContext = { hasBibleTranslations: false };
const WITH_TRANSLATION: TourContext = { hasBibleTranslations: true };
const ALL_MODES = ["songs", "bible", "lineups"] as const;

// A tour walks onto a surface by opening it and off by closing it. For that to
// work, the steps on any one surface have to form a single contiguous run: the
// tour opens it once at the start of the run and closes it once at the end.
// Interleaving would mean reopening a dialog it had just closed.
function surfaceRuns(steps: TourStep[]): string[] {
  return steps.map(stepSurface).filter((surface, index, all) => surface !== all[index - 1]);
}

describe("surface sequencing", () => {
  for (const mode of ALL_MODES) {
    // "page" is re-entered on the way back out of every dialog, which is
    // expected. What must not happen is a dialog being opened, closed and
    // opened again — that would mean its steps are interleaved with others.
    test(mode + ": no dialog is entered more than once", () => {
      const runs = surfaceRuns(tourStepsFor(mode, EMPTY_LIBRARY));
      const dialogRuns = runs.filter((surface) => surface !== "page");
      assert.deepEqual(dialogRuns, [...new Set(dialogRuns)], "a dialog is reopened: " + runs.join(" -> "));
    });

    test(mode + ": starts and ends on the page, so no dialog is left open", () => {
      const steps = tourStepsFor(mode, EMPTY_LIBRARY);
      assert.equal(stepSurface(steps[0]), "page");
      assert.equal(stepSurface(steps[steps.length - 1]), "page");
    });
  }
});

describe("bible tour — empty library", () => {
  const STEPS = tourStepsFor("bible", EMPTY_LIBRARY);

  test("teaches importing: page button, then inside the panel, then present", () => {
    assert.deepEqual(
      STEPS.map((step) => [step.target, stepSurface(step)]),
      [
        ["bible-import", "page"],
        ["bible-panel-downloads", "bibleTranslations"],
        ["bible-panel-import", "bibleTranslations"],
        ["present", "page"],
      ]
    );
  });

  // Where the files come from has to be explained before the button that reads
  // one: on its own, "Import translation" points at a file the operator hasn't
  // been told how to get.
  test("the downloads page comes before the import button", () => {
    const panelTargets = STEPS.filter((step) => stepSurface(step) === "bibleTranslations").map((step) => step.target);
    assert.deepEqual(panelTargets, ["bible-panel-downloads", "bible-panel-import"]);
  });

  // Regression: the import step waited for a translation to actually arrive
  // before Next would advance, so finishing a first run meant downloading a file
  // from the website mid-tour. Nothing describes an action the operator has to
  // perform to continue any more.
  test("no step tells the operator to pick or download a file", () => {
    for (const step of STEPS) {
      const copy = (step.title + " " + step.body).toLowerCase();
      assert.equal(/\bwaits? here\b|\byou downloaded\b|\bpick the .*file\b/.test(copy), false,
        step.target + " still asks for a real import: " + copy);
    }
  });
});

describe("bible tour — translation already installed", () => {
  const STEPS = tourStepsFor("bible", WITH_TRANSLATION);

  // Regression: the import steps ran regardless, so a returning operator was
  // walked through downloading and importing a translation they already had.
  test("teaches presenting: version, book/chapter, verse, live", () => {
    assert.deepEqual(
      STEPS.map((step) => [step.target, stepSurface(step)]),
      [
        ["bible-version", "page"],
        ["bible-nav", "page"],
        ["bible-verse", "page"],
        ["present", "page"],
      ]
    );
  });

  test("no import step survives, and nothing opens the translations panel", () => {
    for (const step of STEPS) {
      assert.notEqual(step.target, "bible-import");
      assert.notEqual(step.target, "bible-panel-downloads");
      assert.notEqual(step.target, "bible-panel-import");
      assert.notEqual(stepSurface(step), "bibleTranslations");
    }
  });

  test("the two paths share only the closing Present step", () => {
    const emptyTargets = new Set(tourStepsFor("bible", EMPTY_LIBRARY).map((step) => step.target));
    const shared = STEPS.map((step) => step.target).filter((target) => emptyTargets.has(target));
    assert.deepEqual(shared, ["present"]);
  });
});

describe("songs tour", () => {
  test("points at the button, walks the editor, then returns to the page", () => {
    assert.deepEqual(
      tourStepsFor("songs", EMPTY_LIBRARY).map((step) => [step.target, stepSurface(step)]),
      [
        ["search", "page"],
        ["upload", "page"],
        ["song-editor-fields", "songEditor"],
        ["song-editor-lyrics", "songEditor"],
        ["song-editor-save", "songEditor"],
        ["present", "page"],
      ]
    );
  });

});

describe("lineups tour", () => {
  test("opens the dialog, walks it, and comes back out", () => {
    assert.deepEqual(
      tourStepsFor("lineups", EMPTY_LIBRARY).map((step) => [step.target, stepSurface(step)]),
      [
        ["lineup-new", "page"],
        ["lineup-name", "lineupModal"],
        ["lineup-search", "lineupModal"],
        ["lineup-songs", "lineupModal"],
        ["lineup-upload", "lineupModal"],
        ["lineup-create", "lineupModal"],
        ["present", "page"],
      ]
    );
  });

  test("has one total the counter can report throughout", () => {
    assert.equal(tourStepsFor("lineups", EMPTY_LIBRARY).length, 7);
    assert.equal(tourStepsFor("lineups", WITH_TRANSLATION).length, 7);
  });
});

describe("every tour", () => {
  test("ends on the Present step", () => {
    for (const mode of ALL_MODES) {
      const steps = tourStepsFor(mode, EMPTY_LIBRARY);
      assert.equal(steps[steps.length - 1].target, "present");
    }
  });

  test("has no duplicate targets, so each spotlight is unambiguous", () => {
    for (const mode of ALL_MODES) {
      const targets = tourStepsFor(mode, EMPTY_LIBRARY).map((step) => step.target);
      assert.deepEqual(targets, [...new Set(targets)], mode + " repeats a target");
    }
  });

  test("songs and lineups don't depend on the Bible library", () => {
    for (const mode of ["songs", "lineups"] as const) {
      assert.deepEqual(
        tourStepsFor(mode, EMPTY_LIBRARY).map((step) => step.target),
        tourStepsFor(mode, WITH_TRANSLATION).map((step) => step.target)
      );
    }
  });
});
