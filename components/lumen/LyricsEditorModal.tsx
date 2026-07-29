"use client";

import { useEffect, useState } from "react";
import type { Section } from "./data";
import { cx } from "./cx";
import { InteractiveButton } from "./Interactive";
import type { UseLumen } from "./useLumen";

export function LyricsEditorModal({ lumen }: { lumen: UseLumen }) {
  const { state, patch, song, saveLyrics } = lumen;
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
  // Line highlights (see HighlightedLine/data.ts) are set by selecting text
  // directly on the Live output box, not here — editing text keeps whatever
  // highlight ranges the section already had (they just carry over via the
  // object spread below, since this editor doesn't touch that field).
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
      className="fixed inset-0 z-120 bg-[rgba(6,6,8,.6)] backdrop-blur-[6px] flex items-center justify-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-160 max-h-[84vh] flex flex-col rounded-[18px] border border-border2 bg-panel shadow-app overflow-hidden animate-[fadeUp_.18s_ease_both]"
      >
        <div className="flex items-center justify-between p-[18px_20px_14px] border-b border-border">
          <div>
            <div className="text-[16px] font-semibold tracking-[-0.02em]">Edit lyrics</div>
            <div className="text-[12.5px] text-muted mt-0.75">{song.title}</div>
          </div>
          <InteractiveButton
            onClick={close}
            className="w-8 h-8 rounded-2.25 border border-border bg-panel2 text-muted cursor-pointer hover:text-text hover:bg-raise"
          >
            ✕
          </InteractiveButton>
        </div>

        <div className="p-[18px_20px] flex flex-col gap-3.5 overflow-y-auto flex-1">
          {draft.map((sec, i) => (
            <div key={i} className="border border-border rounded-xl bg-panel2 p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  value={sec.label}
                  onChange={(e) => updateLabel(i, e.target.value)}
                  className="flex-1 h-7.5 px-2.5 rounded-2 border border-border bg-panel text-text text-[12.5px] font-semibold outline-none"
                />
                <button
                  onClick={() => removeSection(i)}
                  disabled={draft.length <= 1}
                  className={cx(
                    "w-7.5 h-7.5 rounded-2 border border-border bg-panel text-muted",
                    draft.length <= 1 ? "cursor-not-allowed opacity-50" : "cursor-pointer opacity-100"
                  )}
                >
                  ✕
                </button>
              </div>
              <textarea
                value={sec.lines.join("\n")}
                onChange={(e) => updateLines(i, e.target.value)}
                rows={Math.max(2, sec.lines.length)}
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

        <div className="flex justify-end gap-2.25 p-[14px_20px] border-t border-border bg-panel2">
          <InteractiveButton
            onClick={close}
            className="h-9 px-3.5 rounded-2.25 border border-border bg-panel text-[13px] text-muted cursor-pointer hover:text-text"
          >
            Cancel
          </InteractiveButton>
          <button onClick={save} className="h-9 px-4 rounded-2.25 border-none bg-accent text-white text-[13px] font-semibold cursor-pointer">
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
