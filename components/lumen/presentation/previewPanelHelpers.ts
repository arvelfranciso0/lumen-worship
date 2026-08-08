import type { OutputStatus } from "../electron-bridges/electronDisplay";

export type ConnectedOutput = { id: number; name: string; liveState: "LIVE" | "BLANK" | "BLACK" };

// Slide position, progress percentage, and label for the progress bar.
export function getProgressInfo(idx: number, slideCount: number) {
  const position = Math.min(Math.max(idx + 1, 1), Math.max(slideCount, 1));
  const progressPct = slideCount ? Math.round((position / slideCount) * 100) : 0;
  const progressLabel = slideCount ? position + " of " + slideCount : "";
  return { position, progressPct, progressLabel };
}

// List of connected output displays (currently at most one).
export function getConnectedOutputs(outputStatus: OutputStatus, black: boolean, blank: boolean): ConnectedOutput[] {
  if (!outputStatus.active || !outputStatus.display) return [];
  return [
    {
      id: outputStatus.display.id,
      name: outputStatus.display.label,
      liveState: black ? "BLACK" : blank ? "BLANK" : "LIVE",
    },
  ];
}
