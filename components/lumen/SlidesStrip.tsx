"use client";

import { cx } from "./cx";
import { LookBackground } from "./LookBackground";
import { ResizeHandle } from "./ResizeHandle";
import type { UseLumen } from "./useLumen";

// Chrome (padding, header row, label row) that surrounds the thumbnail image
// area within the strip's total configured height — the remainder becomes the
// thumbnail's own height, with its width following automatically via aspect-video.
const SLIDES_STRIP_CHROME_HEIGHT = 80;

export function SlidesStrip({ lumen }: { lumen: UseLumen }) {
  const { slides, idx: currentSlideIndex, patch, look, adjustLayoutSize } = lumen;
  const stripHeight = lumen.state.layoutSizes.slidesStripHeight;
  const thumbnailAreaHeight = Math.max(36, stripHeight - SLIDES_STRIP_CHROME_HEIGHT);

  return (
    <div className="flex-none flex flex-col">
      <ResizeHandle
        axis="vertical"
        onResizeDelta={(deltaPixels) => adjustLayoutSize("slidesStripHeight", -deltaPixels)}
      />
      <div className="flex-none border-t border-border bg-panel2 p-[12px_22px_14px]" style={{ height: stripHeight }}>
        <div className="flex items-center gap-2.5 mb-2.25">
          <span className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">Slides</span>
          <span className="font-mono text-[11px] text-faint">{currentSlideIndex + 1} / {slides.length}</span>
          <div className="flex-1" />
          <span className="text-[11.5px] text-faint">Click a slide to go live</span>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1.5">
          {slides.map((slide, slideIndex) => (
            <div
              key={slideIndex}
              onClick={() => patch({ idx: slideIndex, black: false, blank: false })}
              className={cx(
                "flex-none rounded-[10px] overflow-hidden cursor-pointer bg-panel border",
                slideIndex === currentSlideIndex ? "border-accent shadow-[0_0_0_3px_var(--accent-soft)]" : "border-border shadow-none"
              )}
            >
              <div className="relative aspect-video overflow-hidden" style={{ height: thumbnailAreaHeight }}>
                <LookBackground look={look} preview />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 p-[6px_8px]">
                  {slide.lines.map((line, lineIndex) => (
                    <div key={lineIndex} className="text-[6.5px] leading-normal font-medium text-center text-white opacity-[.92]">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between p-[5px_7px_6px]">
                <span className={cx("text-[10px] font-semibold tracking-[.03em] uppercase", slideIndex === currentSlideIndex ? "text-accent" : "text-muted")}>
                  {slide.label}
                </span>
                <span className="font-mono text-[9px] text-faint">{slideIndex + 1}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
