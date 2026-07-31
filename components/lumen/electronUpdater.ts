// releaseNotes is the GitHub release's description (rendered to HTML by
// electron-updater from the release's Atom feed entry) — shown verbatim in
// the header bell's popover. Trusted content: it always comes from this
// app's own GitHub releases, authored by whoever cuts the release, not from
// any third party or end-user input.
export type UpdateStatus =
  | { status: "idle" | "checking" }
  | { status: "available"; version: string; releaseNotes: string | null }
  | { status: "downloading"; percent: number }
  | { status: "downloaded"; version: string; releaseNotes: string | null }
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
