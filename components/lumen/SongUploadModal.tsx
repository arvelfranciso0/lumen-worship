"use client";

import { useRef, useState } from "react";
import { cx } from "./cx";
import { InteractiveButton } from "./Interactive";
import { extractMetadataHeader, parseLyricsBlock } from "./songImport";
import { useBackdropClose } from "./useBackdropClose";
import type { UseLumen } from "./useLumen";

const fieldClass = "h-9 px-2.5 rounded-2 border border-border bg-panel2 text-text text-[13px] outline-none";

// A ready-to-edit example matching extractMetadataHeader's format — download,
// tweak the header lines and lyrics, then upload it right back in via
// "Choose .txt file to prefill…".
const SAMPLE_SONG_TEXT = `Title: Amazing Grace
Artist: John Newton
Key: G
BPM: 72
Category: Hymn
Tags: hymn, classic

Verse 1
Amazing grace, how sweet the sound
That saved a wretch like me
I once was lost, but now am found
Was blind but now I see

Chorus
'Twas grace that taught my heart to fear
And grace my fears relieved
How precious did that grace appear
The hour I first believed
`;

function downloadSampleSongFile() {
  const blob = new Blob([SAMPLE_SONG_TEXT], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "sample-song.txt";
  link.click();
  URL.revokeObjectURL(url);
}

export function SongUploadModal({ lumen }: { lumen: UseLumen }) {
  const { state, patch, addSong } = lumen;
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [key, setKey] = useState("");
  const [bpm, setBpm] = useState("");
  const [cat, setCat] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [lyricsText, setLyricsText] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setTitle(""); setArtist(""); setKey(""); setBpm(""); setCat(""); setTagsText("");
    setLyricsText(""); setError("");
  };
  const close = () => { patch({ uploadOpen: false }); reset(); };
  const backdropProps = useBackdropClose(close);

  if (!state.uploadOpen) return null;

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = extractMetadataHeader(String(reader.result || ""));
      setTitle(parsed.title);
      setArtist(parsed.artist);
      setKey(parsed.key);
      setBpm(parsed.bpm);
      setCat(parsed.cat);
      setTagsText(parsed.tags.join(", "));
      setLyricsText(parsed.body);
      setError("");
    };
    reader.readAsText(file);
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
      sections: parseLyricsBlock(lyricsText),
    });
    reset();
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
          <div className="flex gap-2">
            <InteractiveButton
              onClick={() => fileRef.current?.click()}
              className="flex-1 h-9 rounded-2.25 border border-dashed border-border2 bg-transparent text-[12.5px] text-muted cursor-pointer hover:border-accent hover:text-accent"
            >
              Choose .txt file to prefill…
            </InteractiveButton>
            <InteractiveButton
              onClick={downloadSampleSongFile}
              className="h-9 px-3 rounded-2.25 border border-border2 bg-transparent text-[12.5px] text-muted cursor-pointer hover:border-accent hover:text-accent"
            >
              Download sample .txt
            </InteractiveButton>
          </div>
          <div className="text-[12px] text-muted leading-[1.6]">
            Start the file with any of <code>Title:</code>, <code>Artist:</code>, <code>Key:</code>, <code>BPM:</code>,{" "}
            <code>Category:</code>, <code>Tags:</code> (one per line) to prefill the fields below — everything after
            the first blank line is treated as the lyrics.
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
            <div className="text-[12px] text-muted leading-[1.6]">
              Type a section name on its own line — like <code>Verse 1</code>, <code>Chorus</code>, or <code>Bridge</code> —
              to start a new section. Leave a blank line between slides.
            </div>
            <textarea
              value={lyricsText}
              onChange={(e) => setLyricsText(e.target.value)}
              rows={12}
              placeholder={"Verse 1\nAmazing grace, how sweet the sound\nThat saved a wretch like me\n\nChorus\n..."}
              className="w-full p-2.5 rounded-2 border border-border bg-panel2 text-text text-[13px] leading-normal resize-y outline-none font-[inherit]"
            />
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
