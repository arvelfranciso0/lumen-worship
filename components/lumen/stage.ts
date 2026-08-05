import type { CSSProperties } from "react";
import { lyricStyleCss, type LyricStyle } from "./data";

// One definition of how slide text is laid out, shared by every surface that
// renders it — Live output, Slides, Previous, Next up, the fullscreen Present
// overlay and the audience window.
//
// Every size here is a fraction of the surface itself, never a fixed pixel
// value. The audience renderers measure against the viewport (vw/vh); the
// operator screen's preview boxes measure against their own box (cqw/cqh, via
// `container-type: size` plus the output's aspect ratio). That is what makes
// each preview a scale model of the real display instead of a separately
// hand-tuned approximation: dragging a panel wider or pressing A−/A+ moves all
// of them together, because all of them are reading these same numbers.
//
// Fixed px would break that twice over — the same text would wrap at different
// words on every surface, and again at every panel width.

// Lyric size, as a percentage of the surface's width.
export const STAGE_FONT_SIZE_RATIO = 4.4;
export const STAGE_LINE_HEIGHT = 1.24;
export const STAGE_LETTER_SPACING = "-0.02em";
// Reference caption size, as a fraction of the lyric size above.
export const STAGE_CAPTION_RATIO = 0.3;

// Tailwind only sees class names it can find as literal strings in the source,
// so the two unit variants are spelled out rather than assembled at runtime —
// a template like `p-[8${unit}]` compiles to no CSS at all.
export const STAGE_CANVAS_BOX =
  "absolute inset-0 flex flex-col items-center justify-center gap-[2.2cqh] p-[8cqh_10cqw] text-center z-[1]";
export const STAGE_LINE_GAP_BOX = "gap-[2.2cqh]";
export const STAGE_CAPTION_BOTTOM_BOX = "4cqh";
export const STAGE_CANVAS_SCREEN =
  "absolute inset-0 flex flex-col items-center justify-center gap-[2.2vh] p-[8vh_10vw] text-center z-[1]";
export const STAGE_LINE_GAP_SCREEN = "gap-[2.2vh]";
export const STAGE_CAPTION_BOTTOM_SCREEN = "4vh";

// Width units: `cqw` measures against a preview box, `vw` against the real
// screen. Everything else about a surface's layout follows from this choice.
export type StageWidthUnit = "cqw" | "vw";

// Long lines shrink so a wordy verse still fits the surface. Character-count
// based rather than measured, deliberately: it has to give the same answer on
// every surface (and inside the audience window, which never runs useLumen), and
// a measured fit would differ per box and reintroduce exactly the inconsistency
// this module exists to remove.
export function fitForLines(lines: string[]): number {
  const longestLineLength = lines.reduce((maxLength, line) => Math.max(maxLength, line.length), 0);
  return longestLineLength > 110 ? 0.62 : longestLineLength > 70 ? 0.78 : 1;
}

export function stageFontSize(scale: number, fit: number, unit: StageWidthUnit = "cqw"): string {
  return STAGE_FONT_SIZE_RATIO * scale * fit + unit;
}

// The operator's lyric style applied on top of the stage defaults. lyricStyleCss
// leaves a property undefined when that option is off, and spreading it would
// then clobber the defaults with undefined — so each one is merged explicitly.
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
    // In em, not px, for the same reason as everything else here: a 60px halo
    // sized for a projector would swallow a thumbnail whole.
    textShadow: "0 0.047em 0.71em rgba(0,0,0,.55)",
  };
}
