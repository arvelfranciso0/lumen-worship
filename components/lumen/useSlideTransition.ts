import type { CSSProperties } from "react";

export type TransitionType = "cut" | "fade" | "slide" | "zoom" | "push";

const ANIMATION_NAME: Record<TransitionType, string> = {
  cut: "", fade: "lumenTransFade", slide: "lumenTransSlide", zoom: "lumenTransZoom", push: "lumenTransPush",
};

// Transition duration is now stored directly in milliseconds rather than as an
// abstract 0-100 "speed", so the operator sets the actual number the animation
// runs for instead of a percentage that mapped to one behind their back. The
// bounds are wider than the old mapping could reach in both directions.
export const MIN_TRANSITION_MS = 80;
export const MAX_TRANSITION_MS = 2000;
export const DEFAULT_TRANSITION_MS = 375;

export function clampTransitionDurationMs(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_TRANSITION_MS;
  return Math.min(MAX_TRANSITION_MS, Math.max(MIN_TRANSITION_MS, Math.round(value)));
}

// Migration for prefs written before the change: speedPct 0-100 mapped to
// 600ms (slow, 0%) - 150ms (fast, 100%). Kept so an existing install keeps the
// speed it was set to rather than silently resetting to the default.
export function speedPctToDurationMs(speedPct: number): number {
  return clampTransitionDurationMs(600 - (speedPct / 100) * 450);
}

// Pure — not a hook despite the name (kept for discoverability alongside
// TransitionRow/OutputState) — computes the CSS to apply to the Live
// output content wrapper for one animated entrance. Callers key their
// wrapper element on slide identity (e.g. `key={idx}`) so remounting
// actually restarts the animation each time the live slide changes.
// Performance Mode forces "cut" regardless of the stored preference —
// the concrete behavior behind the header's Performance badge.
export function useSlideTransition(transitionType: TransitionType, transitionDurationMs: number, performanceMode: boolean): CSSProperties {
  const effectiveType = performanceMode ? "cut" : transitionType;
  const animationName = ANIMATION_NAME[effectiveType];
  if (!animationName) return {};
  return { animation: animationName + " " + clampTransitionDurationMs(transitionDurationMs) + "ms ease both" };
}
