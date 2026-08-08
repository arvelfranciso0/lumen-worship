"use client";

import { placePopover } from "./tourPlacement";
import { stepSurface } from "./tourSteps";
import { useTourLayout } from "./useTourLayout";
import { useTourStepNavigation } from "./useTourStepNavigation";
import { TourSpotlight } from "./TourSpotlight";
import { TourPopoverCard } from "./TourPopoverCard";
import type { UseLumen } from "../useLumen";

// Spotlight-based product tour, auto-started per mode via state.tourSeen.
export function TourOverlay({ lumen }: { lumen: UseLumen }) {
  const { state } = lumen;
  const { steps, step, currentSurface, isLastStep, finish, next } = useTourStepNavigation(lumen);
  const { layout, popoverRef, popoverSize } = useTourLayout(step);

  if (!step || !steps || !state.tourMode) return null;

  // Renders only when the current step matches the visible surface.
  if (stepSurface(step) !== currentSurface) return null;

  // Waits for the first layout measurement before placing the popover.
  if (!layout) return null;
  const targetRect = layout.target;
  const placement = placePopover({ target: targetRect, viewport: layout.viewport, popover: popoverSize });

  return (
    <div className="fixed inset-0 z-130 pointer-events-none">
      <TourSpotlight targetRect={targetRect} />
      <TourPopoverCard
        popoverRef={popoverRef}
        placement={placement}
        step={step}
        stepNumber={state.tourStep + 1}
        totalSteps={steps.length}
        isLastStep={isLastStep}
        onSkip={finish}
        onNext={next}
      />
    </div>
  );
}
