"use client";

import { useEffect, useRef, useState } from "react";
import { InteractiveButton } from "./Interactive";
import { TOUR_STEPS } from "./tourSteps";
import type { UseLumen } from "./useLumen";

const SPOTLIGHT_PADDING = 6;

// Contextual, spotlight-based product tour — replaces the old generic
// WelcomeModal carousel. Auto-starts the first time each mode (Songs/Bible/
// Lineups) is visited (state.tourSeen[mode]), highlighting real elements
// tagged data-tour="..." across the app (see tourSteps.ts for the mapping).
// Deliberately simplified vs. the original design mockup: every step
// advances on a plain "Next" click rather than requiring the operator to
// actually click the target or wait for an async action (e.g. a real Bible
// import) — that finer-grained gating would need per-step custom logic this
// pass didn't scope in.
export function TourOverlay({ lumen }: { lumen: UseLumen }) {
  const { state, patch, prefsLoaded } = lumen;
  const startedModesRef = useRef<Set<string>>(new Set());
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Auto-start: the first time a mode is entered (post prefs-load, so a
  // returning user's tourSeen has actually loaded first) with no tour
  // already showing and that mode not yet marked seen.
  useEffect(() => {
    if (!prefsLoaded || state.tourMode) return;
    if (state.tourSeen[state.mode] || startedModesRef.current.has(state.mode)) return;
    startedModesRef.current.add(state.mode);
    patch({ tourMode: state.mode, tourStep: 0 });
  }, [prefsLoaded, state.mode, state.tourSeen, state.tourMode, patch]);

  const steps = state.tourMode ? TOUR_STEPS[state.tourMode] : null;
  const step = steps ? steps[state.tourStep] : null;

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- this effect
       subscribes to an external system (the target element's real DOM
       layout, which has no React binding), polling + listening for
       resize/scroll the same way a ResizeObserver-backed effect would. */
    if (!step) { setTargetRect(null); return; }
    const updateRect = () => {
      const element = document.querySelector('[data-tour="' + step.target + '"]');
      setTargetRect(element ? element.getBoundingClientRect() : null);
    };
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    const interval = setInterval(updateRect, 300);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
      clearInterval(interval);
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [step]);

  if (!step || !state.tourMode) return null;

  const finish = () => {
    patch((previousState) => ({ tourMode: null, tourSeen: { ...previousState.tourSeen, [state.tourMode as string]: true } }));
  };
  const isLastStep = state.tourStep === (steps as typeof TOUR_STEPS["songs"]).length - 1;
  const next = () => (isLastStep ? finish() : patch((previousState) => ({ tourStep: previousState.tourStep + 1 })));

  const popoverTop = targetRect ? Math.min(window.innerHeight - 160, targetRect.bottom + 14) : window.innerHeight / 2 - 60;
  const popoverLeft = targetRect ? Math.min(window.innerWidth - 300, Math.max(14, targetRect.left)) : window.innerWidth / 2 - 150;

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
      {!targetRect && <div className="absolute inset-0 bg-[rgba(6,6,8,.72)]" />}
      <div
        className="absolute w-75 rounded-2xl border border-border2 bg-panel shadow-app p-4 pointer-events-auto animate-[fadeUp_.18s_ease_both]"
        style={{ top: popoverTop, left: popoverLeft }}
      >
        <div className="text-[13.5px] font-semibold tracking-[-0.01em]">{step.title}</div>
        <div className="text-[12.5px] text-muted leading-[1.55] mt-1.5">{step.body}</div>
        <div className="flex items-center justify-between mt-3.5">
          <span className="font-mono text-[10.5px] text-faint">{state.tourStep + 1} / {(steps as typeof TOUR_STEPS["songs"]).length}</span>
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
  );
}
