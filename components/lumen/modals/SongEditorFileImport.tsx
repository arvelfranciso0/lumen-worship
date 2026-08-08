"use client";

import type { RefObject } from "react";
import { InteractiveButton } from "../ui/Interactive";
import { downloadSampleSongFile } from "./sampleSongFile";

// File-upload row that prefills the form fields from a .txt file, plus a sample download.
export function SongEditorFileImport({
  fileRef, onFile,
}: {
  fileRef: RefObject<HTMLInputElement | null>; onFile: (file: File | undefined) => void;
}) {
  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".txt,text/plain"
        onChange={(changeEvent) => onFile(changeEvent.target.files?.[0])}
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
        <code>Category:</code>, <code>Tags:</code>, <code>CCLI:</code> (one per line) to prefill the fields below —
        everything after the first blank line is treated as the lyrics.
      </div>
    </>
  );
}
