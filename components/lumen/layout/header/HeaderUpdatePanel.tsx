"use client";

import { useState } from "react";
import { cx } from "../../cx";
import { InteractiveButton } from "../../ui/Interactive";
import type { UpdateStatus } from "../../electron-bridges/electronUpdater";
import {
  getUpdateCardTitle, getUpdateLabel, getUpdateReleaseNotes, isUpdatePending, isUpdateReady,
} from "./headerUpdateInfo";
import { useUpdateAlertShake } from "./useUpdateAlertShake";
import { ReleaseNotesMarkdown } from "./ReleaseNotesMarkdown";

// Updates bell button and its release-notes/install popover.
export function HeaderUpdatePanel({
  updateStatus, installUpdate,
}: {
  updateStatus: UpdateStatus; installUpdate: () => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const updatePending = isUpdatePending(updateStatus);
  const updateReady = isUpdateReady(updateStatus);
  const updateLabel = getUpdateLabel(updateStatus);
  const updateCardTitle = getUpdateCardTitle(updateStatus);
  const updateReleaseNotes = getUpdateReleaseNotes(updateStatus);
  const isShaking = useUpdateAlertShake(updatePending);

  return (
    <>
      <InteractiveButton
        onClick={() => setPanelOpen((open) => !open)}
        title={updateLabel}
        className={cx(
          "relative h-8.5 px-3 flex-none flex items-center rounded-2.25 border border-border bg-panel2 text-[13px] text-muted cursor-pointer hover:bg-raise hover:text-text",
          isShaking && "animate-[bellShake_0.65s_ease-in-out]",
        )}
      >
        Updates
        {updatePending && (
          <span
            className={cx(
              "absolute -top-1 -right-1 w-2.25 h-2.25 rounded-full ring-2 ring-panel",
              updateReady ? "bg-ok" : "bg-danger",
            )}
          />
        )}
      </InteractiveButton>

      {panelOpen && (
        <>
          <div
            onClick={() => setPanelOpen(false)}
            className="fixed inset-0 z-90"
          />
          <div
            onClick={(clickEvent) => clickEvent.stopPropagation()}
            className="absolute top-[calc(100%+10px)] left-0 z-100 w-75 rounded-2xl border border-border2 bg-panel shadow-app p-4.5"
          >
            <div className="text-[15px] font-semibold text-text tracking-[-0.01em] leading-[1.35]">
              {updateCardTitle}
            </div>
            <div className="mt-2 max-h-52 overflow-y-auto">
              {updateReleaseNotes ? (
                <div className="text-[13px] text-muted leading-[1.55] [&_h1]:text-text [&_h2]:text-text [&_h3]:text-text [&_h1]:text-[13.5px] [&_h2]:text-[13px] [&_h3]:text-[13px] [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_h1]:mb-1.5 [&_h2]:mb-1.5 [&_h3]:mb-1.5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4.5 [&_ul]:mb-2 [&_li]:mb-1 [&_a]:text-accent [&_a]:underline [&_strong]:text-text [&_code]:font-mono [&_code]:text-[12px] [&_code]:bg-panel2 [&_code]:px-1 [&_code]:py-px [&_code]:rounded-1">
                  <ReleaseNotesMarkdown>
                    {updateReleaseNotes}
                  </ReleaseNotesMarkdown>
                </div>
              ) : (
                <div className="text-[13px] text-muted leading-[1.55]">
                  {updateStatus.status === "checking"
                    ? "Checking GitHub for a newer version…"
                    : updateStatus.status === "downloading"
                      ? "Downloading the update in the background. You can keep working — it installs when you're ready."
                      : updateStatus.status === "error"
                        ? "Couldn't check for updates. Lumen will try again on next launch."
                        : "You're on the latest version — v" +
                          process.env.NEXT_PUBLIC_APP_VERSION +
                          "."}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2.5 mt-4">
              {updateReady && (
                <button
                  onClick={() => {
                    installUpdate();
                    setPanelOpen(false);
                  }}
                  className="h-9.5 px-4 rounded-2.5 border-none bg-accent text-white text-[13px] font-semibold cursor-pointer shadow-app-sm hover:brightness-110"
                >
                  Install &amp; restart
                </button>
              )}
              <button
                onClick={() => setPanelOpen(false)}
                className="h-9.5 px-4 rounded-2.5 border border-border2 bg-transparent text-muted text-[13px] font-medium cursor-pointer hover:bg-panel2 hover:text-text"
              >
                {updateReady ? "Later" : "Close"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
