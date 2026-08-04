"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "./cx";

const MINUTE_MS = 60_000;
const DEFAULT_MS = 5 * MINUTE_MS;

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + ":" + String(seconds).padStart(2, "0");
}

// Operator-only countdown — never persisted, never sent to OutputState/the
// audience output (this is for the person running the service, not the
// congregation). Collapsed behind a single ⏱ toggle in the Live output header
// row so it doesn't permanently cover part of the preview.
export function CountdownControl() {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(DEFAULT_MS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemainingMs((previous) => {
        if (previous <= 1000) { setRunning(false); return 0; }
        return previous - 1000;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const adjust = (deltaMs: number) => setRemainingMs((previous) => Math.max(0, previous + deltaMs));

  return (
    <div className="relative flex-none">
      <button
        onClick={() => setOpen((previous) => !previous)}
        title="Countdown timer"
        className={cx(
          "w-6.5 h-6.5 rounded-1.75 border text-[12px] cursor-pointer flex items-center justify-center",
          open ? "border-accent bg-accent-soft text-accent" : "border-border bg-panel2 text-muted hover:text-text"
        )}
      >
        ⏱
      </button>
      {open && (
        <div className="absolute z-50 top-[calc(100%+6px)] right-0 flex items-center gap-1.5 p-[6px_8px] rounded-2 border border-border2 bg-panel shadow-app">
          <span className="font-mono text-[13px] font-semibold text-text tabular-nums w-10 text-center">
            {formatRemaining(remainingMs)}
          </span>
          <button
            onClick={() => adjust(-MINUTE_MS)}
            title="−1 minute"
            className="w-4.5 h-4.5 rounded-1 border-none bg-panel2 text-muted text-[10px] cursor-pointer hover:text-text"
          >
            −
          </button>
          <button
            onClick={() => adjust(MINUTE_MS)}
            title="+1 minute"
            className="w-4.5 h-4.5 rounded-1 border-none bg-panel2 text-muted text-[10px] cursor-pointer hover:text-text"
          >
            +
          </button>
          <button
            onClick={() => setRunning((previous) => !previous)}
            className="h-4.5 px-1.5 rounded-1 border-none bg-accent text-white text-[9.5px] font-semibold cursor-pointer"
          >
            {running ? "Pause" : "Start"}
          </button>
          <button
            onClick={() => { setRunning(false); setRemainingMs(DEFAULT_MS); }}
            title="Reset"
            className="w-4.5 h-4.5 rounded-1 border-none bg-panel2 text-muted text-[10px] cursor-pointer hover:text-text"
          >
            ↺
          </button>
        </div>
      )}
    </div>
  );
}
