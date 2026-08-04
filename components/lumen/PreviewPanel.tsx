"use client";

import { useEffect, useRef } from "react";
import { cx } from "./cx";
import { CountdownControl } from "./CountdownControl";
import { lyricStyleCss } from "./data";
import { HighlightedLine } from "./HighlightedLine";
import { InteractiveButton } from "./Interactive";
import { LookBackground } from "./LookBackground";
import { SlideCaption } from "./SlideCaption";
import type { UseLumen } from "./useLumen";
import { useSlideTransition } from "./useSlideTransition";
import type { Breakpoint } from "./useViewportBreakpoint";

// The reference caption is sized as a fraction of its own box's lyric size, so
// it tracks the operator's lyric-size setting. The small preview boxes need a
// *larger* fraction than the Live output box: the 0.42 that reads well against
// 26px live text would render the previews' 10px text at ~4px, i.e. illegible.
const LIVE_CAPTION_RATIO = 0.42;
const PREVIEW_CAPTION_RATIO = 0.75;

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

// The operator screen's right-hand column: everything about what is on the
// audience screen *right now* and how to move it. Split out of MainPanel,
// which now owns the authoring half (song info, text style, slides,
// backgrounds) — that division is the core of the handoff redesign.
export function PreviewPanel({ lumen, breakpoint }: { lumen: UseLumen; breakpoint: Breakpoint }) {
  const {
    state, patch, go, cur, nxt, prv, idx, hidden, look, allLooks, canvas, bigLine, lyricFamily,
    outputAspectRatio, outputStatus, liveCompare, boundaryPrevLabel, boundaryNextLabel, startPresenting,
    canGoNext, canGoPrev, atEndOverflow, atStartOverflow, slideCount,
  } = lumen;

  const isMobile = breakpoint === "mobile";
  // Tablet pins the column so the main content keeps a usable width; only
  // desktop lets the operator drag it.
  const panelWidth = isMobile ? undefined : breakpoint === "tablet" ? 320 : state.layoutSizes.previewWidth;

  // Per-slide background override (song mode, set from the Backgrounds panel)
  // — falls back to the global look whenever a slide doesn't have its own.
  const curLook = (cur.lookId && allLooks.find((l) => l.id === cur.lookId)) || look;
  const nxtLook = (nxt?.lookId && allLooks.find((l) => l.id === nxt.lookId)) || look;
  const prvLook = (prv?.lookId && allLooks.find((l) => l.id === prv.lookId)) || look;
  const slideTransitionStyle = useSlideTransition(state.transitionType, state.transitionSpeedPct, state.performanceMode);

  // Lets the operator highlight text by selecting it directly on the Live
  // output box (with the mouse/cursor), instead of through a separate
  // editor — works the same way for song lyrics and Bible verses, since
  // both render through this one box. The captured selection goes into
  // shared state because the Apply/Clear controls live in MainPanel.
  const liveOutputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const container = liveOutputRef.current;
      if (!selection || !container || selection.isCollapsed || selection.rangeCount === 0) {
        patch({ liveSelection: null });
        return;
      }
      // Use the Range's start/end (always in document order), not
      // anchor/focus (which flip depending on which direction the user
      // dragged) — that way a bottom-to-top drag still resolves the same.
      const range = selection.getRangeAt(0);
      if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
        patch({ liveSelection: null });
        return;
      }
      const startLine = findLineElement(range.startContainer, container);
      const endLine = findLineElement(range.endContainer, container);
      if (!startLine || !endLine) {
        patch({ liveSelection: null });
        return;
      }
      const startOffset = measureTextOffset(startLine, range.startContainer, range.startOffset);
      const endOffset = measureTextOffset(endLine, range.endContainer, range.endOffset);
      const startLineIndex = Number(startLine.dataset.lineIndex);
      const endLineIndex = Number(endLine.dataset.lineIndex);
      if (startLineIndex === endLineIndex && startOffset === endOffset) { patch({ liveSelection: null }); return; }
      patch({ liveSelection: { startLineIndex, startOffset, endLineIndex, endOffset } });
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [patch]);

  // Old selection offsets don't mean anything once the live slide changes.
  useEffect(() => { patch({ liveSelection: null }); }, [idx, patch]);

  // Compare mode carries its own reference caption (both translation codes);
  // otherwise the slide's own caption is used. Pinned to the bottom of the box
  // either way, so showing it never shifts the verse off centre.
  //
  // Suppressed when the slide has no actual text: a translation that isn't
  // downloaded yields a single blank line by design (NOT_DOWNLOADED_PASSAGE —
  // deliberately message-free so nothing explanatory reaches the audience), and
  // a bare "REV 22:1 KJV" floating over an empty screen is worse than nothing.
  const stageLines = liveCompare ? liveCompare.lines : cur.lines;
  const stageHasText = stageLines.some((line) => line.trim().length > 0);
  const stageCaption = hidden || !stageHasText ? "" : liveCompare ? liveCompare.caption : cur.caption;
  // Clamped into the deck: on the blank overflow positions `idx` sits one step
  // outside it, and "22 of 21" would be nonsense.
  const position = Math.min(Math.max(idx + 1, 1), Math.max(slideCount, 1));
  const progressPct = slideCount ? Math.round((position / slideCount) * 100) : 0;
  const progressLabel = slideCount ? position + " of " + slideCount : "";
  // "End" only once the operator has actually stepped onto the blank position
  // past the last slide — not while the final verse is still on screen. At that
  // point the box below is empty and Next is disabled, which together are the
  // signal that there is nothing further.
  const nextUpLabel = atEndOverflow ? "End" : "Next up";
  const prevLabel = atStartOverflow ? "Start" : "Previous";

  // The one real output the app drives (a second-monitor audience window).
  // Rendered as a list because the design shows one row per connected
  // display — see DisplaysModal.tsx for why N-simultaneous is deferred.
  const connectedOutputs = outputStatus.active && outputStatus.display
    ? [{
      id: outputStatus.display.id,
      name: outputStatus.display.label,
      liveState: state.black ? "BLACK" : state.blank ? "BLANK" : "LIVE",
      chords: state.chords,
    }]
    : [];

  return (
    <div
      className={cx(
        "flex flex-col gap-3.5 bg-panel2 overflow-hidden self-stretch box-border p-3.5",
        isMobile ? "flex-1 min-w-0" : "flex-none",
        // Desktop gets its divider from the resize handle beside it; only tablet
        // (which has no handle) needs a border of its own here.
        breakpoint === "tablet" && "border-l border-border"
      )}
      style={panelWidth === undefined ? undefined : { width: panelWidth }}
    >
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3.5">
        {/* LIVE OUTPUT */}
        <div className="flex flex-col gap-2.5 flex-none">
          <div className="flex items-center gap-2.5 flex-none">
            <span className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">Live output</span>
            <span className="text-[12.5px] text-muted truncate">{cur.label}</span>
            <div className="flex-1" />
            <CountdownControl />
          </div>
          <div
            className="relative w-full rounded-2xl overflow-hidden border border-border2 bg-black shadow-app flex-none"
            style={{ aspectRatio: outputAspectRatio }}
          >
            {/* preview when a different live decode is already showing this same
                background elsewhere (PresentationOverlay or the second-monitor
                OutputWindowApp) — avoids two simultaneous full video decodes of
                the same source, real CPU cost on low-end hardware. Has no visual
                effect for image/gradient looks, which render identically either
                way. */}
            <LookBackground look={curLook} black={state.black} preview={state.presenting || outputStatus.active} />
            <div ref={liveOutputRef} className={cx(canvas, "gap-2 transition-opacity duration-180 ease-in-out", hidden ? "opacity-0" : "opacity-100")}>
              <div key={idx} style={slideTransitionStyle} className="flex flex-col items-center gap-2 w-full">
                {liveCompare
                  ? liveCompare.lines.map((line, compareIndex) => (
                    <div key={compareIndex} className={lyricFamily} style={bigLine}>
                      <span className="text-[0.55em] align-super mr-[0.25em]">{liveCompare.verseNumber}</span>
                      {line}
                    </div>
                  ))
                  : cur.lines.map((line, lineIndex) => (
                    <div key={lineIndex} data-line-index={lineIndex} className={lyricFamily} style={bigLine}>
                      <HighlightedLine line={line} highlights={cur.lineHighlights?.[lineIndex]} />
                    </div>
                  ))}
              </div>
            </div>
            <SlideCaption
              caption={stageCaption}
              lyricStyle={state.lyricStyle}
              fontClassName={lyricFamily}
              baseFontSize={String(bigLine.fontSize)}
              ratio={LIVE_CAPTION_RATIO}
              bottom="14px"
            />
            <div className="absolute top-2 left-2 flex items-center gap-1.5 p-[4px_8px] rounded-5 bg-[rgba(0,0,0,.45)] backdrop-blur">
              <span className="w-1.5 h-1.5 rounded-full bg-danger" />
              <span className="font-mono text-[9.5px] text-white tracking-[.06em]">LIVE</span>
            </div>
          </div>
        </div>

        {/* PREVIOUS / NEXT UP */}
        <div className={cx("flex gap-2.5 flex-none min-w-0", isMobile ? "flex-col" : "flex-row")} data-tour="preview">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="text-[10px] font-semibold tracking-[.06em] uppercase text-faint flex-none">{prevLabel}</div>
              {!prv && boundaryPrevLabel && (
                <span className="text-[8.5px] font-bold tracking-wider uppercase text-faint border border-border rounded-full px-1.25 py-px min-w-0 truncate">
                  {boundaryPrevLabel}
                </span>
              )}
            </div>
            <div
              className="relative w-full rounded-2 overflow-hidden opacity-60 mt-1.5 flex items-center justify-center flex-none"
              style={{ aspectRatio: outputAspectRatio }}
            >
              <LookBackground look={prvLook} preview />
              {prv && (
                <div className="absolute top-1.25 left-1.5 text-[8px] font-bold tracking-[.06em] uppercase text-white/85 bg-[rgba(0,0,0,.5)] px-1.25 py-px rounded-1 z-2 max-w-[60%] truncate">
                  {prv.label}
                </div>
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-[8%] text-center overflow-hidden">
                {(prv ? prv.lines : ["—"]).map((line, lineIndex) => (
                  <div
                    key={lineIndex}
                    className={cx(lyricFamily, "text-[10px] leading-[1.28] font-semibold text-muted line-clamp-2")}
                    style={lyricStyleCss(state.lyricStyle)}
                  >
                    <HighlightedLine line={line} highlights={prv?.lineHighlights?.[lineIndex]} />
                  </div>
                ))}
              </div>
              <SlideCaption
                caption={prv?.caption ?? ""}
                lyricStyle={state.lyricStyle}
                fontClassName={lyricFamily}
                baseFontSize="10px"
                ratio={PREVIEW_CAPTION_RATIO}
                bottom="4px"
              />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="text-[10px] font-semibold tracking-[.06em] uppercase text-accent flex-none">{nextUpLabel}</div>
              {!nxt && boundaryNextLabel && (
                <span className="text-[8.5px] font-bold tracking-wider uppercase text-warn border border-warn rounded-full px-1.25 py-px min-w-0 truncate">
                  {boundaryNextLabel}
                </span>
              )}
            </div>
            <div
              className="relative w-full rounded-2.5 overflow-hidden mt-1.5 flex items-center justify-center border-2 border-accent box-border flex-none"
              style={{ aspectRatio: outputAspectRatio }}
            >
              <LookBackground look={nxtLook} black={state.black} preview />
              {nxt && (
                <div className="absolute top-1.25 left-1.5 text-[8px] font-bold tracking-[.06em] uppercase text-white/90 bg-[rgba(0,0,0,.5)] px-1.25 py-px rounded-1 z-2 max-w-[60%] truncate">
                  {nxt.label}
                </div>
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-[8%] text-center overflow-hidden">
                {(nxt ? nxt.lines : ["—"]).map((line, lineIndex) => (
                  <div
                    key={lineIndex}
                    className={cx(lyricFamily, "text-[11px] leading-[1.28] font-semibold text-white line-clamp-2")}
                    style={lyricStyleCss(state.lyricStyle)}
                  >
                    <HighlightedLine line={line} highlights={nxt?.lineHighlights?.[lineIndex]} />
                  </div>
                ))}
              </div>
              <SlideCaption
                caption={nxt?.caption ?? ""}
                lyricStyle={state.lyricStyle}
                fontClassName={lyricFamily}
                baseFontSize="11px"
                ratio={PREVIEW_CAPTION_RATIO}
                bottom="4px"
              />
            </div>
          </div>
        </div>

        {/* PROGRESS */}
        <div className="flex items-center gap-2 flex-none">
          <div className="flex-1 h-0.75 rounded-0.5 bg-border overflow-hidden">
            <div className="h-full bg-accent rounded-0.5" style={{ width: progressPct + "%" }} />
          </div>
          <span className="font-mono text-[10.5px] text-faint whitespace-nowrap">{progressLabel}</span>
        </div>

        {/* TRANSPORT */}
        {/* Disabled exactly where go() refuses to move (canGoNext/canGoPrev are
            derived from the same nxt/prv the previews use), so the end of a
            song, set or the Bible reads as an end instead of a live button that
            silently does nothing. */}
        <div className="flex gap-2.5 justify-between flex-none mt-3.5" data-tour="navbuttons">
          <InteractiveButton
            onClick={() => go(-1)}
            disabled={!canGoPrev}
            className={cx(
              "flex-1 h-9.5 rounded-2.25 text-[13px] font-medium flex items-center justify-center gap-2.5 border",
              canGoPrev
                ? "border-border2 bg-raise text-muted cursor-pointer hover:text-text hover:brightness-105"
                : "border-border bg-panel2 text-faint opacity-45 cursor-not-allowed"
            )}
          >
            ← Previous
            <span className="font-mono text-[10px] opacity-70">←</span>
          </InteractiveButton>
          <InteractiveButton
            onClick={() => go(1)}
            disabled={!canGoNext}
            className={cx(
              "flex-1 h-9.5 rounded-2.25 text-[13px] font-semibold flex items-center justify-center gap-2.5 border",
              canGoNext
                ? "border-transparent bg-accent text-white shadow-app-sm cursor-pointer hover:brightness-110"
                : "border-border bg-panel2 text-faint opacity-45 cursor-not-allowed"
            )}
          >
            Next →
            <span className="font-mono text-[10px] opacity-70">Space</span>
          </InteractiveButton>
        </div>

        <div className="flex gap-2 flex-none mt-3 pt-3 border-t border-border" data-tour="transport">
          <button
            onClick={() => patch((s) => ({ blank: !s.blank, black: false }))}
            className={cx(
              "flex-1 h-7.5 rounded-2 cursor-pointer text-[11.5px] font-medium flex items-center justify-center gap-1.5 border",
              state.blank ? "border-transparent bg-accent text-white hover:brightness-110" : "border-border bg-panel2 text-muted hover:bg-raise hover:text-text"
            )}
          >
            <span className="text-[12px]">▢</span>Blank
          </button>
          <button
            onClick={() => patch((s) => ({ black: !s.black, blank: false }))}
            className={cx(
              "flex-1 h-7.5 rounded-2 cursor-pointer text-[11.5px] font-medium flex items-center justify-center gap-1.5 border",
              state.black ? "border-transparent bg-accent text-white hover:brightness-110" : "border-border bg-panel2 text-muted hover:bg-raise hover:text-text"
            )}
          >
            <span className="text-[12px]">■</span>Black
          </button>
          <button
            onClick={startPresenting}
            className="flex-1 h-7.5 rounded-2 cursor-pointer text-[11.5px] font-medium flex items-center justify-center gap-1.25 border border-border bg-panel2 text-muted hover:bg-raise hover:text-text"
          >
            <span className="text-[12px]">⛶</span>Fullscreen
            <span className="font-mono text-[9px] text-faint">F5</span>
          </button>
        </div>

        {/* CONNECTED OUTPUTS */}
        <div className="flex-none pt-2.5 mt-0.5 border-t border-border">
          <div className="text-[10.5px] font-semibold tracking-[.06em] uppercase text-faint mb-1.75">Connected outputs</div>
          {connectedOutputs.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {connectedOutputs.map((output) => (
                <div key={output.id} className="flex items-center gap-2 p-[7px_9px] rounded-2 border border-border bg-panel2">
                  <div className="w-11 flex-none rounded-1 overflow-hidden border border-border relative" style={{ aspectRatio: outputAspectRatio }}>
                    <LookBackground look={curLook} black={state.black} preview />
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-ok flex-none" />
                  <span className="text-[11.5px] text-text truncate flex-1 min-w-0">{output.name}</span>
                  {output.chords && <span title="Chords shown" className="text-accent text-[10px] flex-none">♪</span>}
                  <span className="font-mono text-[10.5px] text-muted whitespace-nowrap flex-none">{output.liveState}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11.5px] text-faint p-[7px_9px] rounded-2 border border-dashed border-border">No displays connected</div>
          )}
          <InteractiveButton
            onClick={() => patch({ displaysModalOpen: true })}
            className="mt-1.75 w-full h-6.5 rounded-1.75 border border-border bg-transparent text-accent text-[11px] cursor-pointer hover:bg-panel2"
          >
            Manage displays…
          </InteractiveButton>
        </div>

        {/* OPERATOR NOTES */}
        <div className="flex-none">
          <button
            onClick={() => patch((s) => ({ operatorNotesOpen: !s.operatorNotesOpen }))}
            className="flex items-center gap-1.25 w-full bg-transparent border-none p-[8px_0_4px] cursor-pointer text-faint text-[11px] hover:text-text"
          >
            <span className={cx("inline-block text-[13px] transition-transform duration-150", state.operatorNotesOpen && "rotate-90")}>▸</span>
            Operator notes
          </button>
          {state.operatorNotesOpen && (
            <textarea
              value={state.operatorNotes}
              onChange={(changeEvent) => patch({ operatorNotes: changeEvent.target.value })}
              placeholder="Service reminders, cues, announcements…"
              className="w-full h-20 rounded-2 border border-border bg-panel2 text-text text-[12px] p-2 resize-y box-border outline-none"
            />
          )}
        </div>
      </div>
    </div>
  );
}
