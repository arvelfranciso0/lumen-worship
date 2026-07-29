import type { HighlightRange } from "./data";
import { splitLineIntoSegments } from "./data";

// Renders one lyric line as plain text plus colored <span>s for whatever
// ranges are highlighted — used at every render surface (MainPanel,
// PresentationOverlay, SlidesStrip) so a highlight applies to just the
// selected text, not the whole line/screen.
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
