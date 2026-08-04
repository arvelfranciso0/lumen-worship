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
  // A value that changes exactly once per live-slide change (not on every
  // unrelated re-render) — OutputWindowApp keys its content wrapper on this
  // so the transition animation actually restarts each time.
  slideKey: string;
  transitionType: "cut" | "fade" | "slide" | "zoom" | "push";
  transitionSpeedPct: number;
  performanceMode: boolean;
  // Set when Bible Compare is active — both translations' wording of the
  // current verse, shown stacked instead of the normal single slide.
  // Bible Compare mode: both translations' wording for the same verse, each
  // line prefixed with `verseNumber` as a superscript, with the translation
  // codes folded into `caption` (e.g. "PSA 23:2 KJV - NIV") instead of a
  // separate label above each line.
  compare?: { verseNumber: string; lines: [string, string]; caption: string };
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
