"use client";

import { useEffect, useState } from "react";
import { cx } from "./cx";
import { DEFAULT_LYRIC_STYLE, LOOKS, lyricStyleCss } from "./data";
import { getElectronDisplay, type OutputState } from "./electronDisplay";
import { HighlightedLine } from "./HighlightedLine";
import { LookBackground } from "./LookBackground";
import { SlideCaption } from "./SlideCaption";
import { useSlideTransition } from "./useSlideTransition";

// Kept in step with PresentationOverlay's own ratio — these two render the same
// audience view, just in different windows.
const CAPTION_RATIO = 0.3;

const DEFAULT_OUTPUT_STATE: OutputState = {
  lines: [], look: LOOKS[0], black: false, hidden: false,
  lyricStyle: DEFAULT_LYRIC_STYLE, fontClassName: "font-sans", scale: 1, fit: 1, caption: "",
  slideKey: "", transitionType: "cut", transitionSpeedPct: 50, performanceMode: false,
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
    console.log("[output] OutputWindowApp mounted; electronDisplay bridge present:", !!electronDisplay);
    if (!electronDisplay) return;
    const unsubscribe = electronDisplay.onState((newState) => {
      console.log("[output] received state push:", newState);
      setOutputState(newState);
    });
    electronDisplay.notifyReady();
    console.log("[output] notifyReady() sent");
    return unsubscribe;
  }, []);

  const {
    lines, lineHighlights, look, black, hidden, lyricStyle, fontClassName, scale, fit, caption,
    slideKey, transitionType, transitionSpeedPct, performanceMode, compare,
  } = outputState;
  const stageLines = hidden ? [] : lines;
  const slideTransitionStyle = useSlideTransition(transitionType, transitionSpeedPct, performanceMode);
  // Compare mode carries its own reference caption (both translation codes);
  // otherwise the slide's own caption is used. Pinned to the bottom of the
  // screen either way, so showing it never shifts the verse off centre.
  // Suppressed when the slide has no actual text, so an undownloaded
  // translation can't put a bare reference on the audience screen with no verse
  // under it (see PreviewPanel for the full reasoning).
  const captionLines = compare ? compare.lines : lines;
  const stageCaption = hidden || !captionLines.some((line) => line.trim().length > 0)
    ? ""
    : compare ? compare.caption : caption;
  const lineClassName = cx(fontClassName, "font-semibold tracking-[-0.02em] text-white leading-[1.24] [text-shadow:0_4px_60px_rgba(0,0,0,.55)]");

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <LookBackground look={look} black={black} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[2.2vh] p-[8vh_10vw] text-center z-1">
        <div key={slideKey} style={slideTransitionStyle} className="flex flex-col items-center gap-[2.2vh]">
          {compare && !hidden ? (
            compare.lines.map((line, compareIndex) => (
              <div key={compareIndex} className={lineClassName} style={{ fontSize: 4.4 * scale * fit + "vw", ...lyricStyleCss(lyricStyle) }}>
                <span className="text-[0.55em] align-super mr-[0.25em]">{compare.verseNumber}</span>
                {line}
              </div>
            ))
          ) : (
            stageLines.map((line, lineIndex) => (
              <div
                key={lineIndex}
                className={lineClassName}
                style={{ fontSize: 4.4 * scale * fit + "vw", ...lyricStyleCss(lyricStyle) }}
              >
                <HighlightedLine line={line} highlights={lineHighlights?.[lineIndex]} />
              </div>
            ))
          )}
        </div>
      </div>
      <SlideCaption
        caption={stageCaption}
        lyricStyle={lyricStyle}
        fontClassName={fontClassName}
        baseFontSize={4.4 * scale * fit + "vw"}
        ratio={CAPTION_RATIO}
        bottom="4vh"
      />
    </div>
  );
}
