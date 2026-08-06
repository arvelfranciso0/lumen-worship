"use client";

import { useMemo, useRef } from "react";
import { cx } from "./cx";
import { isCustomBackground, LOOK_CATEGORIES } from "./data";
import { InteractiveButton } from "./Interactive";
import { LookBackground } from "./LookBackground";
import type { UseLumen } from "./useLumen";

// Inline panel filling the bottom of the main column, below the slides grid
// (it was a modal before the handoff redesign, and a block inside Settings
// before that).
//
// Targeting: picking a look normally applies to every slide sharing the current
// slide's section label (so "Chorus" gets one background, not one per repeat).
// The two buttons override that reach:
//   - "Apply to all" arms a one-shot — the next background picked becomes the
//     deck-wide default and clears every per-slide override.
//   - "Apply to remaining" takes no pick at all: it pushes the live slide's
//     current background onto every slide in the deck immediately.
// Both are deck-wide. They previously routed through a label-scoped helper, so
// "all" quietly meant "all the slides with this same label".
export function BackgroundsPanel({ lumen }: { lumen: UseLumen }) {
  const {
    state, patch, bible, idx, cur, slideCount, allLooks, addBackground, deleteBackground, askConfirm,
    setSlideLook, applySlideLookToLabel, applyLookToAllSlides,
  } = lumen;
  const backgroundFileInputRef = useRef<HTMLInputElement>(null);
  const category = state.backgroundCategory;
  const armed = state.backgroundApplyAllArmed;

  // The blank overflow positions sit one step outside the deck, where every
  // per-slide write would silently miss. Clamping keeps the buttons meaningful
  // there rather than looking broken.
  const slideIndex = Math.min(Math.max(idx, 0), Math.max(slideCount - 1, 0));

  // The look this panel considers "current": a per-slide override if the live
  // slide has one, otherwise the deck-wide default.
  const targetLookId = (!bible && cur.lookId) || state.look;

  const selectLook = (lookId: string) => {
    // Bible verses have no per-slide overrides to hold a background of their
    // own, so every pick there is already deck-wide by nature.
    if (armed || bible) {
      patch({ look: lookId, backgroundApplyAllArmed: false });
      // Write the picked lookId onto every slide explicitly rather than
      // clearing to undefined and relying on a downstream "no override ->
      // deck default" fallback: inside a lineup, setSectionLooks stores that
      // clear as a lineup-scoped null, and the `song` useMemo's fallback for
      // an unset lineup pick deliberately never reads back the shared,
      // mutable `state.look` pref (see its comment) — it lands on the first
      // available background instead. An explicit write works the same
      // in and out of a lineup, and outside one is a no-op behavioural change
      // since state.look already equals lookId.
      if (!bible) applyLookToAllSlides(lookId);
      return;
    }
    setSlideLook(slideIndex, lookId);
    applySlideLookToLabel(slideIndex, lookId);
  };

  // Song mode only — the button is disabled in Bible mode, where there are no
  // per-slide overrides for this to write.
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
      // No top border: the resize handle directly above is this panel's top
      // edge, and two rules stacked there read as one thick uneven one.
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
          {/* Armed state relabels itself: the button's whole effect is on the
              *next* click elsewhere, so with a static label it read as a control
              that did nothing. */}
          {/* Both are disabled in Bible mode: verses carry no per-slide
              background of their own, so every pick there is already deck-wide
              and these two have nothing left to change. */}
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
