"use client";

import { cx } from "./cx";
import { lyricStyleCss } from "./data";
import { HighlightedLine } from "./HighlightedLine";
import { LookBackground } from "./LookBackground";
import type { UseLumen } from "./useLumen";

export function PresentationOverlay({ lumen }: { lumen: UseLumen }) {
  const { state, cur, hidden, look } = lumen;
  if (!state.presenting) return null;

  const stageLines = hidden ? [] : cur.lines;
  const hasStageCaption = !!cur.caption && !hidden;
  const longestLineLength = cur.lines.reduce((maxLength, line) => Math.max(maxLength, line.length), 0);
  const fit = longestLineLength > 110 ? 0.62 : longestLineLength > 70 ? 0.78 : 1;

  return (
    <div className="fixed inset-0 z-[200] bg-black overflow-hidden">
      <LookBackground look={look} black={state.black} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[2.2vh] p-[8vh_10vw] text-center z-[1]">
        {stageLines.map((line, lineIndex) => (
          <div
            key={lineIndex}
            className={cx(lumen.lyricFamily, "font-semibold tracking-[-0.02em] text-white leading-[1.24] [text-shadow:0_4px_60px_rgba(0,0,0,.55)]")}
            style={{ fontSize: 4.4 * state.scale * fit + "vw", ...lyricStyleCss(state.lyricStyle) }}
          >
            <HighlightedLine line={line} highlights={cur.lineHighlights?.[lineIndex]} />
          </div>
        ))}
        {hasStageCaption && (
          <div className="font-mono text-[1.5vw] tracking-[.12em] mt-[3vh] text-[rgba(255,255,255,.55)]">
            {cur.caption}
          </div>
        )}
      </div>
      <div className="absolute bottom-[18px] right-[22px] font-mono text-[11px] text-[rgba(255,255,255,.16)]">Esc</div>
    </div>
  );
}
