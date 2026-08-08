"use client";

import { useCallback, useEffect, useState } from "react";
import { getElectronCompat } from "../electron-bridges/electronCompat";

// Compatibility mode (disables GPU acceleration; Electron only); takes effect after restart.
export function useGpuCompat() {
  const [gpuAccelerationDisabled, setGpuAccelerationDisabledState] = useState(false);

  useEffect(() => {
    const electronCompat = getElectronCompat();
    if (!electronCompat) return;
    electronCompat.getGpuAccelerationDisabled().then(setGpuAccelerationDisabledState).catch(() => {});
  }, []);

  const setGpuAccelerationDisabled = useCallback((disabled: boolean) => {
    setGpuAccelerationDisabledState(disabled);
    getElectronCompat()?.setGpuAccelerationDisabled(disabled).catch(() => {});
  }, []);

  return { gpuAccelerationDisabled, setGpuAccelerationDisabled };
}
