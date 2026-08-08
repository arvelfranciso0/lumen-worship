import type { HighlightRange } from "./data";
import { splitLineIntoSegments } from "./data";

// Renders one lyric line as plain text plus colored spans for highlighted ranges.
export function HighlightedLine({ line, highlights }: { line: string; highlights?: HighlightRange[] }) {
  const segments = splitLineIntoSegments(line, highlights);
  return (
    <>
      {segments.map((segment, segmentIndex) => (
        segment.color ? (
          <span key={segmentIndex} style={{ backgroundColor: segment.color }}>{segment.text}</span>
        ) : (
          <span key={segmentIndex}>{segment.text}</span>
        )
      ))}
    </>
  );
}
