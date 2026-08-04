"use client";

import { InteractiveButton } from "./Interactive";
import { useBackdropClose } from "./useBackdropClose";
import type { UseLumen } from "./useLumen";

const HOTKEY_GROUPS: { title: string; rows: { label: string; keys: string }[] }[] = [
  {
    title: "Presenting",
    rows: [
      { label: "Next / Previous slide", keys: "→ ← · Space · ⌫" },
      { label: "Blank (background only)", keys: "B" },
      { label: "Black screen", keys: "Shift+B" },
      { label: "Present / exit", keys: "F5 · Esc" },
    ],
  },
  {
    title: "Editing",
    rows: [
      { label: "Undo / Redo", keys: "⌘Z / ⌘⇧Z" },
      { label: "Global search", keys: "⌘K" },
      { label: "This shortcuts reference", keys: "?" },
    ],
  },
];

// Static reference table for the "?" button in the header — driven by
// lumen.state.hotkeysOpen, no other state.
export function HotkeysModal({ lumen }: { lumen: UseLumen }) {
  const { state, patch } = lumen;
  const close = () => patch({ hotkeysOpen: false });
  const backdropProps = useBackdropClose(close);

  if (!state.hotkeysOpen) return null;

  return (
    <div
      {...backdropProps}
      className="fixed inset-0 z-120 bg-[rgba(6,6,8,.6)] backdrop-blur-[6px] flex items-center justify-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-100 max-h-[80vh] flex flex-col rounded-[18px] border border-border2 bg-panel shadow-app overflow-hidden animate-[fadeUp_.18s_ease_both]"
      >
        <div className="flex items-center justify-between p-[18px_20px_14px] border-b border-border">
          <div className="text-[16px] font-semibold tracking-[-0.02em]">Keyboard shortcuts</div>
          <InteractiveButton
            onClick={close}
            className="w-8 h-8 rounded-2.25 border border-border bg-panel2 text-muted cursor-pointer hover:text-text hover:bg-raise"
          >
            ✕
          </InteractiveButton>
        </div>
        <div className="p-[18px_20px] flex flex-col gap-4 overflow-y-auto">
          {HOTKEY_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">{group.title}</div>
              <div className="flex flex-col gap-1.75 text-[12.5px] text-muted">
                {group.rows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span>{row.label}</span>
                    <span className="font-mono text-[11px] text-text">{row.keys}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
