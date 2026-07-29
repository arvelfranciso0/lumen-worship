"use client";

import { useEffect, useState } from "react";
import { InteractiveButton, InteractiveInput } from "./Interactive";
import type { UseLumen } from "./useLumen";

export function LineupModal({ v }: { v: UseLumen }) {
  const { state, patch, allSongs, createLineup, updateLineup } = v;
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

  if (!state.lineupModalOpen) return null;

  const close = () => patch({ lineupModalOpen: false, editingLineupId: null });
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
      onClick={close}
      style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(6,6,8,.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 480, maxHeight: "84vh", display: "flex", flexDirection: "column", borderRadius: 18, border: "1px solid var(--border2)", background: "var(--panel)", boxShadow: "var(--shadow)", overflow: "hidden", animation: "fadeUp .18s ease both" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em" }}>
              {editingLineup ? "Edit lineup" : "Create lineup"}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>Name it, then pick the songs that belong in it</div>
          </div>
          <InteractiveButton
            onClick={close}
            base={{ width: 32, height: 32, borderRadius: 9, borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", background: "var(--panel2)", color: "var(--muted)", cursor: "pointer" }}
            hover={{ color: "var(--text)", background: "var(--raise)" }}
          >
            ✕
          </InteractiveButton>
        </div>

        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", flex: 1 }}>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            placeholder="Lineup name — e.g. Sunday AM"
            style={{ height: 36, padding: "0 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel2)", color: "var(--text)", fontSize: 13, outline: "none" }}
          />

          <InteractiveInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, tags"
            base={{ height: 34, padding: "0 10px", borderRadius: 8, borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", background: "var(--panel2)", fontSize: 13, outline: "none" }}
            focusStyle={{ borderColor: "var(--accent)", boxShadow: "0 0 0 3px var(--accent-soft)" }}
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--faint)" }}>
              {selectedCount} of {allSongs.length} songs selected
            </div>
            <InteractiveButton
              onClick={() => patch({ uploadOpen: true })}
              base={{ fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
              hover={{ color: "var(--text)" }}
            >
              + Upload song
            </InteractiveButton>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4, border: "1px solid var(--border)", borderRadius: 12, background: "var(--panel2)", padding: 6, maxHeight: 320, overflowY: "auto" }}>
            {filteredSongs.length === 0 && (
              <div style={{ padding: "20px 10px", textAlign: "center", fontSize: 12.5, color: "var(--muted)" }}>
                No songs match “{query}”.
              </div>
            )}
            {filteredSongs.map((s) => {
              const on = !!selected[s.id];
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSong(s.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 9px", borderRadius: 8,
                    border: "1px solid " + (on ? "var(--accent)" : "transparent"),
                    background: on ? "var(--accent-soft)" : "transparent",
                    color: "var(--text)", cursor: "pointer", textAlign: "left",
                  }}
                >
                  <span style={{
                    width: 16, height: 16, borderRadius: 4, flex: "none",
                    border: "1px solid " + (on ? "var(--accent)" : "var(--border2)"),
                    background: on ? "var(--accent)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff",
                  }}>
                    {on ? "✓" : ""}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>
                    {s.title}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.artist}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--faint)", flex: "none" }}>{s.key}</span>
                </button>
              );
            })}
          </div>

          {error && <div style={{ fontSize: 12, color: "var(--danger)" }}>{error}</div>}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, padding: "14px 20px", borderTop: "1px solid var(--border)", background: "var(--panel2)" }}>
          <InteractiveButton
            onClick={close}
            base={{ height: 36, padding: "0 14px", borderRadius: 9, borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", background: "var(--panel)", fontSize: 13, color: "var(--muted)", cursor: "pointer" }}
            hover={{ color: "var(--text)" }}
          >
            Cancel
          </InteractiveButton>
          <button onClick={submit} style={{ height: 36, padding: "0 16px", borderRadius: 9, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {editingLineup ? "Save changes" : "Create lineup"}
          </button>
        </div>
      </div>
    </div>
  );
}
