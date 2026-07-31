"use client";

import { useEffect, useState } from "react";
import { cx } from "./cx";
import { InteractiveButton } from "./Interactive";
import { parseLyricsBlock, sectionsToText } from "./songImport";
import { useBackdropClose } from "./useBackdropClose";
import type { UseLumen } from "./useLumen";

const fieldClass = "h-9 px-2.5 rounded-2 border border-border bg-panel2 text-text text-[13px] outline-none disabled:opacity-50 disabled:cursor-not-allowed";

export function LyricsEditorModal({ lumen }: { lumen: UseLumen }) {
  const { state, patch, song, saveLyrics, updateSongMetadata } = lumen;
  const [draft, setDraft] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [key, setKey] = useState("");
  const [bpm, setBpm] = useState("");
  const [cat, setCat] = useState("");
  const [tagsText, setTagsText] = useState("");

  const isCustomSong = song.id.startsWith("custom-");

  useEffect(() => {
    if (!state.lyricsEditorOpen) return;
    setDraft(sectionsToText(song.sections));
    setTitle(song.title);
    setArtist(song.artist);
    setKey(song.key);
    setBpm(song.bpm);
    setCat(song.cat);
    setTagsText(song.tags.join(", "));
  }, [state.lyricsEditorOpen, song]);

  const close = () => patch({ lyricsEditorOpen: false });
  const backdropProps = useBackdropClose(close);

  if (!state.lyricsEditorOpen) return null;

  const save = () => {
    saveLyrics(parseLyricsBlock(draft));
    if (isCustomSong) {
      updateSongMetadata({
        title: title.trim() || song.title,
        artist: artist.trim(),
        key: key.trim(),
        bpm: bpm.trim(),
        cat: cat.trim() || song.cat,
        tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
      });
    }
    close();
  };

  return (
    <div
      {...backdropProps}
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
          {!isCustomSong && (
            <div className="text-[12px] text-muted leading-[1.6] p-2.5 rounded-2 border border-border bg-panel2">
              This is a built-in sample song — only its lyrics can be edited. Title/artist/key/etc. are fixed.
            </div>
          )}

          <div className="flex flex-col gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!isCustomSong}
              placeholder="Title"
              className={fieldClass}
            />
            <input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              disabled={!isCustomSong}
              placeholder="Artist"
              className={fieldClass}
            />
            <div className="flex gap-2">
              <input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                disabled={!isCustomSong}
                placeholder="Key (e.g. G)"
                className={cx(fieldClass, "flex-1")}
              />
              <input
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
                disabled={!isCustomSong}
                placeholder="BPM (e.g. 120)"
                className={cx(fieldClass, "flex-1")}
              />
            </div>
            <div className="flex gap-2">
              <input
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                disabled={!isCustomSong}
                placeholder="Category (e.g. Contemporary)"
                className={cx(fieldClass, "flex-1")}
              />
              <input
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                disabled={!isCustomSong}
                placeholder="Tags, comma separated"
                className={cx(fieldClass, "flex-1")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-[12px] text-muted leading-[1.6]">
              Type a section name on its own line — like <code>Verse 1</code>, <code>Chorus</code>, or <code>Bridge</code> —
              to start a new section. Leave a blank line between slides.
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={12}
              className="w-full p-2.5 rounded-2 border border-border bg-panel2 text-text text-[13px] leading-normal resize-y outline-none font-[inherit]"
            />
          </div>
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
