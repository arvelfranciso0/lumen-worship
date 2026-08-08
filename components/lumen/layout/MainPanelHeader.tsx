"use client";

import { useEffect } from "react";
import { InteractiveButton } from "../ui/Interactive";
import { transposeKey } from "../song/transpose";
import type { UseLumen } from "../useLumen";

// Loaded-item header: title/subtitle, key transpose, slide counter, edit-lyrics shortcut.
export function MainPanelHeader({ lumen }: { lumen: UseLumen }) {
  const {
    state, patch, bible, song, idx, ref, vlabel, currentTransMeta, shortTransLabel,
    atStartOverflow, atEndOverflow, slideCount,
  } = lumen;

  // Resets the session-only key transpose whenever the live song changes.
  useEffect(() => { patch({ transposeSemitones: 0 }); }, [song.id, patch]);

  // True when on an actual slide, not a blank boundary position.
  const onDeck = !atStartOverflow && !atEndOverflow;
  const loadedEyebrow = bible ? "Scripture" : "Now loaded";
  const loadedTitle = bible ? ref : song.title;
  const loadedSubtitle = bible
    ? shortTransLabel(state.trans) + " · " + (currentTransMeta?.license || "Not downloaded")
    : song.artist;
  const slideCounter = slideCount && onDeck ? idx + 1 + " / " + slideCount : "—";

  return (
    <div className="flex-none flex items-end flex-wrap gap-4 p-[16px_16px_12px_16px] border-b border-border">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">{loadedEyebrow}</div>
          {!bible && state.songOverrides[song.id] && (
            <span className="text-[9.5px] font-bold tracking-[.04em] uppercase text-accent bg-accent-soft rounded-1.25 px-1.5 py-0.5">
              Editing service copy
            </span>
          )}
        </div>
        <h1 className="m-0 mt-1.5 text-[clamp(19px,3vw,25px)] font-semibold tracking-tight">{loadedTitle}</h1>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5 text-[13px] text-muted">
          <span className="truncate">{loadedSubtitle}</span>
          <span className="text-faint">·</span>
          {bible ? (
            <span className="font-mono">{onDeck ? "v" + vlabel(idx) : "—"}</span>
          ) : (
            <>
              <span className="font-mono inline-flex items-center gap-1">
                Key {transposeKey(song.key, state.transposeSemitones)}
                <button
                  onClick={() => patch((previousState) => ({ transposeSemitones: previousState.transposeSemitones - 1 }))}
                  title="Transpose down a semitone"
                  className="w-4 h-4 rounded-1 border border-border bg-panel2 text-muted text-[10px] cursor-pointer p-0 flex items-center justify-center hover:text-text"
                >
                  −
                </button>
                <button
                  onClick={() => patch((previousState) => ({ transposeSemitones: previousState.transposeSemitones + 1 }))}
                  title="Transpose up a semitone"
                  className="w-4 h-4 rounded-1 border border-border bg-panel2 text-muted text-[10px] cursor-pointer p-0 flex items-center justify-center hover:text-text"
                >
                  +
                </button>
              </span>
              <span className="font-mono">· {song.bpm}</span>
              {song.ccli && (
                <>
                  <span className="text-faint">·</span>
                  <span className="font-mono text-[11px] text-faint">CCLI #{song.ccli}</span>
                </>
              )}
            </>
          )}
          <span className="text-faint">·</span>
          <span className="font-mono">{slideCounter}</span>
        </div>
      </div>
      {!bible && (
        <InteractiveButton
          onClick={() => patch({ songEditorOpen: true, songEditorMode: "edit" })}
          className="h-8 px-3 rounded-2 border border-border bg-panel text-[12.5px] text-muted cursor-pointer hover:bg-raise hover:text-text"
        >
          Edit lyrics
        </InteractiveButton>
      )}
    </div>
  );
}
