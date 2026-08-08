export const DEFAULT_OUTLINE_COLOR = "#000000";
export const OUTLINE_WIDTH_MIN = 0.5;
export const OUTLINE_WIDTH_MAX = 8;
export const OUTLINE_WIDTH_STEP = 0.5;
export const OUTLINE_WIDTH_DEFAULT = 2;
export const LYRIC_SCALE_MIN = 0.7;
export const LYRIC_SCALE_MAX = 1.5;
export const LYRIC_SCALE_STEP_PCT = 10;

// Clamps an outline width into its valid range.
export function clampOutlineWidth(width: number): number {
  return Math.min(OUTLINE_WIDTH_MAX, Math.max(0, width));
}

// Clamps a lyric scale percentage and converts it back to a scale factor.
export function scaleFromPercent(percent: number): number {
  return Math.min(LYRIC_SCALE_MAX, Math.max(LYRIC_SCALE_MIN, +(percent / 100).toFixed(2)));
}
