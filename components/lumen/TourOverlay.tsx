"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "./cx";
import { InteractiveButton } from "./Interactive";
import {
  ARROW_SIZE, placePopover, type Box, type Size, type TourSide,
} from "./tourPlacement";
import {
  stepSurface, tourStepsFor, type TourContext, type TourStep, type TourSurface,
} from "./tourSteps";
import type { UseLumen } from "./useLumen";

const SPOTLIGHT_PADDING = 6;

// Fallback popover size before the first measurement.
const POPOVER_ESTIMATE: Size = { width: 300, height: 190 };

// Border pairs forming the arrow's outer corner for each popover side.
const ARROW_BORDERS: Record<TourSide, string> = {
  bottom: "border-t border-l",  // popover below the target: arrow points up
  top: "border-b border-r",     // popover above: points down
  right: "border-b border-l",   // popover to the right: points left
  left: "border-t border-r",    // popover to the left: points right
};

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

// Spotlight-based product tour, auto-started per mode via state.tourSeen.
export function TourOverlay({ lumen }: { lumen: UseLumen }) {
  const { state, patch, prefsLoaded } = lumen;
  const startedModesRef = useRef<Set<string>>(new Set());
  // Target rect and viewport size, measured together for popover placement.
  const [layout, setLayout] = useState<TourLayout | null>(null);
  // Measured popover size, the third input to placement.
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popoverSize, setPopoverSize] = useState<Size>(POPOVER_ESTIMATE);

  const tourContext: TourContext = {
    hasBibleTranslations: state.downloadedTranslations.length > 0,
    hasMultipleBibleTranslations: state.downloadedTranslations.length >= 2,
  };

  // Tour steps resolved once when the tour starts, not on every render.
  const [activeSteps, setActiveSteps] = useState<TourStep[] | null>(null);
  useEffect(() => {
    // Sets tour steps when a tour begins.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveSteps(state.tourMode ? tourStepsFor(state.tourMode, tourContext) : null);
    // tourContext intentionally excluded — steps are fixed once the tour starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tourMode]);

  // Auto-starts the tour the first time a mode is entered.
  useEffect(() => {
    if (!prefsLoaded || state.tourMode) return;
    if (state.tourSeen[state.mode] || startedModesRef.current.has(state.mode)) return;
    startedModesRef.current.add(state.mode);
    patch({ tourMode: state.mode, tourStep: 0 });
  }, [prefsLoaded, state.mode, state.tourSeen, state.tourMode, patch]);

  // Which dialog/surface is currently on screen.
  const currentSurface: TourSurface =
    state.lineupModalOpen && !state.editingLineupId ? "lineupModal"
      : state.bibleTranslationsPanelOpen ? "bibleTranslations"
        : state.songEditorOpen ? "songEditor"
          : state.mode === "bible" && state.bibleSubTab === "compare" ? "bibleCompare"
            : "page";

  const steps = activeSteps;
  const step = steps ? steps[state.tourStep] : null;

  // Jumps to the next step matching the currently visible surface.
  useEffect(() => {
    if (!steps || !step || stepSurface(step) === currentSurface) return;
    const nextHere = steps.findIndex(
      (candidate, index) => index > state.tourStep && stepSurface(candidate) === currentSurface
    );
    // No matching later step: stay on the current step, hidden.
    if (nextHere === -1) return;
    patch({ tourStep: nextHere });
  }, [steps, step, currentSurface, state.tourStep, patch]);

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

  if (!step || !steps || !state.tourMode) return null;

  // Renders only when the current step matches the visible surface.
  if (stepSurface(step) !== currentSurface) return null;

  // Ends the tour and marks the current mode as seen.
  const finish = () => {
    const finishedMode = state.tourMode;
    if (!finishedMode) return;
    patch((previousState) => ({
      tourMode: null, tourStep: 0,
      tourSeen: { ...previousState.tourSeen, [finishedMode]: true },
    }));
  };
  const isLastStep = state.tourStep === steps.length - 1;

  // Open/close patches for each surface, keyed by tour surface.
  const SURFACE_PATCH: Record<TourSurface, { open: Partial<typeof state>; close: Partial<typeof state> }> = {
    page: { open: {}, close: {} },
    lineupModal: {
      open: { lineupModalOpen: true, editingLineupId: null },
      close: { lineupModalOpen: false, editingLineupId: null },
    },
    bibleTranslations: {
      open: { bibleTranslationsPanelOpen: true },
      close: { bibleTranslationsPanelOpen: false },
    },
    songEditor: {
      open: { songEditorOpen: true, songEditorMode: "create" },
      close: { songEditorOpen: false },
    },
    bibleCompare: {
      open: { bibleSubTab: "compare" },
      close: { bibleSubTab: "browse" },
    },
  };

  const next = () => {
    if (isLastStep) { finish(); return; }
    const fromSurface = stepSurface(step);
    const toSurface = stepSurface(steps[state.tourStep + 1]);
    patch((previousState) => ({
      ...(fromSurface === toSurface ? {} : { ...SURFACE_PATCH[fromSurface].close, ...SURFACE_PATCH[toSurface].open }),
      tourStep: previousState.tourStep + 1,
    }));
  };

  // Waits for the first layout measurement before placing the popover.
  if (!layout) return null;
  const targetRect = layout.target;
  const placement = placePopover({ target: targetRect, viewport: layout.viewport, popover: popoverSize });

  return (
    <div className="fixed inset-0 z-130 pointer-events-none">
      {targetRect && (
        <div
          className="absolute rounded-2xl pointer-events-none animate-[lumenTourPulse_2s_ease-in-out_infinite]"
          style={{
            top: targetRect.top - SPOTLIGHT_PADDING, left: targetRect.left - SPOTLIGHT_PADDING,
            width: targetRect.width + SPOTLIGHT_PADDING * 2, height: targetRect.height + SPOTLIGHT_PADDING * 2,
          }}
        />
      )}
      {/* Transparent shield over the spotlighted element, blocking clicks. */}
      {targetRect && (
        <div
          onClickCapture={(clickEvent) => { clickEvent.preventDefault(); clickEvent.stopPropagation(); }}
          onMouseDownCapture={(mouseEvent) => { mouseEvent.preventDefault(); mouseEvent.stopPropagation(); }}
          className="absolute pointer-events-auto cursor-default"
          style={{
            top: targetRect.top, left: targetRect.left,
            width: targetRect.width, height: targetRect.height,
          }}
        />
      )}
      {!targetRect && <div className="absolute inset-0 bg-[rgba(6,6,8,.72)]" />}
      {/* Popover placed relative to the spotlighted element. */}
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
            <span className="font-mono text-[10.5px] text-faint">{state.tourStep + 1} / {steps.length}</span>
            <div className="flex items-center gap-2">
              <InteractiveButton
                onClick={finish}
                className="h-7.5 px-2.5 rounded-2 border-none bg-transparent text-[12px] text-muted cursor-pointer hover:text-text"
              >
                Skip
              </InteractiveButton>
              <button
                onClick={next}
                className="h-7.5 px-3 rounded-2 border-none bg-accent text-white text-[12px] font-semibold cursor-pointer"
              >
                {isLastStep ? "Done" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
