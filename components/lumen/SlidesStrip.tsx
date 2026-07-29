"use client";

import { cx } from "./cx";
import type { UseLumen } from "./useLumen";

export function SlidesStrip({ v }: { v: UseLumen }) {
  const { slides, idx, patch, look } = v;

  return (
    <div className="flex-none border-t border-border bg-panel2 p-[12px_22px_14px]">
      <div className="flex items-center gap-2.5 mb-2.25">
        <span className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">Slides</span>
        <span className="font-mono text-[11px] text-faint">{idx + 1} / {slides.length}</span>
        <div className="flex-1" />
        <span className="text-[11.5px] text-faint">Click a slide to go live</span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1.5">
        {slides.map((s, i) => (
          <div
            key={i}
            onClick={() => patch({ idx: i, black: false, blank: false })}
            className={cx(
              "w-33 flex-none rounded-[10px] overflow-hidden cursor-pointer bg-panel border",
              i === idx ? "border-accent shadow-[0_0_0_3px_var(--accent-soft)]" : "border-border shadow-none"
            )}
          >
            <div className="h-18.5 flex flex-col items-center justify-center gap-0.5 p-[6px_8px]" style={{ background: look.css }}>
              {s.lines.map((l, j) => (
                <div key={j} className="text-[6.5px] leading-normal font-medium text-center text-white opacity-[.92]">
                  {l}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between p-[5px_7px_6px]">
              <span className={cx("text-[10px] font-semibold tracking-[.03em] uppercase", i === idx ? "text-accent" : "text-muted")}>
                {s.label}
              </span>
              <span className="font-mono text-[9px] text-faint">{i + 1}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
