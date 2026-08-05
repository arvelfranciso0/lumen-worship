"use client";

import { cx } from "./cx";
import { HighlightedLine } from "./HighlightedLine";
import { LookBackground } from "./LookBackground";
import { SlideCaption } from "./SlideCaption";
import {
  fitForLines, stageFontSize, stageLineStyle,
  STAGE_CANVAS_SCREEN, STAGE_CAPTION_BOTTOM_SCREEN, STAGE_CAPTION_RATIO, STAGE_LINE_GAP_SCREEN,
} from "./stage";
import type { UseLumen } from "./useLumen";
import { useSlideTransition } from "./useSlideTransition";

export function PresentationOverlay({ lumen }: { lumen: UseLumen }) {
  const { state, cur, hidden, look, allLooks, idx } = lumen;
  const slideTransitionStyle = useSlideTransition(state.transitionType, state.transitionDurationMs, state.performanceMode);
  if (!state.presenting) return null;

  const effectiveLook = (cur.lookId && allLooks.find((l) => l.id === cur.lookId)) || look;
  const stageLines = hidden ? [] : cur.lines;
  // Same proportions as every preview box (see stage.ts) — only the unit differs,
  // vw against the real screen instead of cqw against a preview's own box.
  const fit = fitForLines(cur.lines);
  const lineStyle = stageLineStyle(state.lyricStyle, state.scale, fit, "vw");
  // The slide's own caption — in Bible Compare it already names both
  // translations, since the comparison is part of the slide rather than an
  // overlay on top of it. Pinned to the bottom of the screen rather than sitting
  // in the text column, so adding it never shifts the verse off centre.
  // Suppressed when the slide has no actual text (see PreviewPanel for why an
  // undownloaded translation gets here) — a reference with no verse under it is
  // worse than showing nothing.
  const stageCaption = hidden || !cur.lines.some((line) => line.trim().length > 0) ? "" : cur.caption;
  return (
    <div className="fixed inset-0 z-[200] bg-black overflow-hidden">
      <LookBackground look={effectiveLook} black={state.black} />
      <div className={cx(STAGE_CANVAS_SCREEN, lumen.lyricFamily)}>
        <div key={idx} style={slideTransitionStyle} className={cx("flex flex-col items-center", STAGE_LINE_GAP_SCREEN)}>
          {stageLines.map((line, lineIndex) => (
            <div key={lineIndex} style={lineStyle}>
              {/* Bible Compare stacks both translations' wording, each prefixed
                  with the shared verse number. */}
              {cur.compare && <span className="text-[0.55em] align-super mr-[0.25em]">{cur.compare.verseNumber}</span>}
              <HighlightedLine line={line} highlights={cur.lineHighlights?.[lineIndex]} />
            </div>
          ))}
        </div>
      </div>
      <SlideCaption
        caption={stageCaption}
        lyricStyle={state.lyricStyle}
        fontClassName={lumen.lyricFamily}
        baseFontSize={stageFontSize(state.scale, fit, "vw")}
        ratio={STAGE_CAPTION_RATIO}
        bottom={STAGE_CAPTION_BOTTOM_SCREEN}
      />
      <div className="absolute bottom-[18px] right-[22px] font-mono text-[11px] text-[rgba(255,255,255,.16)]">Esc</div>
    </div>
  );
}
