"use client";

import { cx } from "./cx";
import type { UseLumen } from "./useLumen";
import type { TransitionType } from "./useSlideTransition";

// Each card animates a miniature of what its transition actually does, on a
// loop — see the lumenPreview* keyframes in app/globals.css.
const TRANSITIONS: { id: TransitionType; label: string; animation: string }[] = [
  { id: "cut", label: "Cut", animation: "lumenPreviewCut" },
  { id: "fade", label: "Fade", animation: "lumenPreviewFade" },
  { id: "slide", label: "Slide", animation: "lumenPreviewSlide" },
  { id: "zoom", label: "Zoom", animation: "lumenPreviewZoom" },
  { id: "push", label: "Push", animation: "lumenPreviewPush" },
];

// Duration the chosen speed maps to — mirrors useSlideTransition's own
// 600ms-slow → 150ms-fast mapping, shown so the collapsed row can summarise
// the current setting without expanding.
function durationMs(speedPct: number) {
  return Math.round(600 - (speedPct / 100) * 450);
}

// Inline collapsible row in the main column (was a modal before the handoff
// redesign) — sits between the text-style toolbar and the slides grid.
export function TransitionRow({ lumen }: { lumen: UseLumen }) {
  const { state, patch } = lumen;
  const open = state.transitionRowOpen;
  const active = TRANSITIONS.find((transition) => transition.id === state.transitionType) ?? TRANSITIONS[0];
  const summary = active.label + " · " + durationMs(state.transitionSpeedPct) + "ms";

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
            return (
              <button
                key={transition.id}
                onClick={() => patch({ transitionType: transition.id })}
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
                    style={{ animation: transition.animation + " 2.4s ease-in-out infinite" }}
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
        <span className="text-[10px] text-faint">Slow</span>
        <input
          type="range"
          min={0}
          max={100}
          step={10}
          value={state.transitionSpeedPct}
          onChange={(changeEvent) => patch({ transitionSpeedPct: Number(changeEvent.target.value) })}
          title={durationMs(state.transitionSpeedPct) + "ms"}
          disabled={state.transitionType === "cut"}
          className="w-25 cursor-pointer accent-accent disabled:opacity-40"
        />
        <span className="text-[10px] text-faint">Fast</span>
      </div>
    </div>
  );
}
