"use client";

import { useCallback, useEffect, useState } from "react";
import { getElectronUpdater, type UpdateStatus } from "../electron-bridges/electronUpdater";

const DEFAULT_UPDATE_STATUS: UpdateStatus = { status: "idle" };

// Update-notification bell state, download and install actions (Electron only).
export function useAppUpdater(autoUpdateEnabled: boolean, betaUpdatesEnabled: boolean, prefsLoaded: boolean) {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>(DEFAULT_UPDATE_STATUS);

  useEffect(() => {
    const electronUpdater = getElectronUpdater();
    if (!electronUpdater) return;
    electronUpdater.getStatus().then(setUpdateStatus).catch(() => {});
    return electronUpdater.onStatusChanged(setUpdateStatus);
  }, []);

  const installUpdate = useCallback(() => {
    getElectronUpdater()?.installUpdate();
  }, []);

  const downloadUpdate = useCallback(() => {
    getElectronUpdater()?.downloadUpdate().catch(() => {});
  }, []);

  // Mirrors the auto-update toggle into the main process.
  useEffect(() => {
    getElectronUpdater()?.setAutoUpdateEnabled(autoUpdateEnabled).catch(() => {});
  }, [autoUpdateEnabled]);

  // Mirrors the beta opt-in into the main process once saved prefs are loaded, so the default never flips the channel.
  useEffect(() => {
    if (!prefsLoaded) return;
    getElectronUpdater()?.setBetaUpdatesEnabled(betaUpdatesEnabled).catch(() => {});
  }, [prefsLoaded, betaUpdatesEnabled]);

  return { updateStatus, installUpdate, downloadUpdate };
}
