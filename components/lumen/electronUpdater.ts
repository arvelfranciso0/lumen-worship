export type UpdateStatus =
  | { status: "idle" | "checking" }
  | { status: "available"; version: string }
  | { status: "downloading"; percent: number }
  | { status: "downloaded"; version: string }
  | { status: "error"; error: string };

export type ElectronUpdaterBridge = {
  getStatus: () => Promise<UpdateStatus>;
  onStatusChanged: (callback: (status: UpdateStatus) => void) => () => void;
  installUpdate: () => Promise<void>;
  setAutoUpdateEnabled: (enabled: boolean) => Promise<void>;
};

declare global {
  interface Window {
    electronUpdater?: ElectronUpdaterBridge;
  }
}

export function getElectronUpdater(): ElectronUpdaterBridge | null {
  return typeof window !== "undefined" ? window.electronUpdater ?? null : null;
}
