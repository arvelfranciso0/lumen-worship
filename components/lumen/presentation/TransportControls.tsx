"use client";

import { cx } from "../cx";
import { InteractiveButton } from "../ui/Interactive";

// Prev/Next transport buttons; disabled exactly where go() would no-op.
export function TransportControls({
  onPrevious, onNext, canGoPrev, canGoNext,
}: {
  onPrevious: () => void; onNext: () => void; canGoPrev: boolean; canGoNext: boolean;
}) {
  return (
    <div className="flex gap-2.5 justify-between flex-none mt-3.5" data-tour="navbuttons">
      <InteractiveButton
        onClick={onPrevious}
        disabled={!canGoPrev}
        className={cx(
          "flex-1 h-9.5 rounded-2.25 text-[13px] font-medium flex items-center justify-center gap-2.5 border",
          canGoPrev
            ? "border-border2 bg-raise text-muted cursor-pointer hover:text-text hover:brightness-105"
            : "border-border bg-panel2 text-faint opacity-45 cursor-not-allowed"
        )}
      >
        ← Previous
        <span className="font-mono text-[10px] opacity-70">←</span>
      </InteractiveButton>
      <InteractiveButton
        onClick={onNext}
        disabled={!canGoNext}
        className={cx(
          "flex-1 h-9.5 rounded-2.25 text-[13px] font-semibold flex items-center justify-center gap-2.5 border",
          canGoNext
            ? "border-transparent bg-accent text-white shadow-app-sm cursor-pointer hover:brightness-110"
            : "border-border bg-panel2 text-faint opacity-45 cursor-not-allowed"
        )}
      >
        Next →
        <span className="font-mono text-[10px] opacity-70">Space</span>
      </InteractiveButton>
    </div>
  );
}
