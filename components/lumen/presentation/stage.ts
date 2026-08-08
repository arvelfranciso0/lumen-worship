import type { CSSProperties } from "react";
import { lyricStyleCss, type LyricStyle } from "../data";

// Shared slide layout (sizes as fractions of the surface, never fixed px), used by every surface that renders slide text.

// Lyric size, as a percentage of the surface's width.
export const STAGE_FONT_SIZE_RATIO = 4.4;
export const STAGE_LINE_HEIGHT = 1.24;
export const STAGE_LETTER_SPACING = "-0.02em";
// Reference caption size, as a fraction of the lyric size above.
export const STAGE_CAPTION_RATIO = 0.3;

// Unit variants spelled out literally since Tailwind can't compile assembled class names.
export const STAGE_CANVAS_BOX =
  "absolute inset-0 flex flex-col items-center justify-center gap-[2.2cqh] p-[8cqh_10cqw] text-center z-[1]";
export const STAGE_LINE_GAP_BOX = "gap-[2.2cqh]";
export const STAGE_CAPTION_BOTTOM_BOX = "4cqh";
export const STAGE_CANVAS_SCREEN =
  "absolute inset-0 flex flex-col items-center justify-center gap-[2.2vh] p-[8vh_10vw] text-center z-[1]";
export const STAGE_LINE_GAP_SCREEN = "gap-[2.2vh]";
export const STAGE_CAPTION_BOTTOM_SCREEN = "4vh";

// Width unit: cqw measures against a preview box, vw against the real screen.
export type StageWidthUnit = "cqw" | "vw";

// Shrinks long lines, by character count, so a wordy verse still fits the surface.
export function fitForLines(lines: string[]): number {
  const longestLineLength = lines.reduce((maxLength, line) => Math.max(maxLength, line.length), 0);
  return longestLineLength > 200 ? 0.72 : longestLineLength > 150 ? 0.88 : 1;
}

export function stageFontSize(scale: number, fit: number, unit: StageWidthUnit = "cqw"): string {
  return STAGE_FONT_SIZE_RATIO * scale * fit + unit;
}

// Merges the operator's lyric style on top of the stage defaults.
export function stageLineStyle(
  lyricStyle: LyricStyle, scale: number, fit: number, unit: StageWidthUnit = "cqw"
): CSSProperties {
  const styleCss = lyricStyleCss(lyricStyle);
  return {
    fontSize: stageFontSize(scale, fit, unit),
    lineHeight: STAGE_LINE_HEIGHT,
    letterSpacing: STAGE_LETTER_SPACING,
    fontWeight: styleCss.fontWeight ?? 600,
    fontStyle: styleCss.fontStyle,
    color: styleCss.color ?? "#fff",
    WebkitTextStroke: styleCss.WebkitTextStroke,
    // In em, not px, so the halo scales with the surface.
    textShadow: "0 0.047em 0.71em rgba(0,0,0,.55)",
  };
}
