"use client";

import { InteractiveButton } from "../../ui/Interactive";
import type { UseLumen } from "../../useLumen";

// Lineup list view: create, activate, delete, or open a lineup's detail.
export function LineupList({ lumen }: { lumen: UseLumen }) {
  const { state, patch, activateLineup, deleteLineup, askConfirm } = lumen;

  return (
    <div className="flex-1 overflow-y-auto p-[10px_10px_20px]">
      <div className="flex items-center justify-between p-[8px_6px_6px]">
        <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">
          Lineups
        </div>
        <InteractiveButton
          data-tour="lineup-new"
          onClick={() => patch({ lineupModalOpen: true, editingLineupId: null })}
          className="text-[11.5px] font-semibold text-accent border-none cursor-pointer px-1 py-0.5 hover:text-text"
        >
          + New lineup
        </InteractiveButton>
      </div>

      {state.lineups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 text-center p-[40px_18px] text-muted">
          <div className="text-[13px] font-semibold text-text">No lineups yet</div>
          <div className="text-[12px] leading-normal">Create one to group songs for a service or event.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {state.lineups.map((lineup) => (
            <div
              key={lineup.id}
              onClick={() => patch({ viewingLineupId: lineup.id })}
              className="flex items-center gap-2.5 p-[11px_12px] rounded-xl cursor-pointer border border-border bg-panel2"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold tracking-[-0.01em] truncate">
                  {lineup.name}
                </div>
                <div className="text-[12px] text-muted mt-0.5">
                  {lineup.songIds.length === 1 ? "1 song" : lineup.songIds.length + " songs"}
                </div>
              </div>
              {lineup.id === state.activeLineupId ? (
                <span className="text-[11.5px] font-semibold text-accent px-1.5 py-0.5 rounded-1.5 bg-accent-soft">
                  Active
                </span>
              ) : (
                <button
                  onClick={(clickEvent) => { clickEvent.stopPropagation(); activateLineup(lineup.id); }}
                  className="border-none cursor-pointer text-[12.5px] text-accent p-1"
                >
                  Activate
                </button>
              )}
              <button
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  askConfirm({ title: "Delete lineup?", body: lineup.name, danger: true, onConfirm: () => deleteLineup(lineup.id) });
                }}
                className="border-none cursor-pointer text-[12.5px] text-faint p-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
