"use client";

import { useEffect, useState } from "react";
import { cx } from "./cx";
import { DEFAULT_LYRIC_STYLE, LOOKS, lyricStyleCss } from "./data";
import { getElectronDisplay, type OutputState } from "./electronDisplay";
import { HighlightedLine } from "./HighlightedLine";
import { LookBackground } from "./LookBackground";

const DEFAULT_OUTPUT_STATE: OutputState = {
  lines: [], look: LOOKS[0], black: false, hidden: false,
  lyricStyle: DEFAULT_LYRIC_STYLE, fontClassName: "font-sans", scale: 1, fit: 1, caption: "",
};

// The whole content of the second, audience-facing monitor. Deliberately
// dumb: no useLumen, no repository access, no keyboard shortcuts — it only
// ever renders whatever the operator window last pushed over IPC (see
// useLumen.ts's output-sync effect), so there's exactly one source of truth
// for what the congregation sees.
export function OutputWindowApp() {
  const [outputState, setOutputState] = useState<OutputState>(DEFAULT_OUTPUT_STATE);

  useEffect(() => {
    const electronDisplay = getElectronDisplay();
    if (!electronDisplay) return;
    const unsubscribe = electronDisplay.onState(setOutputState);
    electronDisplay.notifyReady();
    return unsubscribe;
  }, []);

  const { lines, lineHighlights, look, black, hidden, lyricStyle, fontClassName, scale, fit, caption } = outputState;
  const stageLines = hidden ? [] : lines;
  const hasCaption = !!caption && !hidden;

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <LookBackground look={look} black={black} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[2.2vh] p-[8vh_10vw] text-center z-[1]">
        {stageLines.map((line, lineIndex) => (
          <div
            key={lineIndex}
            className={cx(fontClassName, "font-semibold tracking-[-0.02em] text-white leading-[1.24] [text-shadow:0_4px_60px_rgba(0,0,0,.55)]")}
            style={{ fontSize: 4.4 * scale * fit + "vw", ...lyricStyleCss(lyricStyle) }}
          >
            <HighlightedLine line={line} highlights={lineHighlights?.[lineIndex]} />
          </div>
        ))}
        {hasCaption && (
          <div className="font-mono text-[1.5vw] tracking-[.12em] mt-[3vh] text-[rgba(255,255,255,.55)]">
            {caption}
          </div>
        )}
      </div>
    </div>
  );
}
