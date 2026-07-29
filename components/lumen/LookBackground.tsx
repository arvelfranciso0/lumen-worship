"use client";

import { cx } from "./cx";
import { isCustomBackground, type LookOption } from "./data";

type LookBackgroundProps = {
  look: LookOption;
  black?: boolean;
  // True for every spot that isn't the actual audience-facing output (the
  // Toolbar/Settings pickers, slide thumbnails, the "Next up" box) — a video
  // look then renders its captured poster frame instead of an independent
  // live decode, since a dozen simultaneous full-res video decodes is what
  // actually causes the lag, not the source file's resolution.
  preview?: boolean;
  className?: string;
};

// Renders whatever a "Look" actually is: a builtin CSS gradient, an uploaded
// image, or an uploaded video (which — unlike a gradient — can't be done as a
// CSS `background` and needs a real <video> element).
export function LookBackground({ look, black, preview, className }: LookBackgroundProps) {
  const baseClassName = cx("absolute inset-0", className);

  if (black) return <div className={cx(baseClassName, "bg-black")} />;

  if (isCustomBackground(look)) {
    if (look.mediaType === "video") {
      if (preview && look.posterUrl) {
        return (
          // eslint-disable-next-line @next/next/no-img-element -- runtime data URL, not a static asset next/image can optimize
          <img src={look.posterUrl} alt="" className={cx(baseClassName, "w-full h-full object-cover")} />
        );
      }
      return (
        <video
          src={look.url}
          autoPlay
          loop
          muted
          playsInline
          className={cx(baseClassName, "w-full h-full object-cover")}
        />
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element -- runtime blob/custom-protocol URL, not a static asset next/image can optimize
      <img src={look.url} alt="" className={cx(baseClassName, "w-full h-full object-cover")} />
    );
  }

  return <div className={baseClassName} style={{ background: look.css }} />;
}
