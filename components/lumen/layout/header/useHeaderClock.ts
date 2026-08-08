"use client";

import { useEffect, useState } from "react";
import { formatClock, formatDateLabel } from "./headerFormat";

const CLOCK_TICK_MS = 15_000;

// Clock/date start empty, fill in after mount, then tick periodically.
export function useHeaderClock() {
  const [clock, setClock] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(formatClock(now));
      setDateLabel(formatDateLabel(now));
    };
    tick();
    const interval = setInterval(tick, CLOCK_TICK_MS);
    return () => clearInterval(interval);
  }, []);
  return { clock, dateLabel };
}
