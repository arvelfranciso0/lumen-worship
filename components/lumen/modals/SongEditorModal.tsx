"use client";

import { InteractiveButton } from "../ui/Interactive";
import { ResizeHandle } from "../layout/ResizeHandle";
import { useSongEditorForm } from "./useSongEditorForm";
import { SongEditorFileImport } from "./SongEditorFileImport";
import { SongEditorMetadataFields } from "./SongEditorMetadataFields";
import { SongEditorLyricsField } from "./SongEditorLyricsField";
import type { UseLumen } from "../useLumen";

// Docked side panel for creating/editing a song; closes only via Cancel or ✕.
export function SongEditorModal({ lumen }: { lumen: UseLumen }) {
  const { state } = lumen;
  const {
    isEdit, song, title, setTitle, artist, setArtist, key, setKey, bpm, setBpm, cat, setCat,
    tagsText, setTagsText, ccli, setCcli, lyricsText, setLyricsText, error, setError,
    fileRef, close, onFile, submit,
  } = useSongEditorForm(lumen);

  if (!state.songEditorOpen) return null;

  return (
    <aside
      style={{ width: state.layoutSizes.songEditorWidth }}
      className="fixed top-0 right-0 bottom-0 z-120 max-w-full flex"
    >
      <ResizeHandle
        axis="horizontal"
        onResizeDelta={(deltaPixels) => lumen.adjustLayoutSize("songEditorWidth", -deltaPixels)}
      />
      <div
        className="flex-1 min-w-0 flex flex-col bg-panel shadow-app overflow-hidden animate-[slideInRight_.18s_ease_both]"
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
    </aside>
  );
}
