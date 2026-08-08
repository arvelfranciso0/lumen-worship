"use client";

import { cx } from "../cx";
import type { LyricStyle } from "../data";

type SlideCaptionProps = {
  caption: string;
  lyricStyle: LyricStyle;
  fontClassName: string;
  // The surrounding surface's own lyric font size; the caption is sized
  // relative to this via calc().
  baseFontSize: string;
  // Caption size as a fraction of baseFontSize.
  ratio: number;
  // Distance from the bottom of the surface, as a CSS length.
  bottom: string;
  // Floor for the computed size, as a CSS length.
  minFontSize?: string;
};

// The Bible reference shown under the verse ("PSA 23:2 KJV"), styled to match the operator's lyric style.
export function SlideCaption({ caption, lyricStyle, fontClassName, baseFontSize, ratio, bottom, minFontSize }: SlideCaptionProps) {
  if (!caption) return null;

  const scaledFontSize = "calc(" + baseFontSize + " * " + ratio + ")";
  const fontSize = minFontSize ? "max(" + scaledFontSize + ", " + minFontSize + ")" : scaledFontSize;
  // Scales the outline width with the text.
  const outlineWidth = lyricStyle.outlineWidth ? lyricStyle.outlineWidth * ratio : 0;

  return (
    <div className="absolute inset-x-0 flex justify-center z-2 pointer-events-none px-[6%]" style={{ bottom }}>
      <span
        className={cx(fontClassName, "truncate")}
        style={{
          fontSize,
          fontWeight: lyricStyle.bold ? 700 : undefined,
          fontStyle: lyricStyle.italic ? "italic" : undefined,
          // Defaults to white, matching how the stage lines default an unset color.
          color: lyricStyle.color || "#fff",
          WebkitTextStroke: outlineWidth
            ? outlineWidth + "px " + (lyricStyle.outlineColor || "rgba(0,0,0,.55)")
            : undefined,
        }}
      >
        {caption}
      </span>
    </div>
  );
}
