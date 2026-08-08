"use client";

import { cx } from "../cx";

// Blank/Black/Fullscreen quick actions for the audience output.
export function OutputActionsRow({
  blank, black, onToggleBlank, onToggleBlack, onFullscreen,
}: {
  blank: boolean; black: boolean; onToggleBlank: () => void; onToggleBlack: () => void; onFullscreen: () => void;
}) {
  return (
    <div className="flex gap-2 flex-none mt-3 pt-3 border-t border-border" data-tour="transport">
      <button
        onClick={onToggleBlank}
        className={cx(
          "flex-1 h-7.5 rounded-2 cursor-pointer text-[11.5px] font-medium flex items-center justify-center gap-1.5 border",
          blank ? "border-transparent bg-accent text-white hover:brightness-110" : "border-border bg-panel2 text-muted hover:bg-raise hover:text-text"
        )}
      >
        <span className="text-[12px]">▢</span>Blank
      </button>
      <button
        onClick={onToggleBlack}
        className={cx(
          "flex-1 h-7.5 rounded-2 cursor-pointer text-[11.5px] font-medium flex items-center justify-center gap-1.5 border",
          black ? "border-transparent bg-accent text-white hover:brightness-110" : "border-border bg-panel2 text-muted hover:bg-raise hover:text-text"
        )}
      >
        <span className="text-[12px]">■</span>Black
      </button>
      <button
        onClick={onFullscreen}
        className="flex-1 h-7.5 rounded-2 cursor-pointer text-[11.5px] font-medium flex items-center justify-center gap-1.25 border border-border bg-panel2 text-muted hover:bg-raise hover:text-text"
      >
        <span className="text-[12px]">⛶</span>Fullscreen
        <span className="font-mono text-[9px] text-faint">F5</span>
      </button>
    </div>
  );
}
