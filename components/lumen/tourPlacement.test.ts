import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ARROW_SIZE, TARGET_GAP, VIEWPORT_MARGIN, placePopover, type Box, type Size,
} from "./tourPlacement.ts";

const DESKTOP: Size = { width: 1440, height: 900 };
// Roughly what the popover measures with a two-line body: w-75 plus content.
const POPOVER: Size = { width: 300, height: 190 };

function box(top: number, left: number, width: number, height: number): Box {
  return { top, left, width, height };
}

function overlaps(placement: { top: number; left: number }, popover: Size, target: Box): boolean {
  return placement.left < target.left + target.width
    && placement.left + popover.width > target.left
    && placement.top < target.top + target.height
    && placement.top + popover.height > target.top;
}

describe("side selection", () => {
  test("sits below a target with room below it", () => {
    const target = box(100, 200, 240, 40);
    const placement = placePopover({ target, viewport: DESKTOP, popover: POPOVER });
    assert.equal(placement.side, "bottom");
    assert.equal(placement.top, target.top + target.height + TARGET_GAP);
  });

  test("flips above a target near the bottom of the window", () => {
    const target = box(800, 200, 240, 40);
    const placement = placePopover({ target, viewport: DESKTOP, popover: POPOVER });
    assert.equal(placement.side, "top");
    assert.equal(placement.top + POPOVER.height, target.top - TARGET_GAP);
  });

  test("goes beside a target too tall for either side of it", () => {
    // A full-height column, as the verse list and sidebar both are.
    const target = box(20, 40, 320, 860);
    const placement = placePopover({ target, viewport: DESKTOP, popover: POPOVER });
    assert.equal(placement.side, "right");
    assert.equal(placement.left, target.left + target.width + TARGET_GAP);
  });

  test("takes the other side when the near one is against the screen edge", () => {
    const target = box(20, 1080, 320, 860);
    const placement = placePopover({ target, viewport: DESKTOP, popover: POPOVER });
    assert.equal(placement.side, "left");
    assert.equal(placement.left + POPOVER.width, target.left - TARGET_GAP);
  });

  test("honours a caller's preferred side when it fits", () => {
    const target = box(400, 600, 200, 40);
    const placement = placePopover({ target, viewport: DESKTOP, popover: POPOVER, preferred: "right" });
    assert.equal(placement.side, "right");
  });

  test("clears the target whenever any side has room", () => {
    const target = box(300, 500, 200, 60);
    const placement = placePopover({ target, viewport: DESKTOP, popover: POPOVER });
    assert.equal(overlaps(placement, POPOVER, target), false);
  });
});

describe("staying inside the viewport", () => {
  // Viewports to check the margin holds at every target position, including partly off-screen ones.
  const VIEWPORTS: Size[] = [
    DESKTOP, { width: 1024, height: 768 }, { width: 800, height: 600 },
    { width: 480, height: 640 }, { width: 360, height: 480 },
  ];

  for (const viewport of VIEWPORTS) {
    test(viewport.width + "x" + viewport.height + ": never comes within the margin of an edge", () => {
      // Cap the popover size to the window minus both margins.
      const popover: Size = {
        width: Math.min(POPOVER.width, viewport.width - VIEWPORT_MARGIN * 2),
        height: Math.min(POPOVER.height, viewport.height - VIEWPORT_MARGIN * 2),
      };
      for (let top = -40; top <= viewport.height + 40; top += 37) {
        for (let left = -40; left <= viewport.width + 40; left += 41) {
          for (const size of [[80, 24], [400, 120], [24, 500]] as const) {
            const target = box(top, left, size[0], size[1]);
            const placement = placePopover({ target, viewport, popover });
            const where = JSON.stringify({ target, placement });
            assert.ok(placement.top >= VIEWPORT_MARGIN, "top edge: " + where);
            assert.ok(placement.left >= VIEWPORT_MARGIN, "left edge: " + where);
            assert.ok(
              placement.top + popover.height <= viewport.height - VIEWPORT_MARGIN,
              "bottom edge: " + where
            );
            assert.ok(
              placement.left + popover.width <= viewport.width - VIEWPORT_MARGIN,
              "right edge: " + where
            );
          }
        }
      }
    });
  }

  test("shifts along the target's edge rather than off screen", () => {
    // Target hugging the right edge: still below it, but slid left to fit.
    const target = box(100, 1380, 50, 40);
    const placement = placePopover({ target, viewport: DESKTOP, popover: POPOVER });
    assert.equal(placement.side, "bottom");
    assert.equal(placement.left + POPOVER.width, DESKTOP.width - VIEWPORT_MARGIN);
  });

  test("a popover taller than the window is pinned to the top margin, not centred", () => {
    const viewport: Size = { width: 480, height: 200 };
    const placement = placePopover({ target: box(80, 40, 200, 40), viewport, popover: POPOVER });
    assert.equal(placement.top, VIEWPORT_MARGIN);
  });

  test("caps its height to the window minus both margins", () => {
    const viewport: Size = { width: 1024, height: 500 };
    const placement = placePopover({ target: box(100, 100, 200, 40), viewport, popover: POPOVER });
    assert.equal(placement.maxHeight, 500 - VIEWPORT_MARGIN * 2);
  });
});

describe("arrow alignment", () => {
  test("points up from below the target, centred on it", () => {
    const target = box(100, 200, 240, 40);
    const placement = placePopover({ target, viewport: DESKTOP, popover: POPOVER });
    assert.ok(placement.arrow);
    assert.equal(placement.arrow.top, 0);
    assert.equal(placement.arrow.left + placement.left, target.left + target.width / 2);
  });

  test("points down from above the target", () => {
    const target = box(800, 200, 240, 40);
    const placement = placePopover({ target, viewport: DESKTOP, popover: POPOVER });
    assert.ok(placement.arrow);
    assert.equal(placement.arrow.top, POPOVER.height);
  });

  test("sits on the facing edge when placed beside the target", () => {
    const target = box(20, 40, 320, 860);
    const placement = placePopover({ target, viewport: DESKTOP, popover: POPOVER });
    assert.equal(placement.side, "right");
    assert.ok(placement.arrow);
    assert.equal(placement.arrow.left, 0);
    assert.equal(placement.arrow.top + placement.top, target.top + target.height / 2);
  });

  test("follows the target through a shift, without reaching a corner", () => {
    const target = box(100, 1380, 50, 40);
    const placement = placePopover({ target, viewport: DESKTOP, popover: POPOVER });
    assert.ok(placement.arrow);
    const arrowCentreX = placement.left + placement.arrow.left;
    assert.ok(
      arrowCentreX >= target.left && arrowCentreX <= target.left + target.width,
      "arrow drifted off the target: " + arrowCentreX
    );
    assert.ok(placement.arrow.left >= ARROW_SIZE, "arrow is on the popover's corner radius");
    assert.ok(placement.arrow.left <= POPOVER.width - ARROW_SIZE);
  });

  test("is dropped when the popover can't reach the target at all", () => {
    // A tiny target in a window too small to fit the popover beside it.
    const placement = placePopover({
      target: box(0, 0, 20, 20), viewport: { width: 360, height: 200 }, popover: POPOVER,
    });
    assert.equal(placement.arrow, null);
  });

  test("there is nothing to point at without a target", () => {
    const placement = placePopover({ target: null, viewport: DESKTOP, popover: POPOVER });
    assert.equal(placement.arrow, null);
    assert.equal(placement.top, (DESKTOP.height - POPOVER.height) / 2);
    assert.equal(placement.left, (DESKTOP.width - POPOVER.width) / 2);
  });
});
