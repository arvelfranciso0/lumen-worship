"use client";

import type { CSSProperties, Ref } from "react";
import { cx } from "./cx";
import type { HighlightRange, LyricStyle } from "./data";
import { HighlightedLine } from "./HighlightedLine";
import { SlideCaption } from "./SlideCaption";
import {
  fitForLines, stageFontSize, stageLineStyle,
  STAGE_CANVAS_BOX, STAGE_CAPTION_BOTTOM_BOX, STAGE_CAPTION_RATIO, STAGE_LINE_GAP_BOX,
} from "./stage";

type SlideStageProps = {
  lines: string[];
  lineHighlights?: HighlightRange[][];
  // Bible Compare: the shared verse number both translations' lines carry as a
  // superscript (see the Slide type's `compare` field).
  compareVerseNumber?: string;
  caption: string;
  lyricStyle: LyricStyle;
  // The lyric font's utility class (lumen.lyricFamily).
  fontClassName: string;
  // The operator's A−/A+ lyric size (state.scale). Passed in rather than read
  // from a hook so this component stays usable from any surface.
  scale: number;
  // Blank/Black — fades the text out without disturbing the layout, and
  // suppresses the caption (a bare reference over an empty screen is worse than
  // nothing).
  hidden?: boolean;
  transitionStyle?: CSSProperties;
  // Changes once per live-slide change, so the transition animation restarts.
  transitionKey?: string | number;
  // Live output only: lets the operator select lyric text directly on the box.
  // Tagging lines with data-line-index is what PreviewPanel's selection handler
  // resolves offsets against.
  stageRef?: Ref<HTMLDivElement>;
  selectable?: boolean;
  // Floor for the caption size — only needed on surfaces small enough for the
  // honest fraction to come out illegible.
  captionMinFontSize?: string;
};

// The slide itself, as every surface renders it: the lyric/verse lines and the
// reference caption, sized entirely in container-query units against whatever
// box contains them.
//
// That container must declare `container-type: size` and carry the output's
// aspect ratio — then this component is the *only* thing that decides how a
// slide looks, and Live output, Slides, Previous and Next up cannot drift apart.
// They previously each hardcoded their own font size (26px, 11px, 10px, 8px),
// which is why resizing a panel or pressing A−/A+ moved one of them and left the
// other three behind.
export function SlideStage({
  lines, lineHighlights, compareVerseNumber, caption, lyricStyle, fontClassName, scale,
  hidden = false, transitionStyle, transitionKey, stageRef, selectable = false, captionMinFontSize,
}: SlideStageProps) {
  const fit = fitForLines(lines);
  const lineStyle = stageLineStyle(lyricStyle, scale, fit);
  const hasText = lines.some((line) => line.trim().length > 0);
  const visibleCaption = hidden || !hasText ? "" : caption;

  return (
    <>
      <div
        ref={stageRef}
        className={cx(
          STAGE_CANVAS_BOX, fontClassName,
          "transition-opacity duration-180 ease-in-out",
          hidden ? "opacity-0" : "opacity-100"
        )}
      >
        <div key={transitionKey} style={transitionStyle} className={cx("flex flex-col items-center w-full", STAGE_LINE_GAP_BOX)}>
          {lines.map((line, lineIndex) => (
            // Compare slides are never tagged for selection: highlights are
            // recorded against the primary translation's reference, so a
            // selection over the compared wording has nowhere to be stored.
            <div
              key={lineIndex}
              data-line-index={selectable && !compareVerseNumber ? lineIndex : undefined}
              style={lineStyle}
            >
              {compareVerseNumber && <span className="text-[0.55em] align-super mr-[0.25em]">{compareVerseNumber}</span>}
              <HighlightedLine line={line} highlights={lineHighlights?.[lineIndex]} />
            </div>
          ))}
        </div>
      </div>
      <SlideCaption
        caption={visibleCaption}
        lyricStyle={lyricStyle}
        fontClassName={fontClassName}
        baseFontSize={stageFontSize(scale, fit)}
        ratio={STAGE_CAPTION_RATIO}
        minFontSize={captionMinFontSize}
        bottom={STAGE_CAPTION_BOTTOM_BOX}
      />
    </>
  );
}
