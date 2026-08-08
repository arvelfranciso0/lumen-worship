// Bridge for opening a URL in the user's system browser instead of the app window.
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
