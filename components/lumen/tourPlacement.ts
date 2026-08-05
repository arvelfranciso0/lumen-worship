// Where the tour popover goes: it picks the side of the spotlighted element
// that actually has room (flip), slides along that side to stay clear of the
// screen edges (shift), and reports where the arrow has to sit to keep pointing
// at the target after both of those have moved it.
//
// Hand-rolled rather than floating-ui/popper, same reasoning as cx.ts and the
// raw indexedDB wrapper: this is the app's only positioned popover, four
// candidate sides plus a one-axis shift is the whole of what it needs, and the
// result is a pure function of three rectangles — so it's testable without a
// DOM (see tourPlacement.test.ts), which a library-driven version wouldn't be.

export type TourSide = "top" | "bottom" | "left" | "right";
export type Box = { top: number; left: number; width: number; height: number };
export type Size = { width: number; height: number };

// Minimum clearance between the popover and every edge of the screen, so it's
// never flush against the border.
export const VIEWPORT_MARGIN = 16;
// Gap between the target's edge and the popover. Must stay above the arrow's
// reach (ARROW_SIZE / √2 ≈ 7) so the arrow tip clears the target too.
export const TARGET_GAP = 14;
// Side length of the arrow square, which is rendered rotated 45°. Kept in sync
// with the `w-2.5 h-2.5` classes on the arrow in TourOverlay.
export const ARROW_SIZE = 10;
// How close the arrow's centre may get to a corner of the popover — enough to
// keep it off the rounded-2xl (16px) radius.
const ARROW_EDGE_INSET = 20;

export type TourPlacement = {
  side: TourSide;
  top: number;
  left: number;
  // Content cap, so a long step body scrolls inside the popover instead of
  // running off the bottom of a short window.
  maxHeight: number;
  // Centre of the arrow, in the popover's own coordinates. null when there is
  // no target, or when the shift pushed the popover far enough that the arrow
  // would be pointing alongside the target rather than at it.
  arrow: { top: number; left: number } | null;
};

const OPPOSITE: Record<TourSide, TourSide> = {
  top: "bottom", bottom: "top", left: "right", right: "left",
};

function isVertical(side: TourSide): boolean {
  return side === "top" || side === "bottom";
}

// Preferred side first, then its opposite (the flip), then the other axis — so
// a target that has room neither above nor below still gets placed beside it
// rather than dumped on top of it.
function candidateSides(preferred: TourSide): TourSide[] {
  const otherAxis: TourSide[] = isVertical(preferred) ? ["right", "left"] : ["bottom", "top"];
  return [preferred, OPPOSITE[preferred], ...otherAxis];
}

// Room on one side of the target, with the gap and the screen margin already
// taken out — i.e. how much popover would actually fit there.
function freeSpace(side: TourSide, target: Box, viewport: Size): number {
  const usable = TARGET_GAP + VIEWPORT_MARGIN;
  switch (side) {
    case "top": return target.top - usable;
    case "bottom": return viewport.height - (target.top + target.height) - usable;
    case "left": return target.left - usable;
    case "right": return viewport.width - (target.left + target.width) - usable;
  }
}

function neededSpace(side: TourSide, popover: Size): number {
  return isVertical(side) ? popover.height : popover.width;
}

// The near edge wins when max < min, which happens once the popover is larger
// than the space it has to live in (a very small window): clamping to the top
// or left keeps its heading and buttons reachable rather than its middle.
function clampToRange(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

function chooseSide(target: Box, viewport: Size, popover: Size, preferred: TourSide): TourSide {
  const candidates = candidateSides(preferred);
  const fitting = candidates.find((side) => freeSpace(side, target, viewport) >= neededSpace(side, popover));
  if (fitting) return fitting;
  // Nothing fits — this is a window too small for any side to hold the popover
  // clear of the target. Take the roomiest side and let the clamping below keep
  // it on screen; overlapping the spotlight beats being cut off by the edge.
  return candidates.reduce((best, side) =>
    freeSpace(side, target, viewport) > freeSpace(best, target, viewport) ? side : best
  );
}

export function placePopover({
  target, viewport, popover, preferred = "bottom",
}: {
  target: Box | null;
  viewport: Size;
  popover: Size;
  preferred?: TourSide;
}): TourPlacement {
  const maxHeight = Math.max(0, viewport.height - VIEWPORT_MARGIN * 2);
  const minTop = VIEWPORT_MARGIN;
  const maxTop = viewport.height - VIEWPORT_MARGIN - popover.height;
  const minLeft = VIEWPORT_MARGIN;
  const maxLeft = viewport.width - VIEWPORT_MARGIN - popover.width;

  // No target element on screen (a step whose element hasn't mounted): centred,
  // and with nothing to point at.
  if (!target) {
    return {
      side: preferred,
      top: clampToRange((viewport.height - popover.height) / 2, minTop, maxTop),
      left: clampToRange((viewport.width - popover.width) / 2, minLeft, maxLeft),
      maxHeight,
      arrow: null,
    };
  }

  const side = chooseSide(target, viewport, popover, preferred);
  const targetCenterX = target.left + target.width / 2;
  const targetCenterY = target.top + target.height / 2;

  // Main axis from the chosen side, cross axis centred on the target — then
  // both clamped into the margins. The clamp on the main axis only ever bites
  // in the no-fit case above; the cross axis is the "shift" that keeps a
  // popover beside an edge-of-screen target on screen.
  const unshifted = {
    top: side === "top" ? target.top - TARGET_GAP - popover.height
      : side === "bottom" ? target.top + target.height + TARGET_GAP
        : targetCenterY - popover.height / 2,
    left: side === "left" ? target.left - TARGET_GAP - popover.width
      : side === "right" ? target.left + target.width + TARGET_GAP
        : targetCenterX - popover.width / 2,
  };
  const top = clampToRange(unshifted.top, minTop, maxTop);
  const left = clampToRange(unshifted.left, minLeft, maxLeft);

  // The arrow tracks the target's centre, not the popover's, so it still points
  // at the target after a shift. Held ARROW_EDGE_INSET off both corners of the
  // edge it sits on, and dropped entirely once that clamp has pulled it past
  // the target — at which point it would be pointing at empty space.
  const arrow = (() => {
    if (isVertical(side)) {
      const arrowLeft = clampToRange(targetCenterX - left, ARROW_EDGE_INSET, popover.width - ARROW_EDGE_INSET);
      const onTarget = arrowLeft + left >= target.left && arrowLeft + left <= target.left + target.width;
      return onTarget ? { top: side === "bottom" ? 0 : popover.height, left: arrowLeft } : null;
    }
    const arrowTop = clampToRange(targetCenterY - top, ARROW_EDGE_INSET, popover.height - ARROW_EDGE_INSET);
    const onTarget = arrowTop + top >= target.top && arrowTop + top <= target.top + target.height;
    return onTarget ? { top: arrowTop, left: side === "right" ? 0 : popover.width } : null;
  })();

  return { side, top, left, maxHeight, arrow };
}
