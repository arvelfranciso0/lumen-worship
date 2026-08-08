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
  // Bible Compare: the shared verse number, rendered as a superscript.
  compareVerseNumber?: string;
  caption: string;
  lyricStyle: LyricStyle;
  fontClassName: string;
  scale: number;
  // Fades the text out without disturbing layout, and suppresses the caption.
  hidden?: boolean;
  transitionStyle?: CSSProperties;
  transitionKey?: string | number;
  // Live output only: lets the operator select lyric text on the box.
  stageRef?: Ref<HTMLDivElement>;
  selectable?: boolean;
  // Floor for the caption size on small surfaces.
  captionMinFontSize?: string;
};

// The lyric/verse lines and reference caption, sized in container-query units.
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
            // Compare slides are never tagged for selection.
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
