"use client";

import { cx } from "../../cx";
import { InteractiveButton } from "../../ui/Interactive";

// Present/Stop-presenting control, showing a starting countdown when active.
export function HeaderPresentButton({
  isPresenting, presentCountdown, startPresenting, stopPresenting,
}: {
  isPresenting: boolean; presentCountdown: number | null; startPresenting: () => void; stopPresenting: () => void;
}) {
  const isPresentCounting = presentCountdown !== null;

  return (
    <InteractiveButton
      data-tour="present"
      // Cancels the countdown if presenting/counting, otherwise starts presenting.
      onClick={isPresenting || isPresentCounting ? stopPresenting : startPresenting}
      className={cx(
        "h-8.5 px-4 rounded-2.25 text-[13px] cursor-pointer flex items-center gap-2",
        isPresenting || isPresentCounting
          ? "border border-border2 bg-raise text-muted font-medium"
          : "border-none bg-accent text-white font-semibold shadow-app-sm hover:brightness-110"
      )}
    >
      {isPresentCounting ? (
        <span className="inline-flex items-center gap-2">
          <span>Starting in</span>
          <span
            key={presentCountdown}
            className="font-mono text-[15px] font-bold inline-block animate-[lumenPresentTick_.7s_ease]"
          >
            {presentCountdown}
          </span>
        </span>
      ) : (
        <>
          {isPresenting ? "Stop Presenting" : "Present"}
          {!isPresenting && <span className="font-mono text-[10px] opacity-70">F5</span>}
        </>
      )}
    </InteractiveButton>
  );
}
