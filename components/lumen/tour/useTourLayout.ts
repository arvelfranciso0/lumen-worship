"use client";

import { useEffect, useRef, useState } from "react";
import type { Box, Size } from "./tourPlacement";
import type { TourStep } from "./tourSteps";

// Fallback popover size before the first measurement.
const POPOVER_ESTIMATE: Size = { width: 300, height: 190 };

type TourLayout = { target: Box | null; viewport: Size };

function sameLayout(previous: TourLayout | null, next: TourLayout): boolean {
  if (!previous) return false;
  const sameBox = previous.target === next.target || (
    !!previous.target && !!next.target
    && previous.target.top === next.target.top && previous.target.left === next.target.left
    && previous.target.width === next.target.width && previous.target.height === next.target.height
  );
  return sameBox
    && previous.viewport.width === next.viewport.width
    && previous.viewport.height === next.viewport.height;
}

// Tracks the current step's target rect, viewport size, and the popover's own measured size.
export function useTourLayout(step: TourStep | null) {
  // Target rect and viewport size, measured together for popover placement.
  const [layout, setLayout] = useState<TourLayout | null>(null);
  // Measured popover size, the third input to placement.
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popoverSize, setPopoverSize] = useState<Size>(POPOVER_ESTIMATE);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- tracks the target element's DOM layout. */
    if (!step) { setLayout(null); return; }
    const updateLayout = () => {
      const element = document.querySelector('[data-tour="' + step.target + '"]');
      const rect = element?.getBoundingClientRect();
      const next: TourLayout = {
        target: rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      };
      // Only updates layout state when it actually changed.
      setLayout((previous) => (sameLayout(previous, next) ? previous : next));
    };
    updateLayout();
    window.addEventListener("resize", updateLayout);
    window.addEventListener("scroll", updateLayout, true);
    const interval = setInterval(updateLayout, 300);
    return () => {
      window.removeEventListener("resize", updateLayout);
      window.removeEventListener("scroll", updateLayout, true);
      clearInterval(interval);
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [step]);

  // Re-measures the popover size whenever it resizes.
  const popoverMounted = layout !== null;
  useEffect(() => {
    const element = popoverRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      const rect = element.getBoundingClientRect();
      setPopoverSize((previous) => (
        previous.width === rect.width && previous.height === rect.height
          ? previous
          : { width: rect.width, height: rect.height }
      ));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [step, popoverMounted]);

  return { layout, popoverRef, popoverSize };
}
