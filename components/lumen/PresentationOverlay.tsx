"use client";

import { cx } from "./cx";
import { lyricStyleCss } from "./data";
import { HighlightedLine } from "./HighlightedLine";
import { LookBackground } from "./LookBackground";
import { SlideCaption } from "./SlideCaption";
import type { UseLumen } from "./useLumen";
import { useSlideTransition } from "./useSlideTransition";

// Same caption-to-lyric proportion the operator screen uses, so what the
// congregation sees matches what was previewed.
const CAPTION_RATIO = 0.3;

export function PresentationOverlay({ lumen }: { lumen: UseLumen }) {
  const { state, cur, hidden, look, allLooks, idx, liveCompare } = lumen;
  const slideTransitionStyle = useSlideTransition(state.transitionType, state.transitionSpeedPct, state.performanceMode);
  if (!state.presenting) return null;

  const effectiveLook = (cur.lookId && allLooks.find((l) => l.id === cur.lookId)) || look;
  const stageLines = hidden ? [] : cur.lines;
  const longestLineLength = cur.lines.reduce((maxLength, line) => Math.max(maxLength, line.length), 0);
  const fit = longestLineLength > 110 ? 0.62 : longestLineLength > 70 ? 0.78 : 1;
  // Compare mode carries its own reference caption (both translation codes);
  // otherwise the slide's own caption is used. Either way it's pinned to the
  // bottom of the screen rather than sitting in the text column, so adding it
  // never shifts the verse off centre. Suppressed when the slide has no actual
  // text (see PreviewPanel for why an undownloaded translation gets here) — a
  // reference with no verse under it is worse than showing nothing.
  const captionLines = liveCompare ? liveCompare.lines : cur.lines;
  const stageCaption = hidden || !captionLines.some((line) => line.trim().length > 0)
    ? ""
    : liveCompare ? liveCompare.caption : cur.caption;
  const lineClassName = cx(lumen.lyricFamily, "font-semibold tracking-[-0.02em] text-white leading-[1.24] [text-shadow:0_4px_60px_rgba(0,0,0,.55)]");

  return (
    <div className="fixed inset-0 z-[200] bg-black overflow-hidden">
      <LookBackground look={effectiveLook} black={state.black} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[2.2vh] p-[8vh_10vw] text-center z-[1]">
        <div key={idx} style={slideTransitionStyle} className="flex flex-col items-center gap-[2.2vh]">
          {liveCompare && !hidden ? (
            liveCompare.lines.map((line, compareIndex) => (
              <div key={compareIndex} className={lineClassName} style={{ fontSize: 4.4 * state.scale * fit + "vw", ...lyricStyleCss(state.lyricStyle) }}>
                <span className="text-[0.55em] align-super mr-[0.25em]">{liveCompare.verseNumber}</span>
                {line}
              </div>
            ))
          ) : (
            stageLines.map((line, lineIndex) => (
              <div
                key={lineIndex}
                className={lineClassName}
                style={{ fontSize: 4.4 * state.scale * fit + "vw", ...lyricStyleCss(state.lyricStyle) }}
              >
                <HighlightedLine line={line} highlights={cur.lineHighlights?.[lineIndex]} />
              </div>
            ))
          )}
        </div>
      </div>
      <SlideCaption
        caption={stageCaption}
        lyricStyle={state.lyricStyle}
        fontClassName={lumen.lyricFamily}
        baseFontSize={4.4 * state.scale * fit + "vw"}
        ratio={CAPTION_RATIO}
        bottom="4vh"
      />
      <div className="absolute bottom-[18px] right-[22px] font-mono text-[11px] text-[rgba(255,255,255,.16)]">Esc</div>
    </div>
  );
}
