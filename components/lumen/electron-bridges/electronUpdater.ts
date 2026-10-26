// releaseNotes is the GitHub release's description, rendered to HTML, shown in the header bell's popover.
export type UpdateStatus =
  | { status: "idle" | "checking" }
  // Beta updates stay "available" until the user chooses to download them.
  | { status: "available"; version: string; releaseNotes: string | null; isBeta?: boolean }
  | { status: "downloading"; percent: number }
  | { status: "downloaded"; version: string; releaseNotes: string | null; isBeta?: boolean }
  | { status: "error"; error: string };

export type ElectronUpdaterBridge = {
  getStatus: () => Promise<UpdateStatus>;
  onStatusChanged: (callback: (status: UpdateStatus) => void) => () => void;
  installUpdate: () => Promise<void>;
  setAutoUpdateEnabled: (enabled: boolean) => Promise<void>;
  setBetaUpdatesEnabled: (enabled: boolean) => Promise<void>;
  downloadUpdate: () => Promise<void>;
};

declare global {
  interface Window {
    electronUpdater?: ElectronUpdaterBridge;
  }
}

export function getElectronUpdater(): ElectronUpdaterBridge | null {
  return typeof window !== "undefined" ? window.electronUpdater ?? null : null;
}
