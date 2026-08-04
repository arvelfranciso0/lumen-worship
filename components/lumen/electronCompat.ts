// A tiny, separate bridge (kept apart from electronAPI/electronDisplay, same
// reasoning as electronShell.ts) for the Settings "Compatibility mode"
// toggle — disables GPU acceleration, an escape hatch for the rare machine
// that can't run Chromium's GPU process reliably (VMs, remote-desktop
// sessions, flaky drivers). Off by default; toggling only takes effect after
// a restart, since acceleration can only be disabled before app.ready.
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
