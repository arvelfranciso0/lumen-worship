"use client";

import { useState } from "react";
import { cx } from "./cx";
import type { UseLumen } from "./useLumen";
import {
  clampTransitionDurationMs, MAX_TRANSITION_MS, MIN_TRANSITION_MS, type TransitionType,
} from "./useSlideTransition";

// Each card can animate a miniature of what its transition actually does — see
// the lumenPreview* keyframes in app/globals.css.
const TRANSITIONS: { id: TransitionType; label: string; animation: string }[] = [
  { id: "cut", label: "Cut", animation: "lumenPreviewCut" },
  { id: "fade", label: "Fade", animation: "lumenPreviewFade" },
  { id: "slide", label: "Slide", animation: "lumenPreviewSlide" },
  { id: "zoom", label: "Zoom", animation: "lumenPreviewZoom" },
  { id: "push", label: "Push", animation: "lumenPreviewPush" },
];

// Gap between preview loops, so a card reads as repeating the transition rather
// than as a continuously moving element.
const PREVIEW_PAUSE_MS = 900;

// Inline collapsible row in the main column (was a modal before the handoff
// redesign) — sits between the text-style toolbar and the slides grid.
export function TransitionRow({ lumen }: { lumen: UseLumen }) {
  const { state, patch } = lumen;
  const open = state.transitionRowOpen;
  const active = TRANSITIONS.find((transition) => transition.id === state.transitionType) ?? TRANSITIONS[0];
  const summary = active.label + " · " + state.transitionDurationMs + "ms";

  // Which card the pointer/keyboard focus is on. Previews used to run on all
  // five cards at once, unconditionally — five looping animations competing for
  // attention, none of them telling the operator which one was selected. Only
  // the active card and the one being hovered/focused animate now.
  const [previewingId, setPreviewingId] = useState<TransitionType | null>(null);

  // Previews run at the real configured duration, so what the card shows is what
  // the audience screen will do — with a pause appended so the loop stays
  // legible at very short durations.
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
            // "cut" is an instant swap — there is nothing to animate, and a
            // looping card would imply otherwise.
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
        {/* Duration in real milliseconds rather than an abstract 0-100 "speed".
            Slider and number field write the same value; the number field is
            there so an exact duration can be typed instead of hunted for. Both
            are disabled for Cut, which has no duration to set. */}
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
          // Clamped on blur rather than on every keystroke, so typing "1200"
          // isn't snapped to the maximum the instant "1" is entered.
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
