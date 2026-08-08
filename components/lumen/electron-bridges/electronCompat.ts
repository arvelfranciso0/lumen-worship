// Bridge for the Settings "Compatibility mode" toggle, which disables GPU acceleration.
export type ElectronCompatBridge = {
  getGpuAccelerationDisabled: () => Promise<boolean>;
  setGpuAccelerationDisabled: (disabled: boolean) => Promise<void>;
};

declare global {
  interface Window {
    electronCompat?: ElectronCompatBridge;
  }
}

export function getElectronCompat(): ElectronCompatBridge | null {
  return typeof window !== "undefined" ? window.electronCompat ?? null : null;
}
