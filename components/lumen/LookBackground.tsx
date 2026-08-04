"use client";

import { cx } from "./cx";
import { isCustomBackground, type LookOption } from "./data";

type LookBackgroundProps = {
  look: LookOption;
  black?: boolean;
  // True for every spot that isn't the actual audience-facing output (the
  // Backgrounds panel, slide thumbnails, the "Next up" box) — a video
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
      // Preview spots never get a live <video>: falling back to an independent
      // decode is exactly the simultaneous-decode lag this preview mode exists
      // to avoid. While the poster is still being captured (or if capture
      // failed outright) they show a striped "video" placeholder instead —
      // distinguishable at a glance from a background that really is black,
      // which a plain black panel here was not.
      if (preview) {
        return look.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- runtime data URL, not a static asset next/image can optimize
          <img src={look.posterUrl} alt="" className={cx(baseClassName, "w-full h-full object-cover")} />
        ) : (
          <div
            title={look.name + " — video background, still frame not ready"}
            className={cx(baseClassName, "bg-[repeating-linear-gradient(45deg,#16161c_0_6px,#0b0b0e_6px_12px)] flex items-center justify-center")}
          >
            <span className="text-white/30 text-[10px] leading-none">▶</span>
          </div>
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
