"use client";

import { InteractiveButton } from "../ui/Interactive";
import { useBackdropClose } from "../hooks/useBackdropClose";
import { useSongEditorForm } from "./useSongEditorForm";
import { SongEditorFileImport } from "./SongEditorFileImport";
import { SongEditorMetadataFields } from "./SongEditorMetadataFields";
import { SongEditorLyricsField } from "./SongEditorLyricsField";
import type { UseLumen } from "../useLumen";

// Shared create/edit form for song metadata and lyrics.
export function SongEditorModal({ lumen }: { lumen: UseLumen }) {
  const { state } = lumen;
  const {
    isEdit, song, title, setTitle, artist, setArtist, key, setKey, bpm, setBpm, cat, setCat,
    tagsText, setTagsText, ccli, setCcli, lyricsText, setLyricsText, error, setError,
    fileRef, close, onFile, submit,
  } = useSongEditorForm(lumen);

  const backdropProps = useBackdropClose(close);

  if (!state.songEditorOpen) return null;

  return (
    <div
      {...backdropProps}
      className="fixed inset-0 z-120 bg-[rgba(6,6,8,.6)] backdrop-blur-[6px] flex items-center justify-center"
    >
      <div
        onClick={(clickEvent) => clickEvent.stopPropagation()}
        className="w-160 max-w-[92vw] max-h-[84vh] flex flex-col rounded-[18px] border border-border2 bg-panel shadow-app overflow-hidden animate-[fadeUp_.18s_ease_both]"
      >
        <div className="flex items-center justify-between p-[18px_20px_14px] border-b border-border">
          <div>
            <div className="text-[16px] font-semibold tracking-[-0.02em]">{isEdit ? "Edit lyrics" : "Upload song"}</div>
            <div className="text-[12.5px] text-muted mt-0.75">
              {isEdit ? song.title : "Fill in the details below, or load them from a text file"}
            </div>
          </div>
          <InteractiveButton
            onClick={close}
            className="w-8 h-8 rounded-2.25 border border-border bg-panel2 text-muted cursor-pointer hover:text-text hover:bg-raise"
          >
            ✕
          </InteractiveButton>
        </div>

        <div className="p-[18px_20px] flex flex-col gap-3.5 overflow-y-auto flex-1">
          <SongEditorFileImport fileRef={fileRef} onFile={onFile} />

          <SongEditorMetadataFields
            title={title}
            onTitleChange={(value) => { setTitle(value); setError(""); }}
            artist={artist}
            onArtistChange={setArtist}
            songKey={key}
            onKeyChange={setKey}
            bpm={bpm}
            onBpmChange={setBpm}
            cat={cat}
            onCatChange={setCat}
            tagsText={tagsText}
            onTagsTextChange={setTagsText}
            ccli={ccli}
            onCcliChange={setCcli}
          />

          <SongEditorLyricsField
            lyricsText={lyricsText}
            onLyricsTextChange={setLyricsText}
            error={error}
          />
        </div>

        <div className="flex justify-end gap-2.25 p-[14px_20px] border-t border-border bg-panel2">
          <InteractiveButton
            onClick={close}
            className="h-9 px-3.5 rounded-2.25 border border-border bg-panel text-[13px] text-muted cursor-pointer hover:text-text"
          >
            Cancel
          </InteractiveButton>
          <button data-tour="song-editor-save" onClick={submit} className="h-9 px-4 rounded-2.25 border-none bg-accent text-white text-[13px] font-semibold cursor-pointer">
            {isEdit ? "Save changes" : "Add song"}
          </button>
        </div>
      </div>
    </div>
  );
}
