"use client";

import { useRef } from "react";
import { LAYOUT_PANELS, isCustomBackground } from "./data";
import { cx } from "./cx";
import { InteractiveButton } from "./Interactive";
import { LookBackground } from "./LookBackground";
import type { UseLumen } from "./useLumen";

export function SettingsModal({ lumen }: { lumen: UseLumen }) {
  const { state, patch, allLooks, addBackground, deleteBackground, toggleLayoutPanel, resetLayout } = lumen;
  const backgroundFileInputRef = useRef<HTMLInputElement>(null);
  if (!state.settingsOpen) return null;

  const close = () => patch({ settingsOpen: false });
  const sizePct = Math.round(((state.scale - 0.7) / 0.8) * 100);

  const onBackgroundFile = (file: File | undefined) => {
    if (file) addBackground(file);
  };

  return (
    <div
      onClick={close}
      className="fixed inset-0 z-120 bg-[rgba(6,6,8,.6)] backdrop-blur-[6px] flex items-center justify-center"
    >
      <div
        onClick={(clickEvent) => clickEvent.stopPropagation()}
        className="w-155 max-h-[86vh] flex flex-col rounded-[18px] border border-border2 bg-panel shadow-app overflow-hidden animate-[fadeUp_.18s_ease_both]"
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
          <div>
            <div className="flex items-center justify-between mb-2.25">
              <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">Background</div>
              <InteractiveButton
                onClick={() => backgroundFileInputRef.current?.click()}
                className="text-[12px] text-accent border-none cursor-pointer px-1 py-0.5 hover:text-text"
              >
                + Upload background
              </InteractiveButton>
              <input
                ref={backgroundFileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={(changeEvent) => { onBackgroundFile(changeEvent.target.files?.[0]); changeEvent.target.value = ""; }}
                className="hidden"
              />
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {allLooks.map((lookOption) => {
                const on = lookOption.id === state.look;
                const custom = isCustomBackground(lookOption);
                return (
                  <div key={lookOption.id} className="relative">
                    <button
                      onClick={() => patch({ look: lookOption.id })}
                      className={cx(
                        "flex flex-col items-start gap-1.5 p-2 rounded-xl cursor-pointer text-text border w-full",
                        on ? "border-accent bg-accent-soft" : "border-border bg-panel2"
                      )}
                    >
                      {custom ? (
                        <span className="relative block w-full h-14 rounded-lg border border-border overflow-hidden bg-black">
                          <LookBackground look={lookOption} preview />
                        </span>
                      ) : (
                        <span className="w-full h-14 rounded-lg border border-border" style={{ background: lookOption.css }} />
                      )}
                      <span className="text-[11.5px] truncate w-full text-left">{lookOption.name}</span>
                      <span className="text-[10px] text-faint">
                        {custom ? (lookOption.mediaType === "video" ? "Video" : "Image") : lookOption.kind}
                      </span>
                    </button>
                    {custom && (
                      <button
                        onClick={(clickEvent) => { clickEvent.stopPropagation(); deleteBackground(lookOption.id); }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[rgba(0,0,0,.55)] text-white text-[11px] cursor-pointer border-none flex items-center justify-center"
                        title="Remove background"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint mb-2.25">Typeface</div>
              <div className="flex gap-2">
                <button
                  onClick={() => patch({ font: "sans" })}
                  className={cx(
                    "flex-1 h-9 rounded-2.25 cursor-pointer text-[13px] text-text border",
                    state.font === "sans" ? "border-accent bg-accent-soft" : "border-border bg-panel2"
                  )}
                >
                  Sans
                </button>
                <button
                  onClick={() => patch({ font: "serif" })}
                  className={cx(
                    "flex-1 h-9 rounded-2.25 cursor-pointer text-[15px] font-serif text-text border",
                    state.font === "serif" ? "border-accent bg-accent-soft" : "border-border bg-panel2"
                  )}
                >
                  Serif
                </button>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint mb-2.25">Lyric size</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => patch((previousState) => ({ scale: Math.max(0.7, +(previousState.scale - 0.1).toFixed(2)) }))}
                  className="w-8.5 h-8.5 rounded-2.25 border border-border bg-panel2 cursor-pointer text-muted text-[12px]"
                >
                  A−
                </button>
                <div className="flex-1 h-1.5 rounded-md bg-raise overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: sizePct + "%" }} />
                </div>
                <button
                  onClick={() => patch((previousState) => ({ scale: Math.min(1.5, +(previousState.scale + 0.1).toFixed(2)) }))}
                  className="w-8.5 h-8.5 rounded-2.25 border border-border bg-panel2 cursor-pointer text-muted text-[15px]"
                >
                  A+
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-[12px_14px] border border-border rounded-xl bg-panel2">
            <div>
              <div className="text-[13px] font-medium">Show chord symbols on operator view</div>
              <div className="text-[12px] text-muted mt-0.5">Never sent to the audience display.</div>
            </div>
            <button
              onClick={() => patch((previousState) => ({ chords: !previousState.chords }))}
              className={cx("w-11 h-6.5 rounded-5 border-none cursor-pointer p-0.75 flex", state.chords ? "justify-end bg-accent" : "justify-start bg-border2")}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.3)]" />
            </button>
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
