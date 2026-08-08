"use client";

import { cx } from "../cx";
import type { LookOption, LyricStyle } from "../data";
import { LookBackground } from "./LookBackground";
import { SlideStage } from "./SlideStage";
import type { UseLumen } from "../useLumen";

const PREVIEW_CAPTION_MIN_SIZE = "6px";

type PreviewThumbnailVariant = "previous" | "next";

const VARIANT_STYLES: Record<
  PreviewThumbnailVariant,
  { labelClassName: string; boundaryBadgeClassName: string; boxClassName: string; badgeTextClassName: string }
> = {
  previous: {
    labelClassName: "text-faint",
    boundaryBadgeClassName: "text-faint border-border",
    boxClassName: "rounded-2 opacity-60",
    badgeTextClassName: "text-white/85",
  },
  next: {
    labelClassName: "text-accent",
    boundaryBadgeClassName: "text-warn border-warn",
    boxClassName: "rounded-2.5 border-2 border-accent box-border",
    badgeTextClassName: "text-white/90",
  },
};

// A Previous/Next-up mini preview: section label, boundary badge, and a scaled-down slide.
export function PreviewThumbnail({
  variant, sectionLabel, boundaryLabel, slide, look, black, outputAspectRatio, lyricStyle, fontClassName, scale,
}: {
  variant: PreviewThumbnailVariant;
  sectionLabel: string;
  boundaryLabel: string | null;
  slide: UseLumen["nxt"];
  look: LookOption;
  black?: boolean;
  outputAspectRatio: number;
  lyricStyle: LyricStyle;
  fontClassName: string;
  scale: number;
}) {
  const variantStyle = VARIANT_STYLES[variant];

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 min-w-0">
        <div className={cx("text-[10px] font-semibold tracking-[.06em] uppercase flex-none", variantStyle.labelClassName)}>
          {sectionLabel}
        </div>
        {!slide && boundaryLabel && (
          <span
            className={cx(
              "text-[8.5px] font-bold tracking-wider uppercase border rounded-full px-1.25 py-px min-w-0 truncate",
              variantStyle.boundaryBadgeClassName
            )}
          >
            {boundaryLabel}
          </span>
        )}
      </div>
      <div
        className={cx("relative w-full overflow-hidden mt-1.5 flex-none", variantStyle.boxClassName)}
        style={{ aspectRatio: outputAspectRatio, containerType: "size" }}
      >
        <LookBackground look={look} black={black} preview />
        {slide && (
          <div
            className={cx(
              "absolute top-1.25 left-1.5 text-[8px] font-bold tracking-[.06em] uppercase bg-[rgba(0,0,0,.5)] px-1.25 py-px rounded-1 z-2 max-w-[60%] truncate",
              variantStyle.badgeTextClassName
            )}
          >
            {slide.label}
          </div>
        )}
        <SlideStage
          lines={slide ? slide.lines : ["—"]}
          lineHighlights={slide?.lineHighlights}
          compareVerseNumber={slide?.compare?.verseNumber}
          caption={slide?.caption ?? ""}
          lyricStyle={lyricStyle}
          fontClassName={fontClassName}
          scale={scale}
          captionMinFontSize={PREVIEW_CAPTION_MIN_SIZE}
        />
      </div>
    </div>
  );
}
