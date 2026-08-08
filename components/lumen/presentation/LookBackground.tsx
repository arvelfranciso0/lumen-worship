"use client";

import { cx } from "../cx";
import { isCustomBackground, type LookOption } from "../data";

type LookBackgroundProps = {
  look: LookOption;
  black?: boolean;
  // True for any non-audience-facing surface; renders a video look's poster
  // frame instead of a live decode there.
  preview?: boolean;
  className?: string;
};

// Renders a Look: a builtin CSS gradient, an uploaded image, or an uploaded video.
export function LookBackground({ look, black, preview, className }: LookBackgroundProps) {
  const baseClassName = cx("absolute inset-0", className);

  if (black) return <div className={cx(baseClassName, "bg-black")} />;

  if (isCustomBackground(look)) {
    if (look.mediaType === "video") {
      // Preview spots show the captured poster, or a placeholder while it's not ready.
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
