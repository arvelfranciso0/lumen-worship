"use client";

import { useCallback, useEffect, useState } from "react";
import { getElectronUpdater, type UpdateStatus } from "../electron-bridges/electronUpdater";

const DEFAULT_UPDATE_STATUS: UpdateStatus = { status: "idle" };

// Update-notification bell state and install action (Electron only).
export function useAppUpdater(autoUpdateEnabled: boolean) {
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

  // Mirrors the auto-update toggle into the main process.
  useEffect(() => {
    getElectronUpdater()?.setAutoUpdateEnabled(autoUpdateEnabled).catch(() => {});
  }, [autoUpdateEnabled]);

  return { updateStatus, installUpdate };
}
