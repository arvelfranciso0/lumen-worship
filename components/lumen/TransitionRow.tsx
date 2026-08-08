"use client";

import { useState } from "react";
import { cx } from "./cx";
import type { UseLumen } from "./useLumen";
import {
  clampTransitionDurationMs, MAX_TRANSITION_MS, MIN_TRANSITION_MS, type TransitionType,
} from "./useSlideTransition";

// Each card animates a miniature of what its transition does; see the
// lumenPreview* keyframes in app/globals.css.
const TRANSITIONS: { id: TransitionType; label: string; animation: string }[] = [
  { id: "cut", label: "Cut", animation: "lumenPreviewCut" },
  { id: "fade", label: "Fade", animation: "lumenPreviewFade" },
  { id: "slide", label: "Slide", animation: "lumenPreviewSlide" },
  { id: "zoom", label: "Zoom", animation: "lumenPreviewZoom" },
  { id: "push", label: "Push", animation: "lumenPreviewPush" },
];

// Gap between preview animation loops.
const PREVIEW_PAUSE_MS = 900;

// Inline collapsible row between the text-style toolbar and the slides grid.
export function TransitionRow({ lumen }: { lumen: UseLumen }) {
  const { state, patch } = lumen;
  const open = state.transitionRowOpen;
  const active = TRANSITIONS.find((transition) => transition.id === state.transitionType) ?? TRANSITIONS[0];
  const summary = active.label + " · " + state.transitionDurationMs + "ms";

  // Which card the pointer/keyboard focus is on.
  const [previewingId, setPreviewingId] = useState<TransitionType | null>(null);

  // Preview loop duration: the configured transition duration plus a pause.
  const previewCycleMs = state.transitionDurationMs + PREVIEW_PAUSE_MS;

  const setDuration = (value: number) => patch({ transitionDurationMs: clampTransitionDurationMs(value) });

  return (
    <div className="flex-none flex items-center gap-2.5 p-[8px_16px] border-b border-border bg-panel2 flex-wrap gap-y-1.5">
      <button
        onClick={() => patch((s) => ({ transitionRowOpen: !s.transitionRowOpen }))}
        data-tour="transition"
        className="flex items-center gap-1.25 bg-transparent border-none p-0 cursor-pointer text-faint text-[11px] flex-none hover:text-text"
      >
        <span className={cx("inline-block text-[15px] transition-transform duration-150", open && "rotate-90")}>▸</span>
        Transition
      </button>
      {!open && <span className="font-mono text-[10.5px] text-muted">{summary}</span>}
      {state.performanceMode && (
        <span title="Performance Mode forces every transition to Cut" className="text-[10.5px] text-warn">
          forced to Cut
        </span>
      )}
      <div className={cx("flex items-center gap-2.5 overflow-hidden transition-all duration-180", open ? "max-h-16 opacity-100" : "max-h-0 opacity-0")}>
        <div className="flex gap-1.5 items-start">
          {TRANSITIONS.map((transition) => {
            const on = transition.id === state.transitionType;
            // "cut" never animates — it's an instant swap.
            const animating = (on || previewingId === transition.id) && transition.id !== "cut";
            return (
              <button
                key={transition.id}
                onClick={() => patch({ transitionType: transition.id })}
                onMouseEnter={() => setPreviewingId(transition.id)}
                onMouseLeave={() => setPreviewingId((current) => (current === transition.id ? null : current))}
                onFocus={() => setPreviewingId(transition.id)}
                onBlur={() => setPreviewingId((current) => (current === transition.id ? null : current))}
                title={transition.label + " · " + state.transitionDurationMs + "ms"}
                className="flex flex-col items-center gap-0.75 bg-transparent border-none p-0 cursor-pointer"
              >
                <div
                  className={cx(
                    "w-16 h-11.5 rounded-1.75 overflow-hidden border-2 flex items-center justify-center bg-[linear-gradient(135deg,#241a45,#16233f)]",
                    on ? "border-accent" : "border-border"
                  )}
                >
                  <div
                    className="flex flex-col gap-0.5 items-center"
                    style={animating ? { animation: transition.animation + " " + previewCycleMs + "ms ease-in-out infinite" } : undefined}
                  >
                    <div className="w-6.5 h-0.75 rounded-0.5 bg-white" />
                    <div className="w-4.5 h-0.75 rounded-0.5 bg-white opacity-80" />
                  </div>
                </div>
                <span className={cx("text-[9.5px]", on ? "text-accent" : "text-faint")}>{transition.label}</span>
              </button>
            );
          })}
        </div>
        <div className="w-px h-5.5 bg-border" />
        <label className="text-[10px] text-faint flex-none">Duration</label>
        <input
          type="range"
          min={MIN_TRANSITION_MS}
          max={MAX_TRANSITION_MS}
          step={10}
          value={state.transitionDurationMs}
          onChange={(changeEvent) => setDuration(Number(changeEvent.target.value))}
          title={state.transitionDurationMs + "ms"}
          disabled={state.transitionType === "cut"}
          className="w-25 cursor-pointer accent-accent disabled:opacity-40"
        />
        <input
          type="number"
          min={MIN_TRANSITION_MS}
          max={MAX_TRANSITION_MS}
          step={10}
          value={state.transitionDurationMs}
          // Clamps the value on blur, not on every keystroke.
          onChange={(changeEvent) => patch({ transitionDurationMs: Number(changeEvent.target.value) })}
          onBlur={(blurEvent) => setDuration(Number(blurEvent.target.value))}
          disabled={state.transitionType === "cut"}
          className="w-15 h-6.5 px-1.5 rounded-1.5 border border-border bg-panel text-text font-mono text-[10.5px] outline-none focus:border-accent disabled:opacity-40"
        />
        <span className="text-[10px] text-faint flex-none">ms</span>
      </div>
    </div>
  );
}
