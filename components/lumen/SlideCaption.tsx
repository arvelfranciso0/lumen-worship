"use client";

import { cx } from "./cx";
import type { LyricStyle } from "./data";

type SlideCaptionProps = {
  caption: string;
  lyricStyle: LyricStyle;
  // The lyric font's utility class (lumen.lyricFamily / OutputState.fontClassName).
  fontClassName: string;
  // The surrounding surface's own lyric font size, in whatever unit that
  // surface uses (px on the operator screen, vw on a full presentation). The
  // caption is sized — and its outline scaled — relative to this via calc(),
  // so one component works across every render surface without each caller
  // hand-tuning a second set of numbers.
  baseFontSize: string;
  // Caption size as a fraction of baseFontSize.
  ratio: number;
  // Distance from the bottom of the surface, as a CSS length.
  bottom: string;
};

// The Bible reference shown under the verse ("PSA 23:2 KJV"). Deliberately
// inherits the operator's chosen lyric style — family, weight, italic, color
// and outline — rather than having a hardcoded look of its own, since it is
// part of what the congregation reads. Only its size differs, which is what
// keeps it reading as a reference rather than a line of the passage.
//
// Positioned absolutely so showing it never shifts the verse off centre; every
// surface that renders slide text renders this too (Live output, Previous,
// Next up, the slides grid, Present, and the audience window), so a caption is
// never a surprise that only appears once it's already live.
export function SlideCaption({ caption, lyricStyle, fontClassName, baseFontSize, ratio, bottom }: SlideCaptionProps) {
  if (!caption) return null;

  const fontSize = "calc(" + baseFontSize + " * " + ratio + ")";
  // Scaled with the text — a 2px stroke sized for a 26px verse would swallow a
  // 6px caption whole.
  const outlineWidth = lyricStyle.outlineWidth ? lyricStyle.outlineWidth * ratio : 0;

  return (
    <div className="absolute inset-x-0 flex justify-center z-2 pointer-events-none px-[6%]" style={{ bottom }}>
      <span
        className={cx(fontClassName, "truncate")}
        style={{
          fontSize,
          fontWeight: lyricStyle.bold ? 700 : undefined,
          fontStyle: lyricStyle.italic ? "italic" : undefined,
          // Matches how bigLine/the stage lines default an unset color, so the
          // caption never falls back to the panel's own text color on a dark
          // background.
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
