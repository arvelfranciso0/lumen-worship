"use client";

import { useEffect, useMemo, useState } from "react";
import { getElectronDisplay, type OutputStatus } from "../electron-bridges/electronDisplay";
import type { LumenState } from "../lumenState";
import type { PatchFn } from "./useUndoRedoHistory";

const DEFAULT_OUTPUT_STATUS: OutputStatus = { active: false, selectedDisplayId: "auto", display: null, displays: [] };

// Tracks and drives the second-monitor audience output window (Electron only).
export function useOutputWindow(state: LumenState, patch: PatchFn<LumenState>) {
  const [outputStatus, setOutputStatus] = useState<OutputStatus>(DEFAULT_OUTPUT_STATUS);

  useEffect(() => {
    const electronDisplay = getElectronDisplay();
    if (!electronDisplay) return;
    electronDisplay.getStatus().then(setOutputStatus).catch(() => {});
    return electronDisplay.onStatusChanged(setOutputStatus);
  }, []);

  // Opens, closes, or re-targets the second-monitor output window when the user's choice changes.
  useEffect(() => {
    const electronDisplay = getElectronDisplay();
    if (!electronDisplay) return;
    if (state.outputEnabled) {
      electronDisplay.openOutput(state.outputDisplayId).then((result) => {
        if (!result.ok) {
          // Resets outputEnabled if opening the output window fails.
          console.error("Failed to open second-monitor output window:", result.reason);
          patch({ outputEnabled: false });
          return;
        }
        setOutputStatusFromOpenResult();
      }).catch((error) => {
        console.error("output:open IPC call failed:", error);
        patch({ outputEnabled: false });
      });
    } else {
      electronDisplay.closeOutput().catch((error) => {
        console.error("output:close IPC call failed:", error);
      });
    }

    function setOutputStatusFromOpenResult() {
      electronDisplay!.getStatus().then(setOutputStatus).catch((error) => {
        console.error("display:status IPC call failed:", error);
      });
    }
  }, [state.outputEnabled, state.outputDisplayId, patch]);

  // Present/F5/Fullscreen route to a second monitor when available, otherwise fall back to same-window fullscreen.
  const secondaryDisplayAvailable = useMemo(
    () => outputStatus.displays.some((display) => !display.isPrimary),
    [outputStatus.displays]
  );

  // Aspect ratio of the display currently or about to present, for cropping previews consistently.
  const outputAspectRatio = useMemo(() => {
    const targetDisplay = outputStatus.display ?? outputStatus.displays.find((display) => !display.isPrimary) ?? null;
    return targetDisplay && targetDisplay.height > 0 ? targetDisplay.width / targetDisplay.height : 16 / 9;
  }, [outputStatus.display, outputStatus.displays]);

  return { outputStatus, secondaryDisplayAvailable, outputAspectRatio };
}
