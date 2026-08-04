"use client";

import { useState } from "react";
import { BackgroundsPanel } from "./BackgroundsPanel";
import { cx } from "./cx";
import { lyricStyleCss } from "./data";
import { HighlightedLine } from "./HighlightedLine";
import { LookBackground } from "./LookBackground";
import { ResizeHandle } from "./ResizeHandle";
import { SlideCaption } from "./SlideCaption";
import type { UseLumen } from "./useLumen";

type Slide = UseLumen["slides"][number];

// Deliberately close to 1: at a thumbnail's 8px body text, anything much
// smaller stops being readable at all (see PreviewPanel's own note on why the
// caption ratio has to grow as the surface shrinks).
const CAPTION_RATIO = 0.8;

// Groups consecutive slides that share a label into one section block, so a
// two-slide "Verse 1" reads as one unit. Bible mode has no section concept —
// callers pass grouping off there and every slide lands in one flat block.
function groupSlides(slides: Slide[], grouped: boolean): { label: string; items: { slide: Slide; index: number }[] }[] {
  if (!grouped) return [{ label: "", items: slides.map((slide, index) => ({ slide, index })) }];
  const groups: { label: string; items: { slide: Slide; index: number }[] }[] = [];
  slides.forEach((slide, index) => {
    const last = groups[groups.length - 1];
    if (last && last.label === slide.label) last.items.push({ slide, index });
    else groups.push({ label: slide.label, items: [{ slide, index }] });
  });
  return groups;
}

// The slides grid, which since the handoff redesign lives inside the main
// column (it used to be a full-width strip pinned under it) with the
// Backgrounds panel filling whatever vertical space is left below it.
export function SlidesPanel({ lumen }: { lumen: UseLumen }) {
  const {
    state, slides, idx: currentSlideIndex, patch, look, allLooks, adjustLayoutSize, bible, lyricFamily,
    duplicateSlide, mergeSlideWithNext, splitSlide, reorderSlides, setSlideNote,
  } = lumen;

  const [grouped, setGrouped] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [openNoteIndex, setOpenNoteIndex] = useState<number | null>(null);
  // Kept as a local draft and committed on blur/close rather than on every
  // keystroke — setSlideNote goes through saveLyrics, which writes the whole
  // song override straight to the repository.
  const [noteDraft, setNoteDraft] = useState("");

  const showGroupLabels = !bible && grouped;
  const groups = groupSlides(slides, showGroupLabels);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex items-center gap-2.5 px-2 flex-none">
        <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">Slides</div>
        {!bible && (
          <button
            onClick={() => setGrouped((previous) => !previous)}
            title="Structure view: group slides by song section (Verse, Chorus, Bridge…)"
            className={cx(
              "w-6 h-6 flex items-center justify-center rounded-1.75 cursor-pointer text-[13px] border",
              grouped ? "border-accent bg-accent-soft text-accent" : "border-border bg-transparent text-muted"
            )}
          >
            ▤
          </button>
        )}
        <div className="flex-1" />
        <span
          title="Live/video backgrounds can be used here, but they show as a static image in Slides, Previous and Next up — playback only happens in Live Output and Present, to keep this view fast."
          className="w-4.5 h-4.5 rounded-full bg-panel2 border border-border flex items-center justify-center text-[10px] text-faint cursor-help"
        >
          i
        </span>
      </div>

      <div
        className="flex-none overflow-y-auto overflow-x-hidden mt-2.5 pr-1 pl-2"
        style={{ height: state.layoutSizes.slidesStripHeight }}
        data-tour="slides"
      >
        {groups.map((group, groupIndex) => (
          <div key={groupIndex} className={showGroupLabels ? "mb-3.5" : ""}>
            {showGroupLabels && (
              <div className="text-[10.5px] font-semibold tracking-[.06em] uppercase text-accent mb-2">{group.label}</div>
            )}
            <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(140px,1fr))]">
              {group.items.map(({ slide, index }) => {
                const effectiveLook = slide.lookId ? allLooks.find((l) => l.id === slide.lookId) : undefined;
                const isLive = index === currentSlideIndex;
                const canMerge = !bible && index < slides.length - 1 && slides[index + 1].label === slide.label;
                return (
                  <div
                    key={index}
                    draggable={!bible}
                    onDragStart={() => setDraggedIndex(index)}
                    onDragOver={(dragEvent) => dragEvent.preventDefault()}
                    onDrop={() => { if (draggedIndex !== null) reorderSlides(draggedIndex, index); setDraggedIndex(null); }}
                    onDragEnd={() => setDraggedIndex(null)}
                    onClick={() => patch({ idx: index, black: false, blank: false })}
                    className={cx(
                      "relative rounded-2.5 cursor-pointer bg-panel border",
                      isLive ? "border-accent shadow-[0_0_0_3px_var(--accent-soft)]" : "border-border",
                      draggedIndex === index && "opacity-40"
                    )}
                  >
                    <div className="relative h-24 rounded-t-[9px] overflow-hidden flex flex-col items-center justify-center gap-0.75 p-[8px_10px]">
                      <LookBackground look={effectiveLook || look} preview />
                      {slide.lines.map((line, lineIndex) => (
                        <div
                          key={lineIndex}
                          className={cx(lyricFamily, "text-[8px] font-medium text-white opacity-[.92] text-center relative z-1")}
                          style={lyricStyleCss(state.lyricStyle)}
                        >
                          <HighlightedLine line={line} highlights={slide.lineHighlights?.[lineIndex]} />
                        </div>
                      ))}
                      {!bible && (
                        <button
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation();
                            if (openNoteIndex === index) { setSlideNote(index, noteDraft); setOpenNoteIndex(null); return; }
                            setNoteDraft(slide.note || "");
                            setOpenNoteIndex(index);
                          }}
                          title="Operator note (never shown live)"
                          className={cx(
                            "absolute top-1 left-1 w-4 h-4 rounded-full border-none text-[9px] cursor-pointer flex items-center justify-center z-2 p-0",
                            slide.note ? "bg-accent text-white" : "bg-[rgba(0,0,0,.45)] text-white/70"
                          )}
                        >
                          ✎
                        </button>
                      )}
                      {slide.lookId && (
                        <span
                          title="Custom background for this section"
                          className="absolute top-1 right-1 w-1.75 h-1.75 rounded-full bg-accent z-2"
                        />
                      )}
                      <SlideCaption
                        caption={slide.caption}
                        lyricStyle={state.lyricStyle}
                        fontClassName={lyricFamily}
                        baseFontSize="8px"
                        ratio={CAPTION_RATIO}
                        bottom="3px"
                      />
                    </div>
                    <div className={cx("flex justify-between p-[6px_9px_4px] text-[11px]", isLive ? "text-accent" : "text-muted")}>
                      <span className="truncate">{slide.label}</span>
                      <span className="font-mono text-faint flex-none">{index + 1}</span>
                    </div>
                    {!bible && isLive && (
                      <div className="flex gap-0.75 p-[0_7px_7px]">
                        <button
                          onClick={(clickEvent) => { clickEvent.stopPropagation(); duplicateSlide(index); }}
                          title="Duplicate slide"
                          className="flex-1 h-4.5 rounded-1.25 border border-border bg-panel2 text-faint text-[9px] cursor-pointer p-0 hover:text-text"
                        >
                          ⧉
                        </button>
                        <button
                          onClick={(clickEvent) => { clickEvent.stopPropagation(); mergeSlideWithNext(index); }}
                          disabled={!canMerge}
                          title="Merge with next"
                          className="flex-1 h-4.5 rounded-1.25 border border-border bg-panel2 text-faint text-[9px] p-0 disabled:opacity-40 not-disabled:cursor-pointer not-disabled:hover:text-text"
                        >
                          ⤓
                        </button>
                        <button
                          onClick={(clickEvent) => { clickEvent.stopPropagation(); splitSlide(index, Math.ceil(slide.lines.length / 2)); }}
                          disabled={slide.lines.length < 2}
                          title="Split slide"
                          className="flex-1 h-4.5 rounded-1.25 border border-border bg-panel2 text-faint text-[9px] p-0 disabled:opacity-40 not-disabled:cursor-pointer not-disabled:hover:text-text"
                        >
                          ✂
                        </button>
                      </div>
                    )}
                    {openNoteIndex === index && (
                      <div
                        onClick={(clickEvent) => clickEvent.stopPropagation()}
                        className="absolute z-10 top-5.5 left-1 w-37.5 bg-panel border border-border2 rounded-2 shadow-app p-1.5"
                      >
                        <textarea
                          autoFocus
                          value={noteDraft}
                          onChange={(changeEvent) => setNoteDraft(changeEvent.target.value)}
                          onBlur={() => { setSlideNote(index, noteDraft); setOpenNoteIndex(null); }}
                          placeholder="wait for cue…"
                          className="w-full h-12.5 text-[10.5px] border border-border rounded-1.5 bg-panel2 text-text p-1 resize-none box-border outline-none"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <ResizeHandle
        axis="vertical"
        onResizeDelta={(deltaPixels) => adjustLayoutSize("slidesStripHeight", deltaPixels)}
      />

      <BackgroundsPanel lumen={lumen} />
    </div>
  );
}
