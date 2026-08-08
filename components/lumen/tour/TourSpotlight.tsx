"use client";

import type { Box } from "./tourPlacement";

const SPOTLIGHT_PADDING = 6;

// Highlights the tour's target element and blocks clicks on it, or dims the page when there's no target.
export function TourSpotlight({ targetRect }: { targetRect: Box | null }) {
  if (!targetRect) return <div className="absolute inset-0 bg-[rgba(6,6,8,.72)]" />;

  return (
    <>
      <div
        className="absolute rounded-2xl pointer-events-none animate-[lumenTourPulse_2s_ease-in-out_infinite]"
        style={{
          top: targetRect.top - SPOTLIGHT_PADDING, left: targetRect.left - SPOTLIGHT_PADDING,
          width: targetRect.width + SPOTLIGHT_PADDING * 2, height: targetRect.height + SPOTLIGHT_PADDING * 2,
        }}
      />
      {/* Transparent shield over the spotlighted element, blocking clicks. */}
      <div
        onClickCapture={(clickEvent) => { clickEvent.preventDefault(); clickEvent.stopPropagation(); }}
        onMouseDownCapture={(mouseEvent) => { mouseEvent.preventDefault(); mouseEvent.stopPropagation(); }}
        className="absolute pointer-events-auto cursor-default"
        style={{
          top: targetRect.top, left: targetRect.left,
          width: targetRect.width, height: targetRect.height,
        }}
      />
    </>
  );
}
