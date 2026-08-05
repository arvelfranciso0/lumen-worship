import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  clampTransitionDurationMs, DEFAULT_TRANSITION_MS, MAX_TRANSITION_MS, MIN_TRANSITION_MS,
  speedPctToDurationMs, useSlideTransition,
} from "./useSlideTransition.ts";

describe("clampTransitionDurationMs", () => {
  test("keeps a value inside the range", () => {
    assert.equal(clampTransitionDurationMs(400), 400);
  });

  test("clamps both ends rather than rejecting", () => {
    assert.equal(clampTransitionDurationMs(5), MIN_TRANSITION_MS);
    assert.equal(clampTransitionDurationMs(99999), MAX_TRANSITION_MS);
  });

  test("rounds fractional durations", () => {
    assert.equal(clampTransitionDurationMs(320.6), 321);
  });

  // The number input hands over NaN whenever the field is cleared mid-edit.
  test("falls back to the default for a non-finite value", () => {
    assert.equal(clampTransitionDurationMs(Number.NaN), DEFAULT_TRANSITION_MS);
  });
});

describe("speedPctToDurationMs", () => {
  // The old scale: 0% was the slowest at 600ms, 100% the fastest at 150ms.
  test("migrates the old percentage scale end to end", () => {
    assert.equal(speedPctToDurationMs(0), 600);
    assert.equal(speedPctToDurationMs(100), 150);
  });

  test("migrates the old default (50%) to the same duration it produced", () => {
    assert.equal(speedPctToDurationMs(50), 375);
    assert.equal(speedPctToDurationMs(50), DEFAULT_TRANSITION_MS);
  });
});

describe("useSlideTransition", () => {
  test("applies the configured duration verbatim", () => {
    assert.deepEqual(
      useSlideTransition("fade", 250, false),
      { animation: "lumenTransFade 250ms ease both" }
    );
  });

  test("cut has no animation at all", () => {
    assert.deepEqual(useSlideTransition("cut", 250, false), {});
  });

  test("Performance Mode forces a cut regardless of the chosen transition", () => {
    assert.deepEqual(useSlideTransition("zoom", 250, true), {});
  });

  test("an out-of-range duration is clamped rather than emitted as-is", () => {
    assert.deepEqual(
      useSlideTransition("slide", 99999, false),
      { animation: "lumenTransSlide " + MAX_TRANSITION_MS + "ms ease both" }
    );
  });
});
