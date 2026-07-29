"use client";

import { useRef, useState } from "react";
import type { Section } from "./data";
import { cx } from "./cx";
import { InteractiveButton } from "./Interactive";
import { parseSongText } from "./songImport";
import type { UseLumen } from "./useLumen";

const EMPTY_SECTIONS: Section[] = [{ label: "Verse 1", lines: [""] }];

const fieldClass = "h-9 px-2.5 rounded-2 border border-border bg-panel2 text-text text-[13px] outline-none";

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
      className="fixed inset-0 z-120 bg-[rgba(6,6,8,.6)] backdrop-blur-[6px] flex items-center justify-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-160 max-h-[84vh] flex flex-col rounded-[18px] border border-border2 bg-panel shadow-app overflow-hidden animate-[fadeUp_.18s_ease_both]"
      >
        <div className="flex items-center justify-between p-[18px_20px_14px] border-b border-border">
          <div>
            <div className="text-[16px] font-semibold tracking-[-0.02em]">Upload song</div>
            <div className="text-[12.5px] text-muted mt-0.75">Fill in the details below, or load them from a text file</div>
          </div>
          <InteractiveButton
            onClick={close}
            className="w-8 h-8 rounded-2.25 border border-border bg-panel2 text-muted cursor-pointer hover:text-text hover:bg-raise"
          >
            ✕
          </InteractiveButton>
        </div>

        <div className="p-[18px_20px] flex flex-col gap-3.5 overflow-y-auto flex-1">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,text/plain"
            onChange={(e) => onFile(e.target.files?.[0])}
            className="hidden"
          />
          <InteractiveButton
            onClick={() => fileRef.current?.click()}
            className="h-9 rounded-2.25 border border-dashed border-border2 bg-transparent text-[12.5px] text-muted cursor-pointer hover:border-accent hover:text-accent"
          >
            Choose .txt file to prefill…
          </InteractiveButton>
          <div className="text-[12px] text-muted leading-[1.6]">
            Start with <code>Title:</code>, <code>Artist:</code>, <code>Key:</code>, <code>BPM:</code>, <code>Tags:</code> lines, then mark
            each section with <code>[Verse 1]</code>, <code>[Chorus]</code>, etc. A blank line starts a new slide within a section.
          </div>

          <div className="flex flex-col gap-2">
            <input value={title} onChange={(e) => { setTitle(e.target.value); setError(""); }} placeholder="Title" className={fieldClass} />
            <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist" className={fieldClass} />
            <div className="flex gap-2">
              <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Key (e.g. G)" className={cx(fieldClass, "flex-1")} />
              <input value={bpm} onChange={(e) => setBpm(e.target.value)} placeholder="BPM (e.g. 120)" className={cx(fieldClass, "flex-1")} />
            </div>
            <div className="flex gap-2">
              <input value={cat} onChange={(e) => setCat(e.target.value)} placeholder="Category (e.g. Contemporary)" className={cx(fieldClass, "flex-1")} />
              <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="Tags, comma separated" className={cx(fieldClass, "flex-1")} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {sections.map((sec, i) => (
              <div key={i} className="border border-border rounded-xl bg-panel2 p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    value={sec.label}
                    onChange={(e) => updateLabel(i, e.target.value)}
                    className="flex-1 h-7.5 px-2.5 rounded-2 border border-border bg-panel text-text text-[12.5px] font-semibold outline-none"
                  />
                  <button
                    onClick={() => removeSection(i)}
                    disabled={sections.length <= 1}
                    className="w-7.5 h-7.5 rounded-2 border border-border bg-panel text-muted disabled:cursor-not-allowed disabled:opacity-50 not-disabled:cursor-pointer not-disabled:opacity-100"
                  >
                    ✕
                  </button>
                </div>
                <textarea
                  value={sec.lines.join("\n")}
                  onChange={(e) => updateLines(i, e.target.value)}
                  rows={Math.max(2, sec.lines.length)}
                  placeholder="One line per row"
                  className="w-full p-2.5 rounded-2 border border-border bg-panel text-text text-[13px] leading-normal resize-y outline-none font-[inherit]"
                />
              </div>
            ))}

            <InteractiveButton
              onClick={addSection}
              className="h-9 rounded-2.25 border border-dashed border-border2 bg-transparent text-[12.5px] text-muted cursor-pointer hover:border-accent hover:text-accent"
            >
              + Add section
            </InteractiveButton>
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
          <button onClick={submit} className="h-9 px-4 rounded-2.25 border-none bg-accent text-white text-[13px] font-semibold cursor-pointer">
            Add song
          </button>
        </div>
      </div>
    </div>
  );
}
