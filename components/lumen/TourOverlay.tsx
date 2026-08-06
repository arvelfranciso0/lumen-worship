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

// Size to fall back on for the one frame before the popover has been measured.
// Close to the real thing, so the first paint doesn't visibly jump.
const POPOVER_ESTIMATE: Size = { width: 300, height: 190 };

// The arrow is a rotated square, so only the two borders on its outer corner
// belong to it — the other two would draw a line across the popover's inside.
// Rotating 45° clockwise puts the original top-left corner at the point, which
// is why every side names the two borders meeting there.
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

// Contextual, spotlight-based product tour — replaces the old generic
// WelcomeModal carousel. Auto-starts the first time each mode (Songs/Bible/
// Lineups) is visited (state.tourSeen[mode]), highlighting real elements
// tagged data-tour="..." across the app (see tourSteps.ts for the mapping).
//
// Every step advances on a plain "Next" and Skip stays live throughout, so the
// tour can always be walked to the end (or left) without the operator having to
// perform any real action first.
export function TourOverlay({ lumen }: { lumen: UseLumen }) {
  const { state, patch, prefsLoaded } = lumen;
  const startedModesRef = useRef<Set<string>>(new Set());
  // The target's rect and the window's size, read together: the popover's
  // position is a function of both, so measuring them in one pass means they can
  // never disagree by a frame mid-resize.
  const [layout, setLayout] = useState<TourLayout | null>(null);
  // The popover's own measured size — the third input to placement. Measured
  // rather than assumed, because a step's body decides its height, and guessing
  // it is what pinned the popover to the bottom of the window before.
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popoverSize, setPopoverSize] = useState<Size>(POPOVER_ESTIMATE);

  const tourContext: TourContext = {
    hasBibleTranslations: state.downloadedTranslations.length > 0,
    hasMultipleBibleTranslations: state.downloadedTranslations.length >= 2,
  };

  // Resolved once per tour rather than on every render. Recomputing live would
  // renumber the sequence the instant a translation imports — the Bible tour
  // gains its "Browse Scripture" step at that point, which would shift every
  // later step's index and bounce the operator back onto a step they'd just
  // completed.
  const [activeSteps, setActiveSteps] = useState<TourStep[] | null>(null);
  useEffect(() => {
    // Resolving an external condition into state at the moment a tour begins,
    // not state derived from render — eslint's stricter check doesn't
    // distinguish the two.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveSteps(state.tourMode ? tourStepsFor(state.tourMode, tourContext) : null);
    // tourContext is deliberately not a dependency: the sequence is fixed when
    // the tour starts, and `blockedUntil` reads the live context at render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tourMode]);

  // Auto-start: the first time a mode is entered (post prefs-load, so a
  // returning user's tourSeen has actually loaded first) with no tour
  // already showing and that mode not yet marked seen.
  useEffect(() => {
    if (!prefsLoaded || state.tourMode) return;
    if (state.tourSeen[state.mode] || startedModesRef.current.has(state.mode)) return;
    startedModesRef.current.add(state.mode);
    patch({ tourMode: state.mode, tourStep: 0 });
  }, [prefsLoaded, state.mode, state.tourSeen, state.tourMode, patch]);

  // Which surface is actually on screen. Only one dialog is ever up at a time,
  // so this is a single value rather than a set. The lineup dialog counts only
  // in create mode — someone editing an existing lineup already knows it.
  const currentSurface: TourSurface =
    state.lineupModalOpen && !state.editingLineupId ? "lineupModal"
      : state.bibleTranslationsPanelOpen ? "bibleTranslations"
        : state.songEditorOpen ? "songEditor"
          : state.mode === "bible" && state.bibleSubTab === "compare" ? "bibleCompare"
            : "page";

  const steps = activeSteps;
  const step = steps ? steps[state.tourStep] : null;

  // Keeps the tour and the surfaces in step when something other than Next
  // changes what's on screen — the operator closing a dialog, or a dialog
  // closing itself once its job is done (saving a song, say). Jumps to the next
  // step that lives on whatever surface is now showing, so the tour continues
  // where the operator actually is instead of spotlighting a dialog that has
  // gone, or going quiet behind one that has appeared.
  useEffect(() => {
    if (!steps || !step || stepSurface(step) === currentSurface) return;
    const nextHere = steps.findIndex(
      (candidate, index) => index > state.tourStep && stepSurface(candidate) === currentSurface
    );
    // No later step belongs here: stay put and stay hidden (see the render
    // guard) rather than ending the tour — the surface may well close again,
    // and this recovers when it does.
    if (nextHere === -1) return;
    patch({ tourStep: nextHere });
  }, [steps, step, currentSurface, state.tourStep, patch]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- this effect
       subscribes to an external system (the target element's real DOM
       layout, which has no React binding), polling + listening for
       resize/scroll the same way a ResizeObserver-backed effect would. */
    if (!step) { setLayout(null); return; }
    const updateLayout = () => {
      const element = document.querySelector('[data-tour="' + step.target + '"]');
      const rect = element?.getBoundingClientRect();
      const next: TourLayout = {
        target: rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      };
      // The 300ms poll would otherwise re-render on every tick forever, since a
      // fresh rect object is never === the last one.
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

  // Re-placement whenever the popover's own box changes — a step with a longer
  // body, or a reflow at a narrower width, can be the thing that stops it
  // fitting where it currently is. Re-attached when the popover mounts, which
  // is the render after the first measurement lands (see the layout guard).
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

  // Only a step belonging to the surface that's actually up may render — the
  // tour overlay sits above every dialog (z-130), so a page step showing while
  // a dialog is open would spotlight something buried underneath it.
  if (stepSurface(step) !== currentSurface) return null;

  // Skip and Done both land here: end the tour outright and mark it seen, from
  // whatever step it was on. tourStep is reset too, so a later Replay can't
  // start partway through.
  const finish = () => {
    const finishedMode = state.tourMode;
    if (!finishedMode) return;
    patch((previousState) => ({
      tourMode: null, tourStep: 0,
      tourSeen: { ...previousState.tourSeen, [finishedMode]: true },
    }));
  };
  const isLastStep = state.tourStep === steps.length - 1;

  // Opening and closing dialogs as the sequence walks onto and off them. Derived
  // from where the steps sit rather than flags on individual steps, so the two
  // halves can't disagree and reordering can't leave one behind.
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

  // Nothing to place against until the first measurement lands (one frame), and
  // reading window.* during render would break the static export's prerender.
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
      {/* Transparent shield over the spotlighted element, swallowing clicks
          before they reach it. Deliberately not `disabled` or a dimming style on
          the element itself: the point is that it still looks exactly as active
          as it is, so the tour reads as a description of a real control rather
          than a greyed-out one. Anything the operator actually needs that
          control to do is offered by the popover instead (see runStepAction).
          Sized to the element's own rect, not the spotlight's padded ring, so it
          never swallows clicks meant for a neighbour. */}
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
      {/* Placed against the spotlighted element rather than the window: see
          tourPlacement.ts for the flip/shift/arrow rules. Overflow stays visible
          here so the arrow, which sits outside this box, isn't clipped — the
          height cap belongs to the scrolling content wrapper inside. */}
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
              // Centres the square on the popover's edge, so it reads as a point
              // growing out of the border rather than a lozenge beside it.
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
