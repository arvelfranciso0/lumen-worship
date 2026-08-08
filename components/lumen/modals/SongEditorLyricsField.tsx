"use client";

// Lyrics textarea, with instructions on sections/slides and any parse/validation error.
export function SongEditorLyricsField({
  lyricsText, onLyricsTextChange, error,
}: {
  lyricsText: string; onLyricsTextChange: (value: string) => void; error: string;
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="text-[12px] text-muted leading-[1.6]">
          Type a section name on its own line — like <code>Verse 1</code>, <code>Chorus</code>, or <code>Bridge</code> —
          to start a new section. Leave a blank line between slides.
        </div>
        <textarea
          data-tour="song-editor-lyrics"
          value={lyricsText}
          onChange={(changeEvent) => onLyricsTextChange(changeEvent.target.value)}
          rows={12}
          placeholder={"Verse 1\nAmazing grace, how sweet the sound\nThat saved a wretch like me\n\nChorus\n..."}
          className="w-full p-2.5 rounded-2 border border-border bg-panel2 text-text text-[13px] leading-normal resize-y outline-none font-[inherit]"
        />
      </div>

      {error && <div className="text-[12px] text-danger">{error}</div>}
    </>
  );
}
