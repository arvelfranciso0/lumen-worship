"use client";

import { cx } from "../cx";

const fieldClass = "h-9 px-2.5 rounded-2 border border-border bg-panel2 text-text text-[13px] outline-none";

// Title/artist/key/bpm/category/tags/CCLI text fields.
export function SongEditorMetadataFields({
  title, onTitleChange, artist, onArtistChange, songKey, onKeyChange, bpm, onBpmChange,
  cat, onCatChange, tagsText, onTagsTextChange, ccli, onCcliChange,
}: {
  title: string; onTitleChange: (value: string) => void;
  artist: string; onArtistChange: (value: string) => void;
  songKey: string; onKeyChange: (value: string) => void;
  bpm: string; onBpmChange: (value: string) => void;
  cat: string; onCatChange: (value: string) => void;
  tagsText: string; onTagsTextChange: (value: string) => void;
  ccli: string; onCcliChange: (value: string) => void;
}) {
  return (
    <div data-tour="song-editor-fields" className="flex flex-col gap-2">
      <input
        value={title}
        onChange={(changeEvent) => onTitleChange(changeEvent.target.value)}
        placeholder="Title"
        className={fieldClass}
      />
      <input
        value={artist}
        onChange={(changeEvent) => onArtistChange(changeEvent.target.value)}
        placeholder="Artist"
        className={fieldClass}
      />
      <div className="flex gap-2">
        <input
          value={songKey}
          onChange={(changeEvent) => onKeyChange(changeEvent.target.value)}
          placeholder="Key (e.g. G)"
          className={cx(fieldClass, "flex-1")}
        />
        <input
          value={bpm}
          onChange={(changeEvent) => onBpmChange(changeEvent.target.value)}
          placeholder="BPM (e.g. 120)"
          className={cx(fieldClass, "flex-1")}
        />
      </div>
      <div className="flex gap-2">
        <input
          value={cat}
          onChange={(changeEvent) => onCatChange(changeEvent.target.value)}
          placeholder="Category (e.g. Contemporary)"
          className={cx(fieldClass, "flex-1")}
        />
        <input
          value={tagsText}
          onChange={(changeEvent) => onTagsTextChange(changeEvent.target.value)}
          placeholder="Tags, comma separated"
          className={cx(fieldClass, "flex-1")}
        />
      </div>
      <input
        value={ccli}
        onChange={(changeEvent) => onCcliChange(changeEvent.target.value)}
        placeholder="CCLI # (optional)"
        className={fieldClass}
      />
    </div>
  );
}
