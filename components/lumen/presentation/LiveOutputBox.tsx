"use client";

import type { CSSProperties, RefObject } from "react";
import type { LookOption, LyricStyle } from "../data";
import { LookBackground } from "./LookBackground";
import { SlideStage } from "./SlideStage";
import type { UseLumen } from "../useLumen";

// Minimum caption font size for the live output box.
const LIVE_CAPTION_MIN_SIZE = "7px";

// The audience-facing Live output box: current slide, plus a LIVE badge while presenting.
export function LiveOutputBox({
  liveOutputRef, cur, curLook, black, presentingPreview, hidden, lyricStyle, fontClassName, scale,
  transitionStyle, transitionKey, outputAspectRatio, isPresenting,
}: {
  liveOutputRef: RefObject<HTMLDivElement | null>;
  cur: UseLumen["cur"];
  curLook: LookOption;
  black: boolean;
  presentingPreview: boolean;
  hidden: boolean;
  lyricStyle: LyricStyle;
  fontClassName: string;
  scale: number;
  transitionStyle: CSSProperties;
  transitionKey: number;
  outputAspectRatio: number;
  isPresenting: boolean;
}) {
  return (
    <div className="flex flex-col gap-2.5 flex-none">
      <div className="flex items-center gap-2.5 flex-none">
        <span className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">Live output</span>
        <span className="text-[12.5px] text-muted truncate">{cur.label}</span>
      </div>
      {/* containerType "size" scales SlideStage's contents to this box's dimensions. */}
      <div
        className="relative w-full rounded-2xl overflow-hidden border border-border2 bg-black shadow-app flex-none"
        style={{ aspectRatio: outputAspectRatio, containerType: "size" }}
      >
        {/* Preview mode only while the single-monitor fullscreen overlay is active. */}
        <LookBackground look={curLook} black={black} preview={presentingPreview} />
        <SlideStage
          stageRef={liveOutputRef}
          selectable
          lines={cur.lines}
          lineHighlights={cur.lineHighlights}
          compareVerseNumber={cur.compare?.verseNumber}
          caption={cur.caption}
          lyricStyle={lyricStyle}
          fontClassName={fontClassName}
          scale={scale}
          hidden={hidden}
          transitionStyle={transitionStyle}
          transitionKey={transitionKey}
          captionMinFontSize={LIVE_CAPTION_MIN_SIZE}
        />
        {isPresenting && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 p-[4px_8px] rounded-5 bg-[rgba(0,0,0,.45)] backdrop-blur">
            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
            <span className="font-mono text-[9.5px] text-white tracking-[.06em]">LIVE</span>
          </div>
        )}
      </div>
    </div>
  );
}
