"use client";

import { LAYOUT_PANELS } from "../data";
import { cx } from "../cx";
import { InteractiveButton } from "../ui/Interactive";
import { useBackdropClose } from "../hooks/useBackdropClose";
import type { UseLumen } from "../useLumen";

export function SettingsModal({ lumen }: { lumen: UseLumen }) {
  const { state, patch, toggleLayoutPanel, resetLayout, updateStatus } = lumen;
  const close = () => patch({ settingsOpen: false });
  const backdropProps = useBackdropClose(close);

  if (!state.settingsOpen) return null;

  const updateStatusLabel =
    !state.autoUpdateEnabled ? "Won't check for updates automatically"
    : updateStatus.status === "downloaded" ? "Update " + updateStatus.version + " ready — restart to install"
    : updateStatus.status === "downloading" ? "Downloading update… " + Math.round(updateStatus.percent) + "%"
    : updateStatus.status === "available" ? "Update " + updateStatus.version + " available"
    : updateStatus.status === "checking" ? "Checking for updates…"
    : updateStatus.status === "error" ? "Last update check failed"
    : "Up to date";

  return (
    <div
      {...backdropProps}
      className="fixed inset-0 z-120 bg-[rgba(6,6,8,.6)] backdrop-blur-[6px] flex items-center justify-center"
    >
      <div
        onClick={(clickEvent) => clickEvent.stopPropagation()}
        className="w-155 max-w-[92vw] max-h-[86vh] flex flex-col rounded-[18px] border border-border2 bg-panel shadow-app overflow-hidden animate-[fadeUp_.18s_ease_both]"
      >
        <div className="flex items-center justify-between p-[18px_20px_14px] border-b border-border">
          <div>
            <div className="text-[16px] font-semibold tracking-[-0.02em]">Presentation settings</div>
            <div className="text-[12.5px] text-muted mt-0.75">Applies to the audience display only.</div>
          </div>
          <InteractiveButton
            onClick={close}
            className="w-8 h-8 rounded-2.25 border border-border bg-panel2 text-muted cursor-pointer hover:text-text hover:bg-raise"
          >
            ✕
          </InteractiveButton>
        </div>

        <div className="p-[18px_20px] flex flex-col gap-4.5 overflow-y-auto flex-1">

          <div className="flex items-center justify-between p-[12px_14px] border border-border rounded-xl bg-panel2">
            <div>
              <div className="text-[13px] font-medium">Automatic updates</div>
              <div className="text-[12px] text-muted mt-0.5">{updateStatusLabel}</div>
            </div>
            <button
              onClick={() => patch((previousState) => ({ autoUpdateEnabled: !previousState.autoUpdateEnabled }))}
              className={cx("w-11 h-6.5 rounded-5 border-none cursor-pointer p-0.75 flex", state.autoUpdateEnabled ? "justify-end bg-accent" : "justify-start bg-border2")}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.3)]" />
            </button>
          </div>

          <div className="flex items-center justify-between p-[12px_14px] border border-border rounded-xl bg-panel2">
            <div>
              <div className="text-[13px] font-medium">Performance Mode</div>
              <div className="text-[12px] text-muted mt-0.5">Forces slide transitions to Cut, for slower machines.</div>
            </div>
            <button
              onClick={() => patch((previousState) => ({ performanceMode: !previousState.performanceMode }))}
              className={cx("w-11 h-6.5 rounded-5 border-none cursor-pointer p-0.75 flex", state.performanceMode ? "justify-end bg-accent" : "justify-start bg-border2")}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.3)]" />
            </button>
          </div>

          <div className="flex items-center justify-between p-[12px_14px] border border-border rounded-xl bg-panel2">
            <div>
              <div className="text-[13px] font-medium">Product tour</div>
              <div className="text-[12px] text-muted mt-0.5">Replays the walkthrough for whichever section (Songs/Bible/Lineups) you&apos;re currently in.</div>
            </div>
            <InteractiveButton
              onClick={() => patch((previousState) => ({
                tourSeen: { ...previousState.tourSeen, [previousState.mode]: false },
                tourMode: previousState.mode, tourStep: 0, settingsOpen: false,
              }))}
              className="h-9 px-3.5 rounded-2.25 border border-border bg-panel text-[13px] text-muted cursor-pointer hover:text-text"
            >
              Replay
            </InteractiveButton>
          </div>

          <div className="flex items-center justify-between p-[12px_14px] border border-border rounded-xl bg-panel2">
            <div>
              <div className="text-[13px] font-medium">Keyboard shortcuts</div>
              <div className="text-[12px] text-muted mt-0.5">Full reference for presenting and editing.</div>
            </div>
            <InteractiveButton
              onClick={() => patch({ hotkeysOpen: true, settingsOpen: false })}
              className="h-9 px-3.5 rounded-2.25 border border-border bg-panel text-[13px] text-muted cursor-pointer hover:text-text"
            >
              View
            </InteractiveButton>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2.25">
              <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">Layout panels</div>
              <InteractiveButton
                onClick={resetLayout}
                className="text-[12px] text-muted border-none cursor-pointer px-1 py-0.5 hover:text-text"
              >
                Reset layout
              </InteractiveButton>
            </div>
            <div className="flex flex-col gap-2">
              {LAYOUT_PANELS.map((panel) => {
                const visible = state.layoutVisibility[panel.id];
                return (
                  <div
                    key={panel.id}
                    className="flex items-center justify-between p-[12px_14px] border border-border rounded-xl bg-panel2"
                  >
                    <div>
                      <div className="text-[13px] font-medium">{panel.label}</div>
                      <div className="text-[12px] text-muted mt-0.5">{panel.description}</div>
                    </div>
                    <button
                      onClick={() => toggleLayoutPanel(panel.id)}
                      className={cx("w-11 h-6.5 rounded-5 border-none cursor-pointer p-0.75 flex", visible ? "justify-end bg-accent" : "justify-start bg-border2")}
                    >
                      <span className="w-5 h-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.3)]" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2.25 p-[14px_20px] border-t border-border bg-panel2">
          <InteractiveButton
            onClick={close}
            className="h-9 px-3.5 rounded-2.25 border border-border bg-panel text-[13px] text-muted cursor-pointer hover:text-text"
          >
            Cancel
          </InteractiveButton>
          <button onClick={close} className="h-9 px-4 rounded-2.25 border-none bg-accent text-white text-[13px] font-semibold cursor-pointer">
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
