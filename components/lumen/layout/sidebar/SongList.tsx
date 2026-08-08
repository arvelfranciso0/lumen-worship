"use client";

import { cx } from "../../cx";
import { InteractiveButton } from "../../ui/Interactive";
import type { UseLumen } from "../../useLumen";

// Song library list: search results, favorites, reprise/delete actions.
export function SongList({ lumen }: { lumen: UseLumen }) {
  const { state, patch, list, duplicateSongAsReprise, toggleFavorite, deleteSong, askConfirm } = lumen;

  return (
    <div className="flex-1 overflow-y-auto p-[10px_10px_20px]">
      <div className="flex items-center justify-between p-[8px_6px_6px]">
        <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">
          Library
        </div>
        <div className="flex gap-2.5">
          <InteractiveButton
            onClick={() => patch({ lineupModalOpen: true, editingLineupId: null })}
            className="text-[11.5px] font-semibold text-accent border-none cursor-pointer px-1 py-0.5 hover:text-text"
          >
            + New lineup
          </InteractiveButton>
          <InteractiveButton
            data-tour="upload"
            onClick={() => patch({ songEditorOpen: true, songEditorMode: "create" })}
            className="text-[11.5px] font-semibold text-accent border-none cursor-pointer px-1 py-0.5 hover:text-text"
          >
            + Upload song
          </InteractiveButton>
        </div>
      </div>
      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-2 text-center p-[40px_18px] text-muted">
          <span className="text-[22px] text-faint">⌕</span>
          <div className="text-[13px] font-semibold text-text">No songs found</div>
          <div className="text-[12px] leading-normal">Try a different search term or filter.</div>
          <InteractiveButton
            onClick={() => patch({ query: "", chip: "All" })}
            className="mt-1 h-7.5 px-3 rounded-2 border border-border bg-panel2 text-[12px] text-muted cursor-pointer hover:text-text hover:bg-raise"
          >
            Clear filters
          </InteractiveButton>
        </div>
      ) : (
      <div className="flex flex-col gap-1.5">
        {list.map((songEntry) => {
          const on = songEntry.id === state.songId;
          const fav = !!state.favs[songEntry.id];
          return (
            <div
              key={songEntry.id}
              onClick={() => patch({ songId: songEntry.id, idx: 0 })}
              className={cx(
                "p-[11px_12px_10px] rounded-xl cursor-pointer border",
                on
                  ? "border-accent bg-accent-soft shadow-[0_0_0_3px_var(--accent-soft)]"
                  : "border-border bg-panel2 shadow-none"
              )}
            >
              <div className="flex items-start gap-2.5">
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold tracking-[-0.01em] truncate">
                    {songEntry.title}
                  </div>
                  <div className="text-[12px] text-muted mt-0.5 truncate">
                    {songEntry.artist}
                  </div>
                </div>
                    <button
                      onClick={(clickEvent) => { clickEvent.stopPropagation(); duplicateSongAsReprise(songEntry.id); }}
                      className="border-none cursor-pointer text-[12px] leading-none p-0.5 text-faint hover:text-text"
                      title="Duplicate as reprise"
                    >
                      ⧉
                    </button>
                    <button
                      onClick={(clickEvent) => { clickEvent.stopPropagation(); toggleFavorite(songEntry.id); }}
                      className={cx("border-none cursor-pointer text-[14px] leading-none p-0.5", fav ? "text-warn" : "text-faint")}
                    >
                      ★
                    </button>
                    {songEntry.id.startsWith("custom-") && (
                      <button
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          askConfirm({
                            title: "Delete song?", body: songEntry.title, danger: true,
                            onConfirm: () => deleteSong(songEntry.id),
                          });
                        }}
                        className="border-none cursor-pointer text-[13px] leading-none p-0.5 text-faint hover:text-danger"
                        title="Delete song"
                      >
                        ✕
                      </button>
                    )}
              </div>
              <div className="flex items-center gap-1.5 mt-2.25">
                {songEntry.key && (
                  <span className="font-mono text-[10px] text-text bg-raise border border-border p-[2px_6px] rounded-[5px]">
                    {songEntry.key}
                  </span>
                )}
                <span className="font-mono text-[10px] text-faint">{songEntry.bpm}</span>
                <div className="flex-1" />
                {songEntry.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="text-[10.5px] text-muted bg-panel2 border border-border p-[2px_7px] rounded-5">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
