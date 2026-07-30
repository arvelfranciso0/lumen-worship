import type { HighlightRange, LookOption, LyricStyle } from "./data";

export type DisplayInfo = {
  id: number;
  label: string;
  width: number;
  height: number;
  x: number;
  y: number;
  isPrimary: boolean;
};

export type OutputStatus = {
  active: boolean;
  selectedDisplayId: number | "auto";
  display: DisplayInfo | null;
  displays: DisplayInfo[];
};

// What the operator window pushes to the audience output window on every
// change — everything OutputWindowApp needs to render the live slide with
// zero other state or DB access of its own.
export type OutputState = {
  lines: string[];
  lineHighlights?: HighlightRange[][];
  look: LookOption;
  black: boolean;
  hidden: boolean;
  lyricStyle: LyricStyle;
  fontClassName: string;
  scale: number;
  fit: number;
  caption: string;
};

export type ElectronDisplayBridge = {
  list: () => Promise<DisplayInfo[]>;
  getStatus: () => Promise<OutputStatus>;
  onStatusChanged: (callback: (status: OutputStatus) => void) => () => void;
  openOutput: (displayId: number | "auto") => Promise<{ ok: boolean; reason?: string }>;
  closeOutput: () => Promise<{ ok: boolean }>;
  sendState: (payload: OutputState) => void;
  onState: (callback: (payload: OutputState) => void) => () => void;
  notifyReady: () => void;
  setOperatorFullScreen: (fullScreen: boolean) => Promise<void>;
};

declare global {
  interface Window {
    electronDisplay?: ElectronDisplayBridge;
  }
}

export function getElectronDisplay(): ElectronDisplayBridge | null {
  return typeof window !== "undefined" ? window.electronDisplay ?? null : null;
}
