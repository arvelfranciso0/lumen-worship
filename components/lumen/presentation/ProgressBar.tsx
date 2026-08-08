"use client";

// Progress indicator: fraction of the deck completed plus a "N of M" label.
export function ProgressBar({ progressPct, progressLabel }: { progressPct: number; progressLabel: string }) {
  return (
    <div className="flex items-center gap-2 flex-none">
      <div className="flex-1 h-0.75 rounded-0.5 bg-border overflow-hidden">
        <div className="h-full bg-accent rounded-0.5" style={{ width: progressPct + "%" }} />
      </div>
      <span className="font-mono text-[10.5px] text-faint whitespace-nowrap">{progressLabel}</span>
    </div>
  );
}
