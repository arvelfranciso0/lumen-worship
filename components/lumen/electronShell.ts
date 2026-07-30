// A tiny, separate bridge (kept apart from electronAPI/electronDisplay, same
// reasoning as electronDisplay.ts) for the one OS-shell action Lumen needs:
// opening a URL in the user's real system browser instead of navigating the
// app window itself. Used by the "Get more translations" button, since the
// Bible-translation download page is a separate, public web page, not part
// of the packaged app.
export type ElectronShellBridge = {
  openExternal: (url: string) => Promise<void>;
};

declare global {
  interface Window {
    electronShell?: ElectronShellBridge;
  }
}

export function getElectronShell(): ElectronShellBridge | null {
  return typeof window !== "undefined" ? window.electronShell ?? null : null;
}
