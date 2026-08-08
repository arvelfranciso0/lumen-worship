"use client";

import { cx } from "../../cx";
import { InteractiveButton } from "../../ui/Interactive";
import type { UseLumen } from "../../useLumen";

// Current-lineup indicator: date, active set name, and a dropdown of its songs.
export function HeaderSetSwitcher({
  lumen, isDesktop, dateLabel,
}: {
  lumen: UseLumen; isDesktop: boolean; dateLabel: string;
}) {
  const { state, patch, setSongs } = lumen;
  const hasActiveLineup = !!state.activeLineupId;
  const setCountLabel = setSongs.length === 1 ? "1 song" : setSongs.length + " songs";

  return (
    <div className={cx("relative items-center gap-2 text-[13px] text-muted", isDesktop ? "flex" : "hidden")}>
      <span className="w-1.75 h-1.75 rounded-full bg-ok shadow-[0_0_0_3px_rgba(52,211,153,.16)]" />
      <span className="text-text font-medium">{dateLabel}</span>
      {hasActiveLineup && (
        <>
          <span className="text-faint">·</span>
          <InteractiveButton
            onClick={() => patch((previousState) => ({ setPanelOpen: !previousState.setPanelOpen }))}
            className="border-none px-1 py-0.5 -my-0.5 -mx-1 cursor-pointer text-[13px] text-muted rounded-1.5 hover:text-text hover:bg-panel2"
          >
            {state.setName} — {setCountLabel}
          </InteractiveButton>
        </>
      )}
      {hasActiveLineup && state.setPanelOpen && (
        <>
          <div
            onClick={() => patch({ setPanelOpen: false })}
            className="fixed inset-0 z-90"
          />
          <div
            onClick={(clickEvent) => clickEvent.stopPropagation()}
            className="absolute top-[calc(100%+8px)] left-0 z-100 w-75 rounded-xl border border-border2 bg-panel shadow-app overflow-hidden"
          >
            <div className="p-[10px_14px] border-b border-border text-[11px] font-semibold tracking-[.06em] uppercase text-faint">
              {state.setName} · {setCountLabel}
            </div>
            {setSongs.length === 0 ? (
              <div className="p-[24px_16px] text-center text-muted">
                <div className="text-[12.5px] font-medium text-text">
                  No songs in this set yet
                </div>
                <div className="text-[11.5px] mt-1 leading-normal">
                  Add songs to this lineup from the Lineups tab.
                </div>
              </div>
            ) : (
              <div className="flex flex-col p-1.5 max-h-70 overflow-y-auto">
                {setSongs.map((setSong, setSongIndex) => (
                  <button
                    key={setSong.id}
                    onClick={() => {
                      patch({
                        mode: "songs",
                        songId: setSong.id,
                        idx: 0,
                        setPanelOpen: false,
                      });
                    }}
                    className="flex items-center gap-2.25 w-full p-2 rounded-2 border-none bg-transparent text-text cursor-pointer text-left"
                  >
                    <span className="font-mono text-[10px] text-faint w-4">
                      {setSongIndex + 1}
                    </span>
                    <span className="flex-1 text-[13px] truncate">
                      {setSong.title}
                    </span>
                    <span className="font-mono text-[10px] text-faint">
                      {setSong.key}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
