"use client";

import { useEffect } from "react";
import { cx } from "./cx";
import { LYRIC_FONT_GROUPS, LYRIC_FONTS } from "./data";
import { InteractiveButton } from "./Interactive";
import { SlidesPanel } from "./SlidesPanel";
import { TransitionRow } from "./TransitionRow";
import { transposeKey } from "./transpose";
import { useDebouncedColor } from "./useDebouncedColor";
import type { UseLumen } from "./useLumen";

const DEFAULT_OUTLINE_COLOR = "#000000";
const OUTLINE_WIDTH_MIN = 0.5;
const OUTLINE_WIDTH_MAX = 8;
const OUTLINE_WIDTH_STEP = 0.5;
const OUTLINE_WIDTH_DEFAULT = 2;

// The authoring half of the operator screen: what is loaded, how its text is
// styled, how slides move, and which slides/backgrounds exist. Everything
// about what is *currently on the audience screen* lives in PreviewPanel.
export function MainPanel({ lumen }: { lumen: UseLumen }) {
  const {
    state, patch, bible, song, idx, ref,
    vlabel, currentTransMeta, shortTransLabel, applyLiveHighlight, removeLiveHighlight,
    atStartOverflow, atEndOverflow, slideCount,
  } = lumen;
  // On the blank positions bracketing the deck there is no current slide, so
  // neither a verse number nor an "n / total" counter means anything.
  const onDeck = !atStartOverflow && !atEndOverflow;

  const [textColorDraft, onTextColorChange] = useDebouncedColor(
    state.lyricStyle.color || "#ffffff",
    (value) => patch((previousState) => ({ lyricStyle: { ...previousState.lyricStyle, color: value } }))
  );
  const [outlineColorDraft, onOutlineColorChange] = useDebouncedColor(
    state.lyricStyle.outlineColor || DEFAULT_OUTLINE_COLOR,
    (value) => patch((previousState) => ({ lyricStyle: { ...previousState.lyricStyle, outlineColor: value } }))
  );

  // Key transpose is session-only — resets whenever the live song changes,
  // never persisted, never sent to the audience output. It's an operator aid
  // for reading the key off the header, not something the congregation sees.
  useEffect(() => { patch({ transposeSemitones: 0 }); }, [song.id, patch]);

  const outlineWidth = state.lyricStyle.outlineWidth || 0;
  const outlineOn = outlineWidth > 0;
  const setOutlineWidth = (width: number) =>
    patch((s) => ({ lyricStyle: { ...s.lyricStyle, outlineWidth: Math.min(OUTLINE_WIDTH_MAX, Math.max(0, width)) } }));

  const scalePct = Math.round(state.scale * 100);
  const setScalePct = (pct: number) =>
    patch({ scale: Math.min(1.5, Math.max(0.7, +(pct / 100).toFixed(2))) });

  const loadedEyebrow = bible ? "Scripture" : "Now loaded";
  const loadedTitle = bible ? ref : song.title;
  const loadedSubtitle = bible
    ? shortTransLabel(state.trans) + " · " + (currentTransMeta?.license || "Not downloaded")
    : song.artist;
  const slideCounter = slideCount && onDeck ? idx + 1 + " / " + slideCount : "—";
  const selection = state.liveSelection;

  return (
    <>
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
                    onClick={() => patch((s) => ({ transposeSemitones: s.transposeSemitones - 1 }))}
                    title="Transpose down a semitone"
                    className="w-4 h-4 rounded-1 border border-border bg-panel2 text-muted text-[10px] cursor-pointer p-0 flex items-center justify-center hover:text-text"
                  >
                    −
                  </button>
                  <button
                    onClick={() => patch((s) => ({ transposeSemitones: s.transposeSemitones + 1 }))}
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

      {/* text styling toolbar */}
      <div className="flex-none flex items-center gap-2 p-[10px_16px] border-b border-border bg-panel2 flex-wrap gap-y-2 relative z-20">
        <select
          value={state.font}
          onChange={(changeEvent) => patch({ font: changeEvent.target.value as typeof state.font })}
          className="h-7.5 px-2 rounded-2 border border-border bg-panel text-text text-[12px] cursor-pointer outline-none"
        >
          {LYRIC_FONT_GROUPS.map((group) => (
            <optgroup key={group} label={group}>
              {LYRIC_FONTS.filter((fontOption) => fontOption.group === group).map((fontOption) => (
                <option key={fontOption.id} value={fontOption.id} className={fontOption.className}>
                  {fontOption.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <div className="w-px h-5.5 bg-border" />
        <button
          title="Bold"
          onClick={() => patch((s) => ({ lyricStyle: { ...s.lyricStyle, bold: !s.lyricStyle.bold } }))}
          className={cx(
            "w-7.5 h-7.5 rounded-2 border text-text font-bold cursor-pointer",
            state.lyricStyle.bold ? "border-accent bg-accent-soft" : "border-border bg-panel"
          )}
        >
          B
        </button>
        <button
          title="Italic"
          onClick={() => patch((s) => ({ lyricStyle: { ...s.lyricStyle, italic: !s.lyricStyle.italic } }))}
          className={cx(
            "w-7.5 h-7.5 rounded-2 border text-text italic cursor-pointer",
            state.lyricStyle.italic ? "border-accent bg-accent-soft" : "border-border bg-panel"
          )}
        >
          I
        </button>
        <div className="w-px h-5.5 bg-border" />
        <label
          title="Text color"
          className="relative flex-none w-7.5 h-7.5 rounded-2 border border-border cursor-pointer overflow-hidden"
          style={{ background: textColorDraft }}
        >
          <input
            type="color"
            value={textColorDraft}
            onChange={(changeEvent) => onTextColorChange(changeEvent.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </label>
        <button
          onClick={() => setOutlineWidth(outlineOn ? 0 : OUTLINE_WIDTH_DEFAULT)}
          className={cx(
            "h-7.5 px-2.5 rounded-2 border text-text text-[12px] cursor-pointer",
            outlineOn ? "border-accent bg-accent-soft" : "border-border bg-panel"
          )}
        >
          Outline
        </button>
        <label
          title="Outline color"
          className="relative flex-none w-6 h-6 rounded-1.75 border border-border cursor-pointer overflow-hidden"
          style={{ background: outlineColorDraft }}
        >
          <input
            type="color"
            value={outlineColorDraft}
            onChange={(changeEvent) => onOutlineColorChange(changeEvent.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </label>
        {outlineOn && (
          <>
            <button
              onClick={() => setOutlineWidth(Math.max(OUTLINE_WIDTH_MIN, outlineWidth - OUTLINE_WIDTH_STEP))}
              className="w-5.5 h-6 rounded-1.5 border border-border bg-panel2 text-text text-[12px] cursor-pointer"
            >
              −
            </button>
            <span className="font-mono text-[10.5px] text-muted w-11 h-6 rounded-1.5 border border-border bg-panel2 flex items-center justify-center">
              {outlineWidth.toFixed(1)}px
            </span>
            <button
              onClick={() => setOutlineWidth(outlineWidth + OUTLINE_WIDTH_STEP)}
              className="w-5.5 h-6 rounded-1.5 border border-border bg-panel2 text-text text-[12px] cursor-pointer"
            >
              +
            </button>
          </>
        )}
        <div className="w-px h-5.5 bg-border" />
        <span className="text-[11px] text-faint">Highlight</span>
        <label
          title={selection ? "Highlight the selected text" : "Select text on the Live output box first"}
          className={cx(
            "relative flex-none w-7.5 h-7.5 rounded-2 border border-border overflow-hidden",
            selection ? "cursor-pointer" : "cursor-not-allowed opacity-50"
          )}
          style={{ background: state.highlightColor }}
        >
          <input
            type="color"
            value={state.highlightColor}
            disabled={!selection}
            onChange={(changeEvent) => {
              const color = changeEvent.target.value;
              patch({ highlightColor: color });
              if (selection) applyLiveHighlight(selection, color);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
        </label>
        <InteractiveButton
          onClick={() => { if (selection) applyLiveHighlight(selection, state.highlightColor); }}
          disabled={!selection}
          className="h-6.5 px-2 rounded-1.5 border border-border bg-panel text-muted text-[11px] disabled:cursor-not-allowed disabled:opacity-50 not-disabled:cursor-pointer not-disabled:hover:text-text"
        >
          Apply
        </InteractiveButton>
        <InteractiveButton
          onClick={() => { if (selection) removeLiveHighlight(selection); }}
          disabled={!selection}
          className="h-6.5 px-2 rounded-1.5 border border-border bg-panel text-muted text-[11px] disabled:cursor-not-allowed disabled:opacity-50 not-disabled:cursor-pointer not-disabled:hover:text-text"
        >
          Clear
        </InteractiveButton>
        <div className="w-px h-5.5 bg-border" />
        <button
          onClick={() => setScalePct(scalePct - 10)}
          title="Smaller lyrics"
          className="w-6 h-6 rounded-2 border border-border bg-panel2 text-text text-[12px] cursor-pointer"
        >
          A−
        </button>
        <span className="font-mono text-[11px] text-text w-13 h-6 rounded-2 border border-border bg-panel2 flex items-center justify-center">
          {scalePct}%
        </span>
        <button
          onClick={() => setScalePct(scalePct + 10)}
          title="Larger lyrics"
          className="w-6 h-6 rounded-2 border border-border bg-panel2 text-text text-[12px] cursor-pointer"
        >
          A+
        </button>
      </div>

      <TransitionRow lumen={lumen} />

      <SlidesPanel lumen={lumen} />
    </>
  );
}
