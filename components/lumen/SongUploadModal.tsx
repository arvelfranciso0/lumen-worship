"use client";

import { useRef, useState } from "react";
import type { Section } from "./data";
import { InteractiveButton } from "./Interactive";
import { parseSongText } from "./songImport";
import type { UseLumen } from "./useLumen";

const EMPTY_SECTIONS: Section[] = [{ label: "Verse 1", lines: [""] }];

const fieldStyle = {
  height: 36, padding: "0 10px", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--panel2)", color: "var(--text)", fontSize: 13, outline: "none",
} as const;

export function SongUploadModal({ v }: { v: UseLumen }) {
  const { state, patch, addSong } = v;
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [key, setKey] = useState("");
  const [bpm, setBpm] = useState("");
  const [cat, setCat] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [sections, setSections] = useState<Section[]>(EMPTY_SECTIONS);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  if (!state.uploadOpen) return null;

  const reset = () => {
    setTitle(""); setArtist(""); setKey(""); setBpm(""); setCat(""); setTagsText("");
    setSections(EMPTY_SECTIONS); setError("");
  };
  const close = () => { patch({ uploadOpen: false }); reset(); };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseSongText(String(reader.result || ""));
      setTitle(parsed.title === "Untitled Song" ? "" : parsed.title);
      setArtist(parsed.artist);
      setKey(parsed.key);
      setBpm(parsed.bpm);
      setCat(parsed.cat);
      setTagsText(parsed.tags.join(", "));
      setSections(parsed.sections);
      setError("");
    };
    reader.readAsText(file);
  };

  const updateLabel = (i: number, label: string) => {
    setSections((d) => d.map((sec, j) => (j === i ? { ...sec, label } : sec)));
  };
  const updateLines = (i: number, text: string) => {
    setSections((d) => d.map((sec, j) => (j === i ? { ...sec, lines: text.split("\n") } : sec)));
  };
  const removeSection = (i: number) => {
    setSections((d) => d.filter((_, j) => j !== i));
  };
  const addSection = () => {
    setSections((d) => [...d, { label: "New section", lines: [""] }]);
  };

  const submit = () => {
    if (!title.trim()) { setError("Add a title before uploading."); return; }
    addSong({
      title: title.trim(),
      artist: artist.trim(),
      key: key.trim(),
      bpm: bpm.trim(),
      cat: cat.trim() || "Contemporary",
      tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
      sections: sections.map((sec) => ({ ...sec, lines: sec.lines.filter((l) => l.trim() !== "") })),
    });
    reset();
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
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em" }}>Upload song</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>Fill in the details below, or load them from a text file</div>
          </div>
          <InteractiveButton
            onClick={close}
            base={{ width: 32, height: 32, borderRadius: 9, borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", background: "var(--panel2)", color: "var(--muted)", cursor: "pointer" }}
            hover={{ color: "var(--text)", background: "var(--raise)" }}
          >
            ✕
          </InteractiveButton>
        </div>

        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", flex: 1 }}>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,text/plain"
            onChange={(e) => onFile(e.target.files?.[0])}
            style={{ display: "none" }}
          />
          <InteractiveButton
            onClick={() => fileRef.current?.click()}
            base={{ height: 36, borderRadius: 9, borderWidth: 1, borderStyle: "dashed", borderColor: "var(--border2)", background: "transparent", fontSize: 12.5, color: "var(--muted)", cursor: "pointer" }}
            hover={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            Choose .txt file to prefill…
          </InteractiveButton>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
            Start with <code>Title:</code>, <code>Artist:</code>, <code>Key:</code>, <code>BPM:</code>, <code>Tags:</code> lines, then mark
            each section with <code>[Verse 1]</code>, <code>[Chorus]</code>, etc. A blank line starts a new slide within a section.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input value={title} onChange={(e) => { setTitle(e.target.value); setError(""); }} placeholder="Title" style={fieldStyle} />
            <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist" style={fieldStyle} />
            <div style={{ display: "flex", gap: 8 }}>
              <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Key (e.g. G)" style={{ ...fieldStyle, flex: 1 }} />
              <input value={bpm} onChange={(e) => setBpm(e.target.value)} placeholder="BPM (e.g. 120)" style={{ ...fieldStyle, flex: 1 }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={cat} onChange={(e) => setCat(e.target.value)} placeholder="Category (e.g. Contemporary)" style={{ ...fieldStyle, flex: 1 }} />
              <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="Tags, comma separated" style={{ ...fieldStyle, flex: 1 }} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sections.map((sec, i) => (
              <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--panel2)", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    value={sec.label}
                    onChange={(e) => updateLabel(i, e.target.value)}
                    style={{ flex: 1, height: 30, padding: "0 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)", fontSize: 12.5, fontWeight: 600, outline: "none" }}
                  />
                  <button
                    onClick={() => removeSection(i)}
                    disabled={sections.length <= 1}
                    style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--muted)", cursor: sections.length <= 1 ? "not-allowed" : "pointer", opacity: sections.length <= 1 ? 0.5 : 1 }}
                  >
                    ✕
                  </button>
                </div>
                <textarea
                  value={sec.lines.join("\n")}
                  onChange={(e) => updateLines(i, e.target.value)}
                  rows={Math.max(2, sec.lines.length)}
                  placeholder="One line per row"
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)", fontSize: 13, lineHeight: 1.5, resize: "vertical", outline: "none", fontFamily: "inherit" }}
                />
              </div>
            ))}

            <InteractiveButton
              onClick={addSection}
              base={{ height: 36, borderRadius: 9, borderWidth: 1, borderStyle: "dashed", borderColor: "var(--border2)", background: "transparent", fontSize: 12.5, color: "var(--muted)", cursor: "pointer" }}
              hover={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              + Add section
            </InteractiveButton>
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
            Add song
          </button>
        </div>
      </div>
    </div>
  );
}
