"use client";

import { isCustomBackground } from "./data";
import { cx } from "./cx";
import { InteractiveButton } from "./Interactive";
import { LookBackground } from "./LookBackground";
import type { UseLumen } from "./useLumen";

export function Toolbar({ lumen }: { lumen: UseLumen }) {
  const { state, patch, go, toolBtn, allLooks } = lumen;

  const smaller = () =>
    patch((s) => ({ scale: Math.max(0.7, +(s.scale - 0.1).toFixed(2)) }));
  const bigger = () =>
    patch((s) => ({ scale: Math.min(1.5, +(s.scale + 0.1).toFixed(2)) }));
  const fontPct = Math.round(state.scale * 100) + "%";

  return (
    <div className="flex-none h-21 flex items-center gap-3 px-5.5 border-t border-border bg-panel overflow-x-auto">
      <InteractiveButton
        onClick={() => go(-1)}
        className="h-13 px-5.5 rounded-3 border border-border2 bg-raise text-[14px] font-semibold cursor-pointer flex items-center gap-2.5 hover:border-accent hover:bg-panel2 active:translate-y-px"
      >
        ←{/* <span className="font-mono text-[10px] text-faint">←</span> */}
      </InteractiveButton>

      <InteractiveButton
        onClick={() => go(1)}
        className="h-13 px-6.5 rounded-3 border-none bg-accent text-white text-[14px] font-semibold cursor-pointer flex items-center gap-2.5 shadow-app-sm hover:brightness-110 active:translate-y-px"
      >
        →{/* <span className="font-mono text-[10px] opacity-70">Space</span> */}
      </InteractiveButton>

      <div className="w-px h-9 bg-border mx-1" />

      <button
        onClick={() => patch((s) => ({ blank: !s.blank, black: false }))}
        className={toolBtn(state.blank, "border-warn bg-warn text-[#0a0a0c]")}
      >
        Blank
      </button>
      <button
        onClick={() => patch((s) => ({ black: !s.black, blank: false }))}
        className={toolBtn(state.black, "border-black bg-black text-white")}
      >
        Black
      </button>

      <div className="w-px h-9 bg-border mx-1" />

      <div className="flex items-center gap-1.75">
        <span className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">
          Look
        </span>
        <div className="flex gap-1.5">
          {allLooks.map((lookOption) => {
            const on = lookOption.id === state.look;
            const custom = isCustomBackground(lookOption);
            return (
              <button
                key={lookOption.id}
                onClick={() => patch({ look: lookOption.id })}
                title={lookOption.name}
                className={cx(
                  "h-9 px-2.75 rounded-2.25 text-[12px] cursor-pointer flex items-center gap-1.75 border",
                  on
                    ? "border-accent bg-accent-soft text-text font-semibold"
                    : "border-border bg-panel2 text-muted font-normal",
                )}
              >
                {custom ? (
                  <span className="relative w-3.5 h-3.5 rounded-1 overflow-hidden border border-[rgba(255,255,255,.12)] bg-black flex-none">
                    <LookBackground look={lookOption} preview />
                  </span>
                ) : (
                  <span
                    className="w-3.5 h-3.5 rounded-1 border border-[rgba(255,255,255,.12)]"
                    style={{ background: lookOption.swatch }}
                  />
                )}
                {lookOption.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-px h-9 bg-border mx-1" />

      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint mr-0.5">
          Size
        </span>
        <button
          onClick={smaller}
          className="w-9 h-9 rounded-2.25 border border-border bg-panel2 text-[12px] cursor-pointer text-muted"
        >
          A−
        </button>
        <span className="font-mono text-[12px] w-11 text-center text-text">
          {fontPct}
        </span>
        <button
          onClick={bigger}
          className="w-9 h-9 rounded-2.25 border border-border bg-panel2 text-[15px] cursor-pointer text-muted"
        >
          A+
        </button>
      </div>

      <div className="flex-1" />

      <InteractiveButton
        onClick={() => patch({ presenting: true })}
        className="h-13 px-5.5 rounded-3 border border-border2 bg-panel2 text-[14px] font-semibold cursor-pointer flex items-center gap-2.5 hover:border-accent hover:text-accent"
      >
        ⛶ Fullscreen
        <span className="font-mono text-[10px] text-faint">F5</span>
      </InteractiveButton>
    </div>
  );
}
