"use client";

import { useState } from "react";
import { cx } from "../../cx";
import { InteractiveButton, InteractiveInput } from "../../ui/Interactive";
import type { UseLumen } from "../../useLumen";

// Editable view of a lineup's song membership (drag-and-drop, remove, add).
export function LineupDetail({
  lumen, lineup, onBack,
}: {
  lumen: UseLumen;
  lineup: { id: string; name: string; songIds: string[] };
  onBack: () => void;
}) {
  const {
    state, patch, allSongs, activateLineup, reorderLineupSongs, addSongToLineup, removeSongFromLineup,
    renameLineup, deleteLineup, askConfirm,
  } = lumen;
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(lineup.name);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [draggedLibrarySongId, setDraggedLibrarySongId] = useState<string | null>(null);
  const [draggedSongIndex, setDraggedSongIndex] = useState<number | null>(null);

  const lineupSongs = lineup.songIds
    .map((songId) => allSongs.find((candidate) => candidate.id === songId))
    .filter((maybeSong): maybeSong is (typeof allSongs)[number] => !!maybeSong);

  const availableSongs = allSongs.filter((songEntry) => !lineup.songIds.includes(songEntry.id));
  const filteredLibrary = libraryQuery.trim()
    ? availableSongs.filter((songEntry) => (songEntry.title + " " + songEntry.artist).toLowerCase().includes(libraryQuery.trim().toLowerCase()))
    : availableSongs;

  const commitRename = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== lineup.name) renameLineup(lineup.id, trimmed);
    setRenaming(false);
  };

  return (
    // Header, song list, and library each scroll independently.
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-none flex items-center gap-2 p-[14px_10px_12px]">
        <button onClick={onBack} className="border-none cursor-pointer text-[16px] text-muted p-0.5 leading-none" title="Back to lineups">
          ←
        </button>
        <div className="flex-1 min-w-0">
          {renaming ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(changeEvent) => setNameDraft(changeEvent.target.value)}
              onBlur={commitRename}
              onKeyDown={(keyEvent) => { if (keyEvent.key === "Enter") commitRename(); if (keyEvent.key === "Escape") { setNameDraft(lineup.name); setRenaming(false); } }}
              className="w-full h-6.5 px-1.5 rounded-1.5 border border-accent bg-panel2 text-[15px] font-semibold text-text outline-none"
            />
          ) : (
            <button
              onClick={() => { setNameDraft(lineup.name); setRenaming(true); }}
              className="flex items-center gap-1.5 border-none bg-transparent cursor-pointer p-0 text-left"
              title="Rename lineup"
            >
              <span className="text-[15px] font-semibold tracking-[-0.01em] truncate">{lineup.name}</span>
              <span className="text-faint text-[11px]">✎</span>
            </button>
          )}
          <div className="text-[11.5px] text-faint mt-0.5">
            {lineup.songIds.length === 1 ? "1 song" : lineup.songIds.length + " songs"}
            {lineup.songIds.length > 1 && " · drag ⠿ to reorder"}
          </div>
        </div>
        {lineup.id === state.activeLineupId ? (
          <span className="text-[12px] font-semibold text-accent border border-accent rounded-[7px] p-[5px_9px] bg-accent-soft">
            Active
          </span>
        ) : (
          <InteractiveButton
            onClick={() => activateLineup(lineup.id)}
            className="text-[12px] text-white bg-accent border-none rounded-[7px] p-[5px_9px] cursor-pointer hover:brightness-110"
          >
            Activate
          </InteractiveButton>
        )}
        <InteractiveButton
          onClick={() => askConfirm({ title: "Delete lineup?", body: lineup.name, danger: true, onConfirm: () => { deleteLineup(lineup.id); onBack(); } })}
          className="text-[12px] text-danger border border-border rounded-[7px] p-[5px_9px] cursor-pointer hover:text-white hover:bg-danger"
        >
          Delete
        </InteractiveButton>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-[0_10px_8px]">
      {lineupSongs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 text-center p-[24px_18px] text-muted">
          <div className="text-[13px] font-semibold text-text">No songs in this lineup</div>
          <div className="text-[12px] leading-normal">Drag songs in from &ldquo;All songs&rdquo; below.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {lineupSongs.map((lineupSong, lineupSongIndex) => {
            const on = lineupSong.id === state.songId;
            const isDragging = draggedSongIndex === lineupSongIndex;
            return (
              <div
                key={lineupSong.id}
                draggable
                onDragStart={() => setDraggedSongIndex(lineupSongIndex)}
                onDragOver={(dragEvent) => dragEvent.preventDefault()}
                onDrop={() => {
                  if (draggedSongIndex !== null) {
                    reorderLineupSongs(lineup.id, draggedSongIndex, lineupSongIndex);
                  } else if (draggedLibrarySongId) {
                    addSongToLineup(lineup.id, draggedLibrarySongId, lineupSongIndex);
                  }
                  setDraggedSongIndex(null);
                  setDraggedLibrarySongId(null);
                }}
                onDragEnd={() => setDraggedSongIndex(null)}
                onClick={() => patch({ songId: lineupSong.id, idx: 0 })}
                className={cx(
                  "flex items-start gap-2 p-[11px_12px_10px] rounded-xl cursor-pointer border",
                  on ? "border-accent bg-accent-soft shadow-[0_0_0_3px_var(--accent-soft)]" : "border-border bg-panel2 shadow-none",
                  isDragging && "opacity-40"
                )}
              >
                <span className="flex-none cursor-grab active:cursor-grabbing text-faint text-[13px] pt-0.5">⠿</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold tracking-[-0.01em] truncate">
                    {lineupSong.title}
                  </div>
                  <div className="text-[12px] text-muted mt-0.5 truncate">
                    {lineupSong.artist}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2.25">
                    {lineupSong.key && (
                      <span className="font-mono text-[10px] text-text bg-raise border border-border p-[2px_6px] rounded-[5px]">
                        {lineupSong.key}
                      </span>
                    )}
                    <span className="font-mono text-[10px] text-faint">{lineupSong.bpm}</span>
                  </div>
                </div>
                <button
                  onClick={(clickEvent) => { clickEvent.stopPropagation(); removeSongFromLineup(lineup.id, lineupSong.id); }}
                  className="border-none cursor-pointer text-[12px] leading-none p-0.5 text-faint hover:text-danger"
                  title="Remove from lineup"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
      </div>

      <div
        onDragOver={(dragEvent) => dragEvent.preventDefault()}
        onDrop={() => {
          if (draggedLibrarySongId) addSongToLineup(lineup.id, draggedLibrarySongId);
          setDraggedLibrarySongId(null);
        }}
        className="flex-none p-[0_10px_20px] pt-3 border-t border-border"
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() => setLibraryOpen((open) => !open)}
            className="flex items-center gap-1.5 flex-1 min-w-0 border-none bg-transparent cursor-pointer p-[6px_2px] text-[11px] font-semibold tracking-[.06em] uppercase text-faint"
          >
            <span className={cx("transition-transform", libraryOpen && "rotate-90")}>▸</span>
            All songs — drag to add
          </button>
          {/* Creates a new song directly from the lineup library. */}
          <InteractiveButton
            onClick={() => patch({ songEditorOpen: true, songEditorMode: "create" })}
            title="Create a new song"
            className="flex-none border-none bg-transparent cursor-pointer p-[6px_2px] text-[11px] font-semibold tracking-[.02em] text-accent hover:text-text"
          >
            + New
          </InteractiveButton>
        </div>
        {libraryOpen && (
          <div className="flex flex-col gap-1.5 mt-1.5">
            <InteractiveInput
              value={libraryQuery}
              onChange={(changeEvent) => setLibraryQuery(changeEvent.target.value)}
              placeholder="Search songs"
              className="h-7.5 px-2 rounded-2 border border-border bg-panel2 text-[12px] outline-none"
            />
            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
              {filteredLibrary.map((songEntry) => (
                <div
                  key={songEntry.id}
                  draggable
                  onDragStart={() => setDraggedLibrarySongId(songEntry.id)}
                  onDragEnd={() => setDraggedLibrarySongId(null)}
                  className="flex items-center gap-2 p-[7px_8px] rounded-2 border border-border bg-panel2 cursor-grab active:cursor-grabbing"
                >
                  <span className="flex-1 min-w-0 truncate text-[12.5px]">{songEntry.title}</span>
                  <span className="text-[11px] text-muted truncate">{songEntry.artist}</span>
                  <button
                    onClick={() => addSongToLineup(lineup.id, songEntry.id)}
                    className="border-none cursor-pointer text-[12px] text-accent p-0.5 flex-none"
                    title="Add to lineup"
                  >
                    +
                  </button>
                </div>
              ))}
              {filteredLibrary.length === 0 && (
                <div className="text-[11.5px] text-faint p-[8px_2px]">Every song is already in this lineup.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
