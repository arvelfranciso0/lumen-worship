"use client";

import { useEffect, useState } from "react";
import { InteractiveButton } from "./Interactive";
import { parseLyricsBlock, sectionsToText } from "./songImport";
import type { UseLumen } from "./useLumen";

export function LyricsEditorModal({ lumen }: { lumen: UseLumen }) {
  const { state, patch, song, saveLyrics } = lumen;
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (state.lyricsEditorOpen) setDraft(sectionsToText(song.sections));
  }, [state.lyricsEditorOpen, song]);

  if (!state.lyricsEditorOpen) return null;

  const close = () => patch({ lyricsEditorOpen: false });
  const save = () => {
    saveLyrics(parseLyricsBlock(draft));
    close();
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

        <div className="p-[18px_20px] flex flex-col gap-2.5 overflow-y-auto flex-1">
          <div className="text-[12px] text-muted leading-[1.6]">
            Type a section name on its own line — like <code>Verse 1</code>, <code>Chorus</code>, or <code>Bridge</code> —
            to start a new section. Leave a blank line between slides.
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={16}
            className="w-full flex-1 p-2.5 rounded-2 border border-border bg-panel2 text-text text-[13px] leading-normal resize-y outline-none font-[inherit]"
          />
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
