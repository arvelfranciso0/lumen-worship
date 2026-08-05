"use client";

import { useEffect, useState } from "react";
import { cx } from "./cx";
import { DEFAULT_LYRIC_STYLE, LOOKS } from "./data";
import { getElectronDisplay, type OutputState } from "./electronDisplay";
import { HighlightedLine } from "./HighlightedLine";
import { LookBackground } from "./LookBackground";
import { SlideCaption } from "./SlideCaption";
import {
  stageFontSize, stageLineStyle,
  STAGE_CANVAS_SCREEN, STAGE_CAPTION_BOTTOM_SCREEN, STAGE_CAPTION_RATIO, STAGE_LINE_GAP_SCREEN,
} from "./stage";
import { DEFAULT_TRANSITION_MS, useSlideTransition } from "./useSlideTransition";

const DEFAULT_OUTPUT_STATE: OutputState = {
  lines: [], look: LOOKS[0], black: false, hidden: false,
  lyricStyle: DEFAULT_LYRIC_STYLE, fontClassName: "font-sans", scale: 1, fit: 1, caption: "",
  slideKey: "", transitionType: "cut", transitionDurationMs: DEFAULT_TRANSITION_MS, performanceMode: false,
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
    slideKey, transitionType, transitionDurationMs, performanceMode, compare,
  } = outputState;
  const stageLines = hidden ? [] : lines;
  const slideTransitionStyle = useSlideTransition(transitionType, transitionDurationMs, performanceMode);
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
  // Identical proportions to every other surface (see stage.ts). `fit` arrives
  // in the pushed state rather than being recomputed, since this window renders
  // outside the operator's React tree.
  const lineStyle = stageLineStyle(lyricStyle, scale, fit, "vw");

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <LookBackground look={look} black={black} />
      <div className={cx(STAGE_CANVAS_SCREEN, fontClassName)}>
        <div key={slideKey} style={slideTransitionStyle} className={cx("flex flex-col items-center", STAGE_LINE_GAP_SCREEN)}>
          {compare && !hidden ? (
            compare.lines.map((line, compareIndex) => (
              <div key={compareIndex} style={lineStyle}>
                <span className="text-[0.55em] align-super mr-[0.25em]">{compare.verseNumber}</span>
                {line}
              </div>
            ))
          ) : (
            stageLines.map((line, lineIndex) => (
              <div key={lineIndex} style={lineStyle}>
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
        baseFontSize={stageFontSize(scale, fit, "vw")}
        ratio={STAGE_CAPTION_RATIO}
        bottom={STAGE_CAPTION_BOTTOM_SCREEN}
      />
    </div>
  );
}
