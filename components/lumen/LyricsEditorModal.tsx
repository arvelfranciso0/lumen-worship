"use client";

import { useEffect, useState } from "react";
import type { Section } from "./data";
import { InteractiveButton } from "./Interactive";
import type { UseLumen } from "./useLumen";

export function LyricsEditorModal({ v }: { v: UseLumen }) {
  const { state, patch, song, saveLyrics } = v;
  const [draft, setDraft] = useState<Section[]>(song.sections);

  useEffect(() => {
    if (state.lyricsEditorOpen) setDraft(song.sections);
  }, [state.lyricsEditorOpen, song]);

  if (!state.lyricsEditorOpen) return null;

  const close = () => patch({ lyricsEditorOpen: false });
  const save = () => {
    saveLyrics(draft.map((sec) => ({ ...sec, lines: sec.lines.filter((l) => l.trim() !== "") })));
    close();
  };

  const updateLabel = (i: number, label: string) => {
    setDraft((d) => d.map((sec, j) => (j === i ? { ...sec, label } : sec)));
  };
  const updateLines = (i: number, text: string) => {
    setDraft((d) => d.map((sec, j) => (j === i ? { ...sec, lines: text.split("\n") } : sec)));
  };
  const removeSection = (i: number) => {
    setDraft((d) => d.filter((_, j) => j !== i));
  };
  const addSection = () => {
    setDraft((d) => [...d, { label: "New section", lines: [""] }]);
  };

  return (
    <div
      onClick={close}
      style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(6,6,8,.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 640, maxHeight: "84vh", display: "flex", flexDirection: "column", borderRadius: 18, border: "1px solid var(--border2)", background: "var(--panel)", boxShadow: "var(--shadow)", overflow: "hidden", animation: "fadeUp .18s ease both" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em" }}>Edit lyrics</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>{song.title}</div>
          </div>
          <InteractiveButton
            onClick={close}
            base={{ width: 32, height: 32, borderRadius: 9, border: "1px solid var(--border)", background: "var(--panel2)", color: "var(--muted)", cursor: "pointer" }}
            hover={{ color: "var(--text)", background: "var(--raise)" }}
          >
            ✕
          </InteractiveButton>
        </div>

        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", flex: 1 }}>
          {draft.map((sec, i) => (
            <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--panel2)", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  value={sec.label}
                  onChange={(e) => updateLabel(i, e.target.value)}
                  style={{ flex: 1, height: 30, padding: "0 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)", fontSize: 12.5, fontWeight: 600, outline: "none" }}
                />
                <button
                  onClick={() => removeSection(i)}
                  disabled={draft.length <= 1}
                  style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--muted)", cursor: draft.length <= 1 ? "not-allowed" : "pointer", opacity: draft.length <= 1 ? 0.5 : 1 }}
                >
                  ✕
                </button>
              </div>
              <textarea
                value={sec.lines.join("\n")}
                onChange={(e) => updateLines(i, e.target.value)}
                rows={Math.max(2, sec.lines.length)}
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)", fontSize: 13, lineHeight: 1.5, resize: "vertical", outline: "none", fontFamily: "inherit" }}
              />
            </div>
          ))}

          <InteractiveButton
            onClick={addSection}
            base={{ height: 36, borderRadius: 9, border: "1px dashed var(--border2)", background: "transparent", fontSize: 12.5, color: "var(--muted)", cursor: "pointer" }}
            hover={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            + Add section
          </InteractiveButton>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, padding: "14px 20px", borderTop: "1px solid var(--border)", background: "var(--panel2)" }}>
          <InteractiveButton
            onClick={close}
            base={{ height: 36, padding: "0 14px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--panel)", fontSize: 13, color: "var(--muted)", cursor: "pointer" }}
            hover={{ color: "var(--text)" }}
          >
            Cancel
          </InteractiveButton>
          <button onClick={save} style={{ height: 36, padding: "0 16px", borderRadius: 9, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
