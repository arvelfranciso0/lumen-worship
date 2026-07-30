"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "./cx";
import { DEFAULT_LYRIC_STYLE, LYRIC_FONT_GROUPS, LYRIC_FONTS, lyricStyleCss } from "./data";
import { HighlightedLine } from "./HighlightedLine";
import { InteractiveButton } from "./Interactive";
import { LookBackground } from "./LookBackground";
import { ResizeHandle } from "./ResizeHandle";
import type { UseLumen } from "./useLumen";

const TEXT_COLOR_DEBOUNCE_MS = 250;
const DEFAULT_HIGHLIGHT_COLOR = "#fde047";

type LiveSelection = { startLineIndex: number; startOffset: number; endLineIndex: number; endOffset: number };

// Walks up from `node` to find the nearest ancestor line <div> (tagged with
// data-line-index), stopping at `container` so a selection outside the
// Live output box is never mistaken for one inside it.
function findLineElement(node: Node | null, container: HTMLElement): HTMLElement | null {
  let current: Node | null = node;
  while (current && current !== container) {
    if (current instanceof HTMLElement && current.dataset.lineIndex !== undefined) return current;
    current = current.parentNode;
  }
  return null;
}

// Measures how many characters into `lineElement`'s flattened text content
// (node, offset) falls at — works across however many <span> segments
// HighlightedLine rendered, not just within one text node.
function measureTextOffset(lineElement: HTMLElement, node: Node, offset: number): number {
  const measuringRange = document.createRange();
  measuringRange.selectNodeContents(lineElement);
  measuringRange.setEnd(node, offset);
  return measuringRange.toString().length;
}

export function MainPanel({ lumen }: { lumen: UseLumen }) {
  const {
    state, patch, bible, song, cur, nxt, prv, idx, slides, hidden, look, canvas, pill, bigLine, lyricFamily,
    vnum, ref, inSet, toggleSetSong, currentTransMeta, shortTransLabel, adjustLayoutSize,
    applyLiveHighlight, removeLiveHighlight,
  } = lumen;

  // Lets the operator highlight text by selecting it directly on the Live
  // output box (with the mouse/cursor), instead of through a separate
  // editor — works the same way for song lyrics and Bible verses, since
  // both render through this one box.
  const liveOutputRef = useRef<HTMLDivElement>(null);
  const [liveSelection, setLiveSelection] = useState<LiveSelection | null>(null);
  const [highlightColor, setHighlightColor] = useState(DEFAULT_HIGHLIGHT_COLOR);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const container = liveOutputRef.current;
      if (!selection || !container || selection.isCollapsed || selection.rangeCount === 0) {
        setLiveSelection(null);
        return;
      }
      // Use the Range's start/end (always in document order), not
      // anchor/focus (which flip depending on which direction the user
      // dragged) — that way a bottom-to-top drag still resolves the same.
      const range = selection.getRangeAt(0);
      if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
        setLiveSelection(null);
        return;
      }
      const startLine = findLineElement(range.startContainer, container);
      const endLine = findLineElement(range.endContainer, container);
      if (!startLine || !endLine) {
        setLiveSelection(null);
        return;
      }
      const startOffset = measureTextOffset(startLine, range.startContainer, range.startOffset);
      const endOffset = measureTextOffset(endLine, range.endContainer, range.endOffset);
      const startLineIndex = Number(startLine.dataset.lineIndex);
      const endLineIndex = Number(endLine.dataset.lineIndex);
      if (startLineIndex === endLineIndex && startOffset === endOffset) { setLiveSelection(null); return; }
      setLiveSelection({ startLineIndex, startOffset, endLineIndex, endOffset });
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  // Old selection offsets don't mean anything once the live slide changes.
  useEffect(() => setLiveSelection(null), [idx]);

  // The native color input fires onChange continuously while dragging —
  // this keeps the swatch responsive instantly while debouncing the actual
  // state patch (and therefore the persistence + slide re-render) so
  // dragging across the picker doesn't spam updates.
  const [textColorDraft, setTextColorDraft] = useState(state.lyricStyle.color || "#ffffff");
  const textColorDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => setTextColorDraft(state.lyricStyle.color || "#ffffff"), [state.lyricStyle.color]);
  useEffect(() => () => {
    if (textColorDebounceRef.current) clearTimeout(textColorDebounceRef.current);
  }, []);
  const onTextColorChange = (value: string) => {
    setTextColorDraft(value);
    if (textColorDebounceRef.current) clearTimeout(textColorDebounceRef.current);
    textColorDebounceRef.current = setTimeout(() => {
      patch((previousState) => ({ lyricStyle: { ...previousState.lyricStyle, color: value } }));
    }, TEXT_COLOR_DEBOUNCE_MS);
  };

  const loadedLabel = bible ? "Scripture" : "Now loaded";
  const editLabel = bible ? "Edit passage" : "Edit lyrics";
  const setLabel = inSet ? "In set ✓" : "Add to set";
  const curTitle = bible ? ref : song.title;
  const curArtist = bible
    ? shortTransLabel(state.trans) + " · " + (currentTransMeta?.license || "Not downloaded")
    : song.artist;
  const curMetaA = bible ? "v" + vnum(idx) : "Key " + song.key;
  const curBpm = bible ? lumen.passage.length + " verses" : song.bpm;
  const slideCounter = idx + 1 + " / " + slides.length;
  const liveState = state.black ? "BLACK" : state.blank ? "BLANK" : "LYRICS";

  const hasCaption = !!cur.caption && !hidden;
  const previewVisible = state.layoutVisibility.preview;

  return (
    <>
      <div className="flex-none flex items-end gap-4 p-[18px_22px_14px] border-b border-border">
        <div className="min-w-0">
          <div className="flex items-center gap-2.25">
            <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-accent">{loadedLabel}</div>
            <div className="h-px w-5.5 bg-border2" />
            <div className="text-[11px] text-faint font-mono">{slideCounter}</div>
          </div>
          <h1 className="m-0 mt-1.5 text-[26px] font-semibold tracking-tight leading-[1.15]">{curTitle}</h1>
          <div className="flex items-center gap-2.5 mt-1.5 text-[13px] text-muted">
            <span>{curArtist}</span>
            <span className="text-faint">·</span>
            <span className="font-mono">{curMetaA}</span>
            <span className="text-faint">·</span>
            <span className="font-mono">{curBpm}</span>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 pb-1">
          <InteractiveButton
            onClick={bible ? undefined : () => patch({ lyricsEditorOpen: true })}
            disabled={bible}
            className={cx(
              "h-8 px-3 rounded-2 border border-border bg-panel text-[12.5px] text-muted disabled:cursor-not-allowed disabled:opacity-50",
              !bible && "cursor-pointer hover:bg-raise hover:text-text"
            )}
          >
            {editLabel}
          </InteractiveButton>
          <InteractiveButton
            onClick={bible ? undefined : () => toggleSetSong(song.id)}
            disabled={bible}
            className={cx(
              "h-8 px-3 rounded-2 text-[12.5px] border disabled:cursor-not-allowed disabled:opacity-50",
              inSet ? "border-accent bg-accent-soft text-accent font-semibold" : "border-border bg-panel text-muted font-normal",
              !bible && "cursor-pointer",
              !bible && !inSet && "hover:bg-raise hover:text-text"
            )}
          >
            {setLabel}
          </InteractiveButton>
        </div>
      </div>

      <div className="flex-none flex items-center gap-2 p-[10px_22px] border-b border-border">
        <span className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint mr-1">Text style</span>
        <select
          value={state.font}
          onChange={(changeEvent) => patch({ font: changeEvent.target.value as typeof state.font })}
          className="h-7.5 px-2.5 rounded-2 border border-border bg-panel2 text-text text-[12px] cursor-pointer outline-none"
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
        <div className="w-px h-6 bg-border mx-1" />
        <button
          title="Bold"
          onClick={() => patch((previousState) => ({ lyricStyle: { ...previousState.lyricStyle, bold: !previousState.lyricStyle.bold } }))}
          className={cx(
            "w-7.5 h-7.5 rounded-2 border text-[12px] font-bold cursor-pointer",
            state.lyricStyle.bold ? "border-accent bg-accent-soft text-accent" : "border-border bg-panel2 text-muted"
          )}
        >
          B
        </button>
        <button
          title="Italic"
          onClick={() => patch((previousState) => ({ lyricStyle: { ...previousState.lyricStyle, italic: !previousState.lyricStyle.italic } }))}
          className={cx(
            "w-7.5 h-7.5 rounded-2 border text-[12px] italic cursor-pointer",
            state.lyricStyle.italic ? "border-accent bg-accent-soft text-accent" : "border-border bg-panel2 text-muted"
          )}
        >
          I
        </button>
        <div className="w-px h-6 bg-border mx-1" />
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
          title="Outline"
          onClick={() => patch((previousState) => ({ lyricStyle: { ...previousState.lyricStyle, outline: !previousState.lyricStyle.outline } }))}
          className={cx(
            "w-7.5 h-7.5 rounded-2 border text-[12px] cursor-pointer",
            state.lyricStyle.outline ? "border-accent bg-accent-soft text-accent" : "border-border bg-panel2 text-muted"
          )}
        >
          ◇
        </button>
        <div className="w-px h-6 bg-border mx-1" />
        <span className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">Highlight</span>
        <label
          title="Highlight color"
          className="relative flex-none w-7.5 h-7.5 rounded-2 border border-border cursor-pointer overflow-hidden"
          style={{ background: highlightColor }}
        >
          <input
            type="color"
            value={highlightColor}
            onChange={(changeEvent) => setHighlightColor(changeEvent.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </label>
        <InteractiveButton
          onClick={() => { if (liveSelection) applyLiveHighlight(liveSelection, highlightColor); }}
          disabled={!liveSelection}
          className="h-7.5 px-3 rounded-2 border border-border bg-panel2 text-[12px] text-muted disabled:cursor-not-allowed disabled:opacity-50 not-disabled:cursor-pointer not-disabled:hover:bg-raise not-disabled:hover:text-text"
        >
          Apply
        </InteractiveButton>
        <InteractiveButton
          onClick={() => { if (liveSelection) removeLiveHighlight(liveSelection); }}
          disabled={!liveSelection}
          className="h-7.5 px-3 rounded-2 border border-border bg-panel2 text-[12px] text-muted disabled:cursor-not-allowed disabled:opacity-50 not-disabled:cursor-pointer not-disabled:hover:bg-raise not-disabled:hover:text-text"
        >
          Remove
        </InteractiveButton>
        <span className="text-[11.5px] text-faint">
          {liveSelection ? "Selection ready" : "Select text below to highlight it"}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => patch({ lyricStyle: DEFAULT_LYRIC_STYLE })}
          className="text-[12px] text-muted border-none bg-transparent cursor-pointer px-1 py-0.5 hover:text-text"
        >
          Reset
        </button>
      </div>

      <div className="flex-1 flex gap-4.5 p-[18px_22px] min-h-0 overflow-y-auto">
        <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-80">
          <div className="flex-none flex items-center gap-2.5">
            <span className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">Live output</span>
            <span className={pill(true)}>{cur.label}</span>
            <div className="flex-1" />
            <span className="font-mono text-[11px] text-faint">{liveState}</span>
          </div>
          <div className="relative flex-none w-full aspect-video min-h-60 rounded-2xl overflow-hidden border border-border2 bg-black shadow-app">
            <LookBackground look={look} black={state.black} />
            <div ref={liveOutputRef} className={cx(canvas, "gap-2.5 transition-opacity duration-180 ease-in-out", hidden ? "opacity-0" : "opacity-100")}>
              {cur.lines.map((line, lineIndex) => (
                <div key={lineIndex} data-line-index={lineIndex} className={lyricFamily} style={bigLine}>
                  <HighlightedLine line={line} highlights={cur.lineHighlights?.[lineIndex]} />
                </div>
              ))}
              {hasCaption && (
                <div className="font-mono tracking-[.08em] mt-2.5 text-[rgba(255,255,255,.62)]" style={{ fontSize: 11 * state.scale + "px" }}>
                  {cur.caption}
                </div>
              )}
            </div>
            <div className="absolute top-3 left-3.5 flex items-center gap-1.75 p-[5px_10px] rounded-5 bg-[rgba(0,0,0,.45)] backdrop-blur">
              <span className="w-1.5 h-1.5 rounded-full bg-danger" />
              <span className="font-mono text-[10px] text-white tracking-[.06em]">LIVE</span>
            </div>
          </div>
        </div>

        {previewVisible && (
          <>
            <ResizeHandle
              axis="horizontal"
              onResizeDelta={(deltaPixels) => adjustLayoutSize("previewWidth", -deltaPixels)}
            />
            <div className="flex-none flex flex-col gap-3.5" style={{ width: state.layoutSizes.previewWidth }}>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">Previous</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="relative w-full aspect-video rounded-[10px] overflow-hidden border border-border bg-panel2 opacity-60">
                  <div className={cx(canvas, "gap-1")}>
                    {(prv ? prv.lines : ["— start of song —"]).map((line, lineIndex) => (
                      <div
                        key={lineIndex}
                        className={cx(lyricFamily, "text-[11px] leading-[1.4] text-muted font-medium")}
                        style={lyricStyleCss(state.lyricStyle)}
                      >
                        <HighlightedLine line={line} highlights={prv?.lineHighlights?.[lineIndex]} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center text-faint text-[14px]">↓</div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold tracking-[.06em] uppercase text-accent">Next up</span>
                  <div className="flex-1 h-px bg-border" />
                  <span className={pill(false)}>{nxt ? nxt.label : "End"}</span>
                </div>
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-accent bg-black shadow-[0_0_0_3px_var(--accent-soft)]">
                  <LookBackground look={look} black={state.black} preview />
                  <div className={cx(canvas, "gap-1.25")}>
                    {(nxt ? nxt.lines : ["— end of song —"]).map((line, lineIndex) => (
                      <div
                        key={lineIndex}
                        className={cx(lyricFamily, "text-[13px] leading-[1.4] font-semibold text-white")}
                        style={lyricStyleCss(state.lyricStyle)}
                      >
                        <HighlightedLine line={line} highlights={nxt?.lineHighlights?.[lineIndex]} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-auto border border-border rounded-xl bg-panel p-[12px_13px] flex flex-col gap-2.25">
                <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">Shortcuts</div>
                <div className="flex flex-col gap-1.75 text-[12px] text-muted">
                  <div className="flex items-center justify-between"><span>Next / Previous slide</span><span className="font-mono text-[10.5px] text-text">← →</span></div>
                  <div className="flex items-center justify-between"><span>Black screen</span><span className="font-mono text-[10.5px] text-text">B</span></div>
                  <div className="flex items-center justify-between"><span>Blank (background only)</span><span className="font-mono text-[10.5px] text-text">W</span></div>
                  <div className="flex items-center justify-between"><span>Present / exit</span><span className="font-mono text-[10.5px] text-text">F5 · Esc</span></div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
