"use client";

import type { RefObject } from "react";
import { cx } from "../cx";
import { InteractiveButton } from "../ui/Interactive";
import { ARROW_SIZE, type TourPlacement, type TourSide } from "./tourPlacement";
import type { TourStep } from "./tourSteps";

// Border pairs forming the arrow's outer corner for each popover side.
const ARROW_BORDERS: Record<TourSide, string> = {
  bottom: "border-t border-l",  // popover below the target: arrow points up
  top: "border-b border-r",     // popover above: points down
  right: "border-b border-l",   // popover to the right: points left
  left: "border-t border-r",    // popover to the left: points right
};

// The tour's popover card: title/body, arrow pointing at the target, step counter, and nav buttons.
export function TourPopoverCard({
  popoverRef, placement, step, stepNumber, totalSteps, isLastStep, onSkip, onNext,
}: {
  popoverRef: RefObject<HTMLDivElement | null>;
  placement: TourPlacement;
  step: TourStep;
  stepNumber: number;
  totalSteps: number;
  isLastStep: boolean;
  onSkip: () => void;
  onNext: () => void;
}) {
  return (
    <div
      ref={popoverRef}
      className="absolute w-75 max-w-[calc(100vw-32px)] rounded-2xl border border-border2 bg-panel shadow-app pointer-events-auto animate-[fadeUp_.18s_ease_both]"
      style={{ top: placement.top, left: placement.left }}
    >
      {placement.arrow && (
        <div
          aria-hidden
          className={cx(
            "absolute w-2.5 h-2.5 rotate-45 bg-panel border-border2",
            ARROW_BORDERS[placement.side]
          )}
          style={{
            top: placement.arrow.top, left: placement.arrow.left,
            // Centers the arrow square on the popover's edge.
            marginTop: -ARROW_SIZE / 2, marginLeft: -ARROW_SIZE / 2,
          }}
        />
      )}
      <div className="p-4 overflow-y-auto" style={{ maxHeight: placement.maxHeight }}>
        <div className="text-[13.5px] font-semibold tracking-[-0.01em]">{step.title}</div>
        <div className="text-[12.5px] text-muted leading-[1.55] mt-1.5">{step.body}</div>
        <div className="flex items-center justify-between mt-3.5">
          <span className="font-mono text-[10.5px] text-faint">{stepNumber} / {totalSteps}</span>
          <div className="flex items-center gap-2">
            <InteractiveButton
              onClick={onSkip}
              className="h-7.5 px-2.5 rounded-2 border-none bg-transparent text-[12px] text-muted cursor-pointer hover:text-text"
            >
              Skip
            </InteractiveButton>
            <button
              onClick={onNext}
              className="h-7.5 px-3 rounded-2 border-none bg-accent text-white text-[12px] font-semibold cursor-pointer"
            >
              {isLastStep ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
