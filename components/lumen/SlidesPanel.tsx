"use client";

import { useMemo, useState } from "react";
import { BackgroundsPanel } from "./BackgroundsPanel";
import { cx } from "./cx";
import { LookBackground } from "./LookBackground";
import { ResizeHandle } from "./ResizeHandle";
import { SlideStage } from "./SlideStage";
import type { UseLumen } from "./useLumen";

type Slide = UseLumen["slides"][number];

// A thumbnail is the smallest surface a slide is drawn on, so its caption needs
// the lowest floor of any of them before the honest proportion becomes unreadable
// (see stage.ts for why nothing here is sized in fixed pixels).
const THUMBNAIL_CAPTION_MIN_SIZE = "5px";

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
    outputAspectRatio, duplicateSlide, mergeSlideWithNext, splitSlide, reorderSlides,
  } = lumen;

  const [grouped, setGrouped] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const showGroupLabels = !bible && grouped;
  const groups = useMemo(() => groupSlides(slides, showGroupLabels), [slides, showGroupLabels]);

  // Looked up once per allLooks change instead of a linear allLooks.find() per
  // slide per render — grouped slides can otherwise re-scan the whole looks
  // list on every unrelated keystroke.
  const looksById = useMemo(() => new Map(allLooks.map((lookOption) => [lookOption.id, lookOption])), [allLooks]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* pt-2.5 so the label isn't flush against the panel's top edge — the row
          above is a divider, not spacing. */}
      <div className="flex items-center gap-2.5 px-2 pt-2.5 flex-none">
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
                const effectiveLook = slide.lookId ? looksById.get(slide.lookId) : undefined;
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
                    onClick={() => patch({ idx: index })}
                    className={cx(
                      "relative rounded-2.5 cursor-pointer bg-panel border",
                      isLive ? "border-accent shadow-[0_0_0_3px_var(--accent-soft)]" : "border-border",
                      draggedIndex === index && "opacity-40"
                    )}
                  >
                    {/* Carries the output's aspect ratio and container-type so a
                        thumbnail is the same scale model of the audience screen
                        the Live output box is — it used to be a fixed h-24 with
                        hardcoded 8px text, which is why A−/A+ and panel resizing
                        never reached it. */}
                    <div
                      className="relative rounded-t-[9px] overflow-hidden"
                      style={{ aspectRatio: outputAspectRatio, containerType: "size" }}
                    >
                      <LookBackground look={effectiveLook || look} preview />
                      <SlideStage
                        lines={slide.lines}
                        lineHighlights={slide.lineHighlights}
                        compareVerseNumber={slide.compare?.verseNumber}
                        caption={slide.caption}
                        lyricStyle={state.lyricStyle}
                        fontClassName={lyricFamily}
                        scale={state.scale}
                        captionMinFontSize={THUMBNAIL_CAPTION_MIN_SIZE}
                      />
                      {slide.lookId && (
                        <span
                          title="Custom background for this section"
                          className="absolute top-1 right-1 w-1.75 h-1.75 rounded-full bg-accent z-2"
                        />
                      )}
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
