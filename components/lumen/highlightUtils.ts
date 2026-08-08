import type { HighlightRange } from "./data";

// Splits a line into plain/highlighted segments for rendering.
export function splitLineIntoSegments(line: string, ranges?: HighlightRange[]): { text: string; color?: string }[] {
  if (!ranges || ranges.length === 0) return [{ text: line }];
  const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);
  const segments: { text: string; color?: string }[] = [];
  let cursor = 0;
  for (const range of sortedRanges) {
    const start = Math.max(cursor, Math.min(range.start, line.length));
    const end = Math.max(start, Math.min(range.end, line.length));
    if (start > cursor) segments.push({ text: line.slice(cursor, start) });
    if (end > start) segments.push({ text: line.slice(start, end), color: range.color });
    cursor = Math.max(cursor, end);
  }
  if (cursor < line.length) segments.push({ text: line.slice(cursor) });
  return segments.length ? segments : [{ text: line }];
}

// Removes or clips existing ranges that overlap [start, end).
export function subtractHighlightRange(ranges: HighlightRange[], start: number, end: number): HighlightRange[] {
  const result: HighlightRange[] = [];
  for (const range of ranges) {
    if (range.end <= start || range.start >= end) { result.push(range); continue; }
    if (range.start < start) result.push({ ...range, end: start });
    if (range.end > end) result.push({ ...range, start: end });
  }
  return result;
}

export function addHighlightRange(ranges: HighlightRange[], newRange: HighlightRange): HighlightRange[] {
  return [...subtractHighlightRange(ranges, newRange.start, newRange.end), newRange].sort((a, b) => a.start - b.start);
}

export function bibleHighlightKey(translation: string, book: string, chapter: number, verseNumber: number): string {
  return translation + "|" + book + "|" + chapter + "|" + verseNumber;
}
