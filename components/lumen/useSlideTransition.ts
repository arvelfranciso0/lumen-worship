import type { CSSProperties } from "react";

export type TransitionType = "cut" | "fade" | "slide" | "zoom" | "push";

const ANIMATION_NAME: Record<TransitionType, string> = {
  cut: "", fade: "lumenTransFade", slide: "lumenTransSlide", zoom: "lumenTransZoom", push: "lumenTransPush",
};

// speedPct 0-100 maps to a 600ms (slow, 0%) - 150ms (fast, 100%) duration.
const MAX_DURATION_MS = 600;
const DURATION_RANGE_MS = 450;

// Pure — not a hook despite the name (kept for discoverability alongside
// TransitionRow/OutputState) — computes the CSS to apply to the Live
// output content wrapper for one animated entrance. Callers key their
// wrapper element on slide identity (e.g. `key={idx}`) so remounting
// actually restarts the animation each time the live slide changes.
// Performance Mode forces "cut" regardless of the stored preference —
// the concrete behavior behind the header's Performance badge.
export function useSlideTransition(transitionType: TransitionType, transitionSpeedPct: number, performanceMode: boolean): CSSProperties {
  const effectiveType = performanceMode ? "cut" : transitionType;
  const animationName = ANIMATION_NAME[effectiveType];
  if (!animationName) return {};
  const durationMs = Math.round(MAX_DURATION_MS - (transitionSpeedPct / 100) * DURATION_RANGE_MS);
  return { animation: animationName + " " + durationMs + "ms ease both" };
}
