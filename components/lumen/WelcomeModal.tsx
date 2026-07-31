"use client";

import { useState } from "react";
import { cx } from "./cx";
import { InteractiveButton } from "./Interactive";
import { useBackdropClose } from "./useBackdropClose";
import type { UseLumen } from "./useLumen";

type Step = { icon: string; title: string; body: string };

const STEPS: Step[] = [
  {
    icon: "👋",
    title: "Welcome to Lumen",
    body: "A live lyrics and Scripture display for worship gatherings — one operator view for you, a clean chrome-free display for the room.",
  },
  {
    icon: "🎵",
    title: "Pick a song or passage",
    body: "Browse songs, Bible passages, or lineups from the sidebar. Click one to load it, then use ← → (or the Toolbar) to move slide by slide.",
  },
  {
    icon: "🖥️",
    title: "Present",
    body: "Hit Present (or F5) to go live. If a second display is connected, the audience view opens there automatically — otherwise your own screen goes fullscreen.",
  },
  {
    icon: "⚙️",
    title: "Make it yours",
    body: "Customize fonts, colors, and backgrounds from the Toolbar. Settings has second-monitor setup, Bible translations, and everything else.",
  },
];

export function WelcomeModal({ lumen }: { lumen: UseLumen }) {
  const { state, patch, prefsLoaded } = lumen;
  const [stepIndex, setStepIndex] = useState(0);

  const finish = () => patch({ hasSeenOnboarding: true });
  const backdropProps = useBackdropClose(finish);

  if (!prefsLoaded || state.hasSeenOnboarding) return null;

  const isLastStep = stepIndex === STEPS.length - 1;

  return (
    <div
      {...backdropProps}
      className="fixed inset-0 z-130 bg-[rgba(6,6,8,.6)] backdrop-blur-[6px] flex items-center justify-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-115 rounded-[18px] border border-border2 bg-panel shadow-app overflow-hidden animate-[fadeUp_.18s_ease_both]"
      >
        <div className="relative overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${stepIndex * 100}%)` }}
          >
            {STEPS.map((step) => (
              <div key={step.title} className="w-full flex-none flex flex-col items-center gap-3.5 text-center p-[36px_32px_28px]">
                <div className="text-[40px] leading-none">{step.icon}</div>
                <div className="text-[17px] font-semibold tracking-[-0.01em]">{step.title}</div>
                <div className="text-[13px] text-muted leading-[1.6] max-w-85">{step.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 pb-4">
          {STEPS.map((step, index) => (
            <span
              key={step.title}
              className={cx("w-1.5 h-1.5 rounded-full", index === stepIndex ? "bg-accent" : "bg-border2")}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2.25 p-[14px_20px] border-t border-border bg-panel2">
          <InteractiveButton
            onClick={finish}
            className="h-9 px-3 rounded-2.25 border-none bg-transparent text-[13px] text-muted cursor-pointer hover:text-text"
          >
            Skip
          </InteractiveButton>
          <div className="flex items-center gap-2.25">
            {stepIndex > 0 && (
              <InteractiveButton
                onClick={() => setStepIndex((previousIndex) => previousIndex - 1)}
                className="h-9 px-3.5 rounded-2.25 border border-border bg-panel text-[13px] text-muted cursor-pointer hover:text-text"
              >
                Back
              </InteractiveButton>
            )}
            <button
              onClick={() => (isLastStep ? finish() : setStepIndex((previousIndex) => previousIndex + 1))}
              className="h-9 px-4 rounded-2.25 border-none bg-accent text-white text-[13px] font-semibold cursor-pointer"
            >
              {isLastStep ? "Get started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
