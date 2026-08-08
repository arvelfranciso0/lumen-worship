"use client";

import { useCallback, useEffect, useRef } from "react";
import { getElectronDisplay } from "../electron-bridges/electronDisplay";
import type { LumenState } from "../lumenState";
import type { PatchFn } from "./useUndoRedoHistory";

// Starts/stops presenting, including the 3-2-1 countdown and mirroring into OS fullscreen.
export function usePresentationControl(state: LumenState, patch: PatchFn<LumenState>, secondaryDisplayAvailable: boolean) {
  // Timer id for the 3-2-1 countdown; a ref so it survives re-renders.
  const presentCountdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPresentCountdownTimer = useCallback(() => {
    if (presentCountdownTimerRef.current !== null) {
      clearTimeout(presentCountdownTimerRef.current);
      presentCountdownTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearPresentCountdownTimer, [clearPresentCountdownTimer]);

  const isPresenting = state.presenting || state.outputEnabled;

  const startPresenting = useCallback(() => {
    // No-op if already presenting or a countdown is already running.
    if (isPresenting || presentCountdownTimerRef.current !== null || state.presentCountdown !== null) return;

    const tick = (remainingSeconds: number) => {
      if (remainingSeconds <= 0) {
        presentCountdownTimerRef.current = null;
        // Clears the countdown and starts presenting in the same patch.
        patch((previousState) => ({
          presentCountdown: null,
          ...(secondaryDisplayAvailable
            ? (previousState.outputEnabled ? {} : { outputEnabled: true })
            : { presenting: true }),
        }));
        return;
      }
      patch({ presentCountdown: remainingSeconds });
      presentCountdownTimerRef.current = setTimeout(() => tick(remainingSeconds - 1), 1000);
    };

    tick(3);
  }, [isPresenting, patch, secondaryDisplayAvailable, state.presentCountdown]);

  const stopPresenting = useCallback(() => {
    clearPresentCountdownTimer();
    patch({ presentCountdown: null, presenting: false, outputEnabled: false });
  }, [clearPresentCountdownTimer, patch]);

  // Mirrors state.presenting into the operator window's real OS fullscreen state.
  useEffect(() => {
    const electronDisplay = getElectronDisplay();
    if (!electronDisplay) return;
    electronDisplay.setOperatorFullScreen(state.presenting).catch(() => {});
  }, [state.presenting]);

  return { isPresenting, startPresenting, stopPresenting };
}
