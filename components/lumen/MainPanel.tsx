"use client";

import { cx } from "./cx";
import { InteractiveButton } from "./Interactive";
import { ResizeHandle } from "./ResizeHandle";
import type { UseLumen } from "./useLumen";

export function MainPanel({ lumen }: { lumen: UseLumen }) {
  const {
    state, patch, bible, song, cur, nxt, prv, idx, slides, hidden, look, canvas, pill, bigLine, lyricFamily,
    vnum, ref, inSet, toggleSetSong, currentTransMeta, shortTransLabel, adjustLayoutSize,
  } = lumen;

  const loadedLabel = bible ? "Scripture" : "Now loaded";
  const editLabel = bible ? "Edit passage" : "Edit lyrics";
  const setLabel = inSet ? "In set ✓" : "Add to set";
  const curTitle = bible ? ref : song.title;
  const curArtist = bible
    ? shortTransLabel(state.trans) + " · " + (currentTransMeta?.license || "Loading…")
    : song.artist;
  const curMetaA = bible ? "v" + vnum(idx) : "Key " + song.key;
  const curBpm = bible ? lumen.passage.length + " verses" : song.bpm;
  const slideCounter = idx + 1 + " / " + slides.length;
  const liveState = state.black ? "BLACK" : state.blank ? "BLANK" : "LYRICS";

  const bgStyle = { background: state.black ? "#000" : look.css };

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

      <div className="flex-1 flex gap-4.5 p-[18px_22px] min-h-0 overflow-y-auto">
        <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-80">
          <div className="flex-none flex items-center gap-2.5">
            <span className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">Live output</span>
            <span className={pill(true)}>{cur.label}</span>
            <div className="flex-1" />
            <span className="font-mono text-[11px] text-faint">{liveState}</span>
          </div>
          <div className="relative flex-none w-full aspect-video min-h-60 rounded-2xl overflow-hidden border border-border2 bg-black shadow-app">
            <div className="absolute inset-0" style={bgStyle} />
            <div className={cx(canvas, "gap-2.5 transition-opacity duration-180 ease-in-out", hidden ? "opacity-0" : "opacity-100")}>
              {cur.lines.map((line, lineIndex) => (
                <div key={lineIndex} className={lyricFamily} style={bigLine}>{line}</div>
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
                      <div key={lineIndex} className={cx(lyricFamily, "text-[11px] leading-[1.4] text-muted font-medium")}>{line}</div>
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
                  <div className="absolute inset-0" style={bgStyle} />
                  <div className={cx(canvas, "gap-1.25")}>
                    {(nxt ? nxt.lines : ["— end of song —"]).map((line, lineIndex) => (
                      <div key={lineIndex} className={cx(lyricFamily, "text-[13px] leading-[1.4] font-semibold text-white")}>{line}</div>
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
