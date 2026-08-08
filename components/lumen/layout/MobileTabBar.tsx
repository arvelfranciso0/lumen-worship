"use client";

import { cx } from "../cx";
import type { UseLumen } from "../useLumen";

// Mobile-only bottom tab bar for switching between the library, slides, and live panes.
export function MobileTabBar({ lumen }: { lumen: UseLumen }) {
  const { state, patch } = lumen;

  const tabs: { id: "library" | "slides" | "live"; label: string; icon: string }[] = [
    { id: "library", label: "Library", icon: "☰" },
    { id: "slides", label: "Slides", icon: "▤" },
    { id: "live", label: "Live", icon: "◉" },
  ];

  return (
    <div className="flex-none flex h-15 border-t border-border bg-panel">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => patch({ mobileView: tab.id, sidebarDrawerOpen: false })}
          className={cx(
            "flex-1 flex flex-col items-center justify-center gap-0.5 border-none cursor-pointer",
            state.mobileView === tab.id ? "text-accent bg-accent-soft" : "bg-transparent text-muted"
          )}
        >
          <span className="text-[18px] leading-none">{tab.icon}</span>
          <span className="text-[11px] font-semibold">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
