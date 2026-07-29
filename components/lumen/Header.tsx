"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cx } from "./cx";
import { InteractiveButton } from "./Interactive";
import type { UseLumen } from "./useLumen";

function formatClock(date: Date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function Header({ lumen }: { lumen: UseLumen }) {
  const { state, patch, theme, hidden, setSongs } = lumen;
  const themeLabel = theme === "dark" ? "☾ Dark" : "☀ Light";
  const setCountLabel = setSongs.length === 1 ? "1 song" : setSongs.length + " songs";
  const hasActiveLineup = !!state.activeLineupId;

  // Starts empty and fills in after mount so the server-prerendered markup
  // (static export, built at a fixed time) and the first client render match
  // — avoiding a hydration mismatch — then ticks for real from there on.
  const [clock, setClock] = useState("");
  useEffect(() => {
    setClock(formatClock(new Date()));
    const interval = setInterval(() => setClock(formatClock(new Date())), 15_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 flex-none flex items-center gap-5 p-[0_16px_0_18px] border-b border-border bg-panel">
      <div className="flex items-center gap-2.5 w-73.5 flex-none">
        <div className="w-6.5 h-6.5 rounded-2">
          <Image 
          src={"/lumen.png"}
          width={200}
          height={200}
          alt="Lume"
          />
        </div>
        <div className="text-[15px] font-semibold tracking-[-0.01em]">Lumen</div>
        <div className="font-mono text-[10px] text-faint border border-border p-[2px_5px] rounded-[5px]">v{process.env.NEXT_PUBLIC_APP_VERSION}</div>
      </div>

      <div className="relative flex items-center gap-2 text-[13px] text-muted">
        <span className="w-1.75 h-1.75 rounded-full bg-ok shadow-[0_0_0_3px_rgba(52,211,153,.16)]" />
        <span className="text-text font-medium">Sunday Gathering</span>
        {hasActiveLineup && (
          <>
            <span className="text-faint">·</span>
            <InteractiveButton
              onClick={() => patch((s) => ({ setPanelOpen: !s.setPanelOpen }))}
              className="border-none px-1 py-0.5 -my-0.5 -mx-1 cursor-pointer text-[13px] text-muted rounded-1.5 hover:text-text hover:bg-panel2"
            >
              {state.setName} — {setCountLabel}
            </InteractiveButton>
          </>
        )}
        <span className="text-faint">·</span>
        <span className="font-mono">{clock}</span>

        {hasActiveLineup && state.setPanelOpen && (
          <>
            <div onClick={() => patch({ setPanelOpen: false })} className="fixed inset-0 z-90" />
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute top-[calc(100%+8px)] left-0 z-100 w-75 rounded-xl border border-border2 bg-panel shadow-app overflow-hidden"
            >
              <div className="p-[10px_14px] border-b border-border text-[11px] font-semibold tracking-[.06em] uppercase text-faint">
                {state.setName} · {setCountLabel}
              </div>
              {setSongs.length === 0 ? (
                <div className="p-[24px_16px] text-center text-muted">
                  <div className="text-[12.5px] font-medium text-text">No songs in this set yet</div>
                  <div className="text-[11.5px] mt-1 leading-normal">
                    Open a song and click “Add to set” to add it here.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col p-1.5 max-h-70 overflow-y-auto">
                  {setSongs.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => { patch({ mode: "songs", songId: s.id, idx: 0, black: false, blank: false, setPanelOpen: false }); }}
                      className="flex items-center gap-2.25 w-full p-2 rounded-2 border-none bg-transparent text-text cursor-pointer text-left"
                    >
                      <span className="font-mono text-[10px] text-faint w-4">{i + 1}</span>
                      <span className="flex-1 text-[13px] truncate">{s.title}</span>
                      <span className="font-mono text-[10px] text-faint">{s.key}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 p-[6px_10px] border border-border rounded-2.25 bg-panel2 text-[12px] text-muted">
          <span className={cx("w-1.5 h-1.5 rounded-full", hidden ? "bg-warn" : "bg-ok")} />
          Output · Display 2 <span className="font-mono text-faint">1920×1080</span>
        </div>

        <InteractiveButton
          onClick={() => patch({ theme: theme === "dark" ? "light" : "dark" })}
          className="h-8.5 px-3 rounded-2.25 border border-border bg-panel2 text-[13px] text-muted cursor-pointer hover:bg-raise hover:text-text"
        >
          {themeLabel}
        </InteractiveButton>

        <InteractiveButton
          onClick={() => patch({ settingsOpen: true })}
          className="h-8.5 px-3 rounded-2.25 border border-border bg-panel2 text-[13px] text-muted cursor-pointer hover:bg-raise hover:text-text"
        >
          Settings
        </InteractiveButton>

        <InteractiveButton
          onClick={() => patch({ presenting: true })}
          className="h-8.5 px-4 rounded-2.25 border-none bg-accent text-white text-[13px] font-semibold cursor-pointer shadow-app-sm flex items-center gap-2 hover:brightness-110"
        >
          Present
          <span className="font-mono text-[10px] opacity-70">F5</span>
        </InteractiveButton>
      </div>
    </header>
  );
}
