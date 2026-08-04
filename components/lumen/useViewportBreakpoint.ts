"use client";

import { useEffect, useState } from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop";

const MOBILE_MAX_WIDTH = 767;
const TABLET_MAX_WIDTH = 1279;

function resolveBreakpoint(width: number): Breakpoint {
  if (width <= MOBILE_MAX_WIDTH) return "mobile";
  if (width <= TABLET_MAX_WIDTH) return "tablet";
  return "desktop";
}

// SSR-safe (starts at "desktop", the app's original only-supported size, and
// resolves for real after mount) — same pattern as Header.tsx's clock/date,
// which starts empty to avoid a hydration mismatch against the static
// export's server-rendered markup.
export function useViewportBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: " + MOBILE_MAX_WIDTH + "px)");
    const tabletQuery = window.matchMedia("(max-width: " + TABLET_MAX_WIDTH + "px)");
    const update = () => setBreakpoint(resolveBreakpoint(window.innerWidth));
    update();
    mobileQuery.addEventListener("change", update);
    tabletQuery.addEventListener("change", update);
    return () => {
      mobileQuery.removeEventListener("change", update);
      tabletQuery.removeEventListener("change", update);
    };
  }, []);

  return breakpoint;
}
