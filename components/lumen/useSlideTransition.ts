import type { CSSProperties } from "react";

export type TransitionType = "cut" | "fade" | "slide" | "zoom" | "push";

const ANIMATION_NAME: Record<TransitionType, string> = {
  cut: "", fade: "lumenTransFade", slide: "lumenTransSlide", zoom: "lumenTransZoom", push: "lumenTransPush",
};

// Bounds and default for the transition duration, in milliseconds.
export const MIN_TRANSITION_MS = 80;
export const MAX_TRANSITION_MS = 2000;
export const DEFAULT_TRANSITION_MS = 375;

export function clampTransitionDurationMs(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_TRANSITION_MS;
  return Math.min(MAX_TRANSITION_MS, Math.max(MIN_TRANSITION_MS, Math.round(value)));
}

// Converts a legacy speedPct (0-100) preference into a duration in milliseconds.
export function speedPctToDurationMs(speedPct: number): number {
  return clampTransitionDurationMs(600 - (speedPct / 100) * 450);
}

// Computes the CSS for one slide's entrance animation, forcing "cut" in Performance Mode.
export function useSlideTransition(transitionType: TransitionType, transitionDurationMs: number, performanceMode: boolean): CSSProperties {
  const effectiveType = performanceMode ? "cut" : transitionType;
  const animationName = ANIMATION_NAME[effectiveType];
  if (!animationName) return {};
  return { animation: animationName + " " + clampTransitionDurationMs(transitionDurationMs) + "ms ease both" };
}
