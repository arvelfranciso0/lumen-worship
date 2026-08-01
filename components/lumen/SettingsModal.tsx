"use client";

import { useRef } from "react";
import { LAYOUT_PANELS, isCustomBackground } from "./data";
import { cx } from "./cx";
import { InteractiveButton } from "./Interactive";
import { LookBackground } from "./LookBackground";
import { useBackdropClose } from "./useBackdropClose";
import type { UseLumen } from "./useLumen";

export function SettingsModal({ lumen }: { lumen: UseLumen }) {
  const {
    state, patch, allLooks, addBackground, deleteBackground, toggleLayoutPanel, resetLayout, outputStatus,
    importBibleTranslation, removeBibleTranslation, openBibleDownloadsPage, bibleImportError, updateStatus,
  } = lumen;
  const backgroundFileInputRef = useRef<HTMLInputElement>(null);
  const bibleFileInputRef = useRef<HTMLInputElement>(null);
  const close = () => patch({ settingsOpen: false });
  const backdropProps = useBackdropClose(close);

  if (!state.settingsOpen) return null;

  const sizePct = Math.round(((state.scale - 0.7) / 0.8) * 100);
  const secondaryDisplays = outputStatus.displays.filter((display) => !display.isPrimary);
  const hasSecondaryDisplay = secondaryDisplays.length > 0;

  const updateStatusLabel =
    !state.autoUpdateEnabled ? "Won't check for updates automatically"
    : updateStatus.status === "downloaded" ? "Update " + updateStatus.version + " ready — restart to install"
    : updateStatus.status === "downloading" ? "Downloading update… " + Math.round(updateStatus.percent) + "%"
    : updateStatus.status === "available" ? "Update " + updateStatus.version + " available"
    : updateStatus.status === "checking" ? "Checking for updates…"
    : updateStatus.status === "error" ? "Last update check failed"
    : "Up to date";

  const onBackgroundFile = (file: File | undefined) => {
    if (file) addBackground(file);
  };

  const onBibleFile = (file: File | undefined) => {
    if (file) importBibleTranslation(file);
  };

  return (
    <div
      {...backdropProps}
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
                      <span title={lookOption.name} className="text-[11.5px] truncate w-full text-left">{lookOption.name}</span>
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

          <div>
            <div className="flex items-center justify-between mb-2.25">
              <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">Bible Translations</div>
              <div className="flex items-center gap-2.5">
                <InteractiveButton
                  onClick={openBibleDownloadsPage}
                  className="text-[12px] text-muted border-none cursor-pointer px-1 py-0.5 hover:text-text"
                >
                  Get more translations
                </InteractiveButton>
                <InteractiveButton
                  onClick={() => bibleFileInputRef.current?.click()}
                  className="text-[12px] text-accent border-none cursor-pointer px-1 py-0.5 hover:text-text"
                >
                  + Import translation
                </InteractiveButton>
                <input
                  ref={bibleFileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={(changeEvent) => { onBibleFile(changeEvent.target.files?.[0]); changeEvent.target.value = ""; }}
                  className="hidden"
                />
              </div>
            </div>
            {bibleImportError && (
              <div className="mb-2 p-[10px_12px] border border-danger rounded-xl bg-panel2 text-[12px] text-danger">
                {bibleImportError}
              </div>
            )}
            {state.downloadedTranslations.length === 0 ? (
              <div className="p-[12px_14px] border border-border rounded-xl bg-panel2 text-[12.5px] text-muted leading-normal">
                No translations imported yet. Download one from the translations page, then import the file here.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {state.downloadedTranslations.map((translation) => (
                  <div
                    key={translation.code}
                    className="flex items-center justify-between p-[10px_12px] border border-border rounded-xl bg-panel2"
                  >
                    <div>
                      <div className="text-[13px] font-medium">{translation.name}</div>
                      <div className="text-[12px] text-muted mt-0.5">{(translation.sizeBytes / (1024 * 1024)).toFixed(1)} MB</div>
                    </div>
                    <button
                      onClick={() => removeBibleTranslation(translation.code)}
                      className="w-7 h-7 rounded-full border border-border bg-panel text-muted text-[12px] cursor-pointer flex items-center justify-center hover:text-text"
                      title="Remove translation"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
                No second monitor detected. Connect one (HDMI/DisplayPort) to show a fullscreen, chrome-free output there automatically.
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
              <div className="text-[13px] font-medium">Welcome guide</div>
              <div className="text-[12px] text-muted mt-0.5">The walkthrough shown the first time you opened Lumen.</div>
            </div>
            <InteractiveButton
              onClick={() => patch({ hasSeenOnboarding: false, settingsOpen: false })}
              className="h-9 px-3.5 rounded-2.25 border border-border bg-panel text-[13px] text-muted cursor-pointer hover:text-text"
            >
              Replay
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
