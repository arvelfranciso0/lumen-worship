"use client";

import { useEffect, useState } from "react";
import { cx } from "../cx";
import { InteractiveButton, InteractiveInput } from "../ui/Interactive";
import { useBackdropClose } from "../hooks/useBackdropClose";
import type { UseLumen } from "../useLumen";

export function LineupModal({ lumen }: { lumen: UseLumen }) {
  const { state, patch, allSongs, createLineup, updateLineup } = lumen;
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const editingLineup = state.lineups.find((l) => l.id === state.editingLineupId) || null;

  useEffect(() => {
    if (!state.lineupModalOpen) return;
    const editing = state.lineups.find((l) => l.id === state.editingLineupId);
    if (editing) {
      setName(editing.name);
      setSelected(Object.fromEntries(editing.songIds.map((id) => [id, true])));
    } else {
      setName("");
      setSelected({});
    }
    setQuery("");
    setError("");
  }, [state.lineupModalOpen, state.editingLineupId]);

  const close = () => patch({ lineupModalOpen: false, editingLineupId: null });
  const backdropProps = useBackdropClose(close);

  if (!state.lineupModalOpen) return null;

  const toggleSong = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const selectedCount = Object.values(selected).filter(Boolean).length;
  const q = query.trim().toLowerCase();
  const filteredSongs = q
    ? allSongs.filter((s) => (s.title + " " + s.artist + " " + s.tags.join(" ")).toLowerCase().includes(q))
    : allSongs;

  const submit = () => {
    if (!name.trim()) { setError("Give this lineup a name."); return; }
    const songIds = Object.keys(selected).filter((id) => selected[id]);
    if (editingLineup) updateLineup(editingLineup.id, name.trim(), songIds);
    else createLineup(name.trim(), songIds);
  };

  return (
    <div
      {...backdropProps}
      className="fixed inset-0 z-120 bg-[rgba(6,6,8,.6)] backdrop-blur-[6px] flex items-center justify-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-120 max-w-[92vw] max-h-[84vh] flex flex-col rounded-[18px] border border-border2 bg-panel shadow-app overflow-hidden animate-[fadeUp_.18s_ease_both]"
      >
        <div className="flex items-center justify-between p-[18px_20px_14px] border-b border-border">
          <div>
            <div className="text-[16px] font-semibold tracking-[-0.02em]">
              {editingLineup ? "Edit lineup" : "Create lineup"}
            </div>
            <div className="text-[12.5px] text-muted mt-0.75">Name it, then pick the songs that belong in it</div>
          </div>
          <InteractiveButton
            onClick={close}
            className="w-8 h-8 rounded-2.25 border border-border bg-panel2 text-muted cursor-pointer hover:text-text hover:bg-raise"
          >
            ✕
          </InteractiveButton>
        </div>

        <div className="p-[18px_20px] flex flex-col gap-3 overflow-y-auto flex-1">
          <input
            data-tour="lineup-name"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            placeholder="Lineup name — e.g. Sunday AM"
            className="h-9 px-2.5 rounded-2 border border-border bg-panel2 text-text text-[13px] outline-none"
          />

          <InteractiveInput
            data-tour="lineup-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, tags"
            className="h-8.5 px-2.5 rounded-2 border border-border bg-panel2 text-[13px] outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]"
          />

          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">
              {selectedCount} of {allSongs.length} songs selected
            </div>
            <InteractiveButton
              data-tour="lineup-upload"
              onClick={() => patch({ songEditorOpen: true, songEditorMode: "create" })}
              className="text-[12px] text-accent border-none cursor-pointer px-1 py-0.5 hover:text-text"
            >
              + Upload song
            </InteractiveButton>
          </div>

          <div data-tour="lineup-songs" className="flex flex-col gap-1 border border-border rounded-xl bg-panel2 p-1.5 max-h-80 overflow-y-auto">
            {filteredSongs.length === 0 && (
              <div className="p-[20px_10px] text-center text-[12.5px] text-muted">
                No songs match “{query}”.
              </div>
            )}
            {filteredSongs.map((s) => {
              const on = !!selected[s.id];
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSong(s.id)}
                  className={cx(
                    "flex items-center gap-2.5 w-full p-[8px_9px] rounded-2 border text-text cursor-pointer text-left",
                    on ? "border-accent bg-accent-soft" : "border-transparent bg-transparent"
                  )}
                >
                  <span className={cx(
                    "w-4 h-4 rounded-1 flex-none flex items-center justify-center text-[11px] text-white border",
                    on ? "border-accent bg-accent" : "border-border2 bg-transparent"
                  )}>
                    {on ? "✓" : ""}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-[13px]">
                    {s.title}
                  </span>
                  <span className="text-[12px] text-muted truncate">
                    {s.artist}
                  </span>
                  <span className="font-mono text-[10px] text-faint flex-none">{s.key}</span>
                </button>
              );
            })}
          </div>

          {error && <div className="text-[12px] text-danger">{error}</div>}
        </div>

        <div className="flex justify-end gap-2.25 p-[14px_20px] border-t border-border bg-panel2">
          <InteractiveButton
            onClick={close}
            className="h-9 px-3.5 rounded-2.25 border border-border bg-panel text-[13px] text-muted cursor-pointer hover:text-text"
          >
            Cancel
          </InteractiveButton>
          <button data-tour="lineup-create" onClick={submit} className="h-9 px-4 rounded-2.25 border-none bg-accent text-white text-[13px] font-semibold cursor-pointer">
            {editingLineup ? "Save changes" : "Create lineup"}
          </button>
        </div>
      </div>
    </div>
  );
}
