"use client";

import { useMemo, useRef } from "react";
import { cx } from "./cx";
import { isCustomBackground, LOOK_CATEGORIES } from "./data";
import { InteractiveButton } from "./Interactive";
import { LookBackground } from "./LookBackground";
import type { UseLumen } from "./useLumen";

// Inline panel filling the bottom of the main column, below the slides grid.
export function BackgroundsPanel({ lumen }: { lumen: UseLumen }) {
  const {
    state, patch, bible, idx, cur, slideCount, allLooks, addBackground, deleteBackground, askConfirm,
    setSlideLook, applySlideLookToLabel, applyLookToAllSlides,
  } = lumen;
  const backgroundFileInputRef = useRef<HTMLInputElement>(null);
  const category = state.backgroundCategory;
  const armed = state.backgroundApplyAllArmed;

  // Clamps the current slide index into the deck's valid range.
  const slideIndex = Math.min(Math.max(idx, 0), Math.max(slideCount - 1, 0));

  // The look this panel considers "current": a per-slide override if the live
  // slide has one, otherwise the deck-wide default.
  const targetLookId = (!bible && cur.lookId) || state.look;

  const selectLook = (lookId: string) => {
    if (armed || bible) {
      patch({ look: lookId, backgroundApplyAllArmed: false });
      if (!bible) applyLookToAllSlides(lookId);
      return;
    }
    setSlideLook(slideIndex, lookId);
    applySlideLookToLabel(slideIndex, lookId);
  };

  // Applies the current slide's background to every slide in the deck.
  const applyToRemaining = () => applyLookToAllSlides(targetLookId);

  const deleteBuiltinLook = (id: string) => {
    patch((previousState) => ({ deletedLookIds: [...previousState.deletedLookIds, id] }));
  };

  const filteredLooks = useMemo(() => category === "All" ? allLooks : allLooks.filter((lookOption) => {
    const custom = isCustomBackground(lookOption);
    return custom ? category === (lookOption.mediaType === "video" ? "Video" : "Image") : lookOption.kind === category;
  }), [category, allLooks]);

  return (
    <div
      className="flex-1 flex flex-col border border-t-0 border-border bg-panel2 p-3.5 overflow-y-auto overflow-x-hidden min-h-45"
      data-tour="backgrounds"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">Backgrounds</div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {state.deletedLookIds.length > 0 && (
            <InteractiveButton
              onClick={() => patch({ deletedLookIds: [] })}
              className="h-6 px-2.5 rounded-full border border-border bg-transparent text-accent text-[11px] cursor-pointer hover:bg-panel"
            >
              Restore hidden
            </InteractiveButton>
          )}
          <button
            onClick={() => patch((s) => ({ backgroundApplyAllArmed: !s.backgroundApplyAllArmed }))}
            title={bible
              ? "Not needed in Bible mode — a background picked here already applies to every verse"
              : "Choose a background to apply everywhere at once"}
            disabled={bible}
            className={cx(
              "h-6 px-2.5 rounded-full text-[11px] border disabled:opacity-40 not-disabled:cursor-pointer",
              armed ? "border-accent bg-accent-soft text-accent" : "border-border bg-transparent text-muted not-disabled:hover:text-text"
            )}
          >
            {armed && !bible ? "Pick a background…" : "Apply to all"}
          </button>
          <button
            onClick={applyToRemaining}
            title={bible
              ? "Not needed in Bible mode — a background picked here already applies to every verse"
              : "Applies this slide's current background to every slide in the deck"}
            disabled={bible}
            className="h-6 px-2.5 rounded-full border border-border bg-transparent text-muted text-[11px] disabled:opacity-40 not-disabled:cursor-pointer not-disabled:hover:text-text"
          >
            Apply to remaining
          </button>
          <InteractiveButton
            onClick={() => backgroundFileInputRef.current?.click()}
            className="h-6 px-2.5 rounded-full border border-dashed border-border bg-transparent text-muted text-[11px] cursor-pointer hover:text-text"
          >
            + Upload background
          </InteractiveButton>
          <input
            ref={backgroundFileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={(changeEvent) => {
              const file = changeEvent.target.files?.[0];
              if (file) addBackground(file);
              changeEvent.target.value = "";
            }}
            className="hidden"
          />
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap mt-2.5">
        {["All", ...LOOK_CATEGORIES].map((categoryOption) => (
          <button
            key={categoryOption}
            onClick={() => patch({ backgroundCategory: categoryOption })}
            className={cx(
              "h-5.5 px-2.25 rounded-full text-[10.5px] cursor-pointer border",
              category === categoryOption ? "border-accent bg-accent-soft text-accent" : "border-border bg-transparent text-muted"
            )}
          >
            {categoryOption}
          </button>
        ))}
      </div>

      <div className="grid gap-2 mt-2.5 content-start grid-cols-[repeat(auto-fill,minmax(68px,1fr))]">
        {filteredLooks.map((lookOption) => {
          const on = lookOption.id === targetLookId;
          const custom = isCustomBackground(lookOption);
          return (
            <div key={lookOption.id} className="relative">
              <button
                onClick={() => selectLook(lookOption.id)}
                className={cx(
                  "flex flex-col items-start gap-1.25 p-1.5 rounded-2.25 cursor-pointer text-text border w-full",
                  on ? "border-accent bg-accent-soft" : "border-border bg-panel2"
                )}
              >
                {custom ? (
                  <span className="relative block w-full h-9.5 rounded-1.5 border border-border overflow-hidden bg-black">
                    <LookBackground look={lookOption} preview />
                  </span>
                ) : (
                  <span className="w-full h-9.5 rounded-1.5 border border-border" style={{ background: lookOption.css }} />
                )}
                <span title={lookOption.name} className="text-[10px] truncate w-full text-left">{lookOption.name}</span>
              </button>
              <button
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  if (custom) {
                    askConfirm({ title: "Delete background?", body: lookOption.name, danger: true, onConfirm: () => deleteBackground(lookOption.id) });
                  } else {
                    askConfirm({ title: "Remove built-in background?", body: lookOption.name, onConfirm: () => deleteBuiltinLook(lookOption.id) });
                  }
                }}
                title={custom ? "Remove background" : "Hide this built-in background"}
                className="absolute top-0.75 right-0.75 w-4 h-4 rounded-full bg-[rgba(0,0,0,.55)] text-white text-[10px] cursor-pointer border-none flex items-center justify-center z-1"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
