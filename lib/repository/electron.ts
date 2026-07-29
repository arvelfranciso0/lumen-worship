import type { AppRepository } from "./types";

declare global {
  interface Window {
    electronAPI?: AppRepository;
  }
}

export function hasElectronApi(): boolean {
  return typeof window !== "undefined" && !!window.electronAPI;
}

export function createElectronRepository(): AppRepository {
  const api = window.electronAPI;
  if (!api) throw new Error("window.electronAPI is not available");
  return api;
}
