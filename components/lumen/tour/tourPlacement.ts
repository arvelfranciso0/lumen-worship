// Computes tour popover placement (side, position, arrow) relative to a target element.

export type TourSide = "top" | "bottom" | "left" | "right";
export type Box = { top: number; left: number; width: number; height: number };
export type Size = { width: number; height: number };

// Minimum clearance between the popover and the screen edges.
export const VIEWPORT_MARGIN = 16;
// Gap between the target's edge and the popover.
export const TARGET_GAP = 14;
// Side length of the arrow square, rendered rotated 45°.
export const ARROW_SIZE = 10;
// Minimum distance from the arrow's centre to a corner of the popover.
const ARROW_EDGE_INSET = 20;

export type TourPlacement = {
  side: TourSide;
  top: number;
  left: number;
  // Content cap so the popover scrolls instead of overflowing the window.
  maxHeight: number;
  // Centre of the arrow in the popover's own coordinates, or null when there is no target.
  arrow: { top: number; left: number } | null;
};

const OPPOSITE: Record<TourSide, TourSide> = {
  top: "bottom", bottom: "top", left: "right", right: "left",
};

function isVertical(side: TourSide): boolean {
  return side === "top" || side === "bottom";
}

// Returns candidate sides: preferred, its opposite, then the other axis.
function candidateSides(preferred: TourSide): TourSide[] {
  const otherAxis: TourSide[] = isVertical(preferred) ? ["right", "left"] : ["bottom", "top"];
  return [preferred, OPPOSITE[preferred], ...otherAxis];
}

// Returns the available space on one side of the target, minus the gap and screen margin.
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

// Clamps value into [min, max], falling back to min when the range is inverted.
function clampToRange(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

function chooseSide(target: Box, viewport: Size, popover: Size, preferred: TourSide): TourSide {
  const candidates = candidateSides(preferred);
  const fitting = candidates.find((side) => freeSpace(side, target, viewport) >= neededSpace(side, popover));
  if (fitting) return fitting;
  // Falls back to the side with the most free space when none of the candidates fit.
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

  // Centres the popover with no arrow when there is no target.
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

  // Positions the popover along the chosen side, centred on the target's cross axis.
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

  // Positions the arrow to track the target's centre, or drops it once the target is out of reach.
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
