"use client";

// ---- DEFERRED: full multi-simultaneous-display support --------------------
// This modal re-skins the existing single-output model: one optional
// second-monitor "audience" window (state.outputEnabled/outputDisplayId,
// electron/main.js's outputWindow + openOutputWindow/closeOutputWindow via
// electronDisplay.ts). Per-display content modes (mirror/stage/audience/
// custom), role profiles/presets, and true N-simultaneous display windows
// are NOT implemented here and are a deliberately deferred future feature —
// see the redesign plan's Stage 13 for context before re-deriving this
// constraint from scratch.
//
// ---- FUTURE FEATURE: Chords, as part of the above --------------------------
// Chords are to be reintroduced once per-display content modes exist. The
// intent: chord symbols appear ONLY on a Stage display (for the musicians),
// while the Audience display shows the same slide without them. That is why
// chords are a property of a *display's role*, not a global on/off — which is
// what the removed implementation got wrong.
//
// What was removed (see git history for the exact diff):
//   - state.chords + its PersistedPrefs entry (a persisted global boolean)
//   - the "Chords" toggle button in MainPanel's text toolbar
//   - the ♪ badge on the connected-output row in PreviewPanel
// Nothing rendered actual chords: no Song/Section field ever carried chord
// data, so the toggle only ever lit its own badge. Reintroducing this means
// designing chord storage (per-section chord lines, or ChordPro-style inline
// markup parsed out of the lyrics) as well as the per-display routing — the
// removed code is not a starting point worth restoring.

import { cx } from "./cx";
import { InteractiveButton } from "./Interactive";
import { useBackdropClose } from "./useBackdropClose";
import type { UseLumen } from "./useLumen";

export function DisplaysModal({ lumen }: { lumen: UseLumen }) {
  const { state, patch, outputStatus, gpuAccelerationDisabled, setGpuAccelerationDisabled } = lumen;
  const close = () => patch({ displaysModalOpen: false });
  const backdropProps = useBackdropClose(close);

  if (!state.displaysModalOpen) return null;

  const secondaryDisplays = outputStatus.displays.filter((display) => !display.isPrimary);
  const hasSecondaryDisplay = secondaryDisplays.length > 0;

  return (
    <div
      {...backdropProps}
      className="fixed inset-0 z-120 bg-[rgba(6,6,8,.6)] backdrop-blur-[6px] flex items-center justify-center"
    >
      <div
        onClick={(clickEvent) => clickEvent.stopPropagation()}
        className="w-105 max-w-[92vw] max-h-[86vh] flex flex-col rounded-[18px] border border-border2 bg-panel shadow-app overflow-hidden animate-[fadeUp_.18s_ease_both]"
      >
        <div className="flex items-center justify-between p-[18px_20px_14px] border-b border-border">
          <div>
            <div className="text-[16px] font-semibold tracking-[-0.02em]">Manage displays</div>
            <div className="text-[12.5px] text-muted mt-0.75">Second-monitor audience output.</div>
          </div>
          <InteractiveButton
            onClick={close}
            className="w-8 h-8 rounded-2.25 border border-border bg-panel2 text-muted cursor-pointer hover:text-text hover:bg-raise"
          >
            ✕
          </InteractiveButton>
        </div>

        <div className="p-[18px_20px] flex flex-col gap-4.5 overflow-y-auto flex-1">
          <div>
            <div className="flex items-center justify-between mb-2.25">
              <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">Second-monitor output</div>
              <button
                onClick={() => patch((previousState) => ({ outputEnabled: !previousState.outputEnabled }))}
                disabled={!hasSecondaryDisplay}
                className={cx(
                  "w-11 h-6.5 rounded-5 border-none p-0.75 flex disabled:cursor-not-allowed disabled:opacity-40",
                  state.outputEnabled ? "justify-end bg-accent" : "justify-start bg-border2",
                  hasSecondaryDisplay && "cursor-pointer"
                )}
              >
                <span className="w-5 h-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.3)]" />
              </button>
            </div>
            {!hasSecondaryDisplay ? (
              <div className="p-[12px_14px] border border-border rounded-xl bg-panel2 text-[12.5px] text-muted leading-normal">
                No second monitor detected. Connect one (HDMI/DisplayPort, or a wireless/virtual
                display app) to show a fullscreen, chrome-free output there automatically.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="p-[12px_14px] border border-border rounded-xl bg-panel2 flex items-center gap-2">
                  <span className={cx("w-1.75 h-1.75 rounded-full flex-none", outputStatus.active ? "bg-ok" : "bg-border2")} />
                  <span className="text-[12.5px] text-muted">
                    {outputStatus.active && outputStatus.display
                      ? "Live on " + outputStatus.display.label
                      : state.outputEnabled
                        ? "Waiting for display…"
                        : "Off — audience screen not in use"}
                  </span>
                </div>
                {state.outputEnabled && (
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => patch({ outputDisplayId: "auto" })}
                      className={cx(
                        "flex items-center justify-between p-[9px_12px] rounded-2 border text-[12.5px] cursor-pointer text-left",
                        state.outputDisplayId === "auto" ? "border-accent bg-accent-soft text-text" : "border-border bg-panel2 text-muted"
                      )}
                    >
                      <span>Auto (recommended)</span>
                      {outputStatus.display && state.outputDisplayId === "auto" && (
                        <span className="font-mono text-[10.5px] text-faint">{outputStatus.display.label}</span>
                      )}
                    </button>
                    {secondaryDisplays.map((display) => (
                      <button
                        key={display.id}
                        onClick={() => patch({ outputDisplayId: display.id })}
                        className={cx(
                          "flex items-center justify-between p-[9px_12px] rounded-2 border text-[12.5px] cursor-pointer text-left",
                          state.outputDisplayId === display.id ? "border-accent bg-accent-soft text-text" : "border-border bg-panel2 text-muted"
                        )}
                      >
                        <span>Display {display.id}</span>
                        <span className="font-mono text-[10.5px] text-faint">{display.width}×{display.height}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-[12px_14px] border border-border rounded-xl bg-panel2">
            <div>
              <div className="text-[13px] font-medium">Compatibility mode</div>
              <div className="text-[12px] text-muted mt-0.5">
                {gpuAccelerationDisabled
                  ? "GPU acceleration off — slower, but avoids blank screens on some machines. Restart to apply."
                  : "GPU acceleration on (recommended). Only turn this off if the presentation screen shows blank instead of the slide."}
              </div>
            </div>
            <button
              onClick={() => setGpuAccelerationDisabled(!gpuAccelerationDisabled)}
              className={cx("w-11 h-6.5 rounded-5 border-none cursor-pointer p-0.75 flex flex-none", gpuAccelerationDisabled ? "justify-end bg-accent" : "justify-start bg-border2")}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.3)]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
