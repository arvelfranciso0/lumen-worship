"use client";

import { useMemo } from "react";
import { cx } from "../cx";
import type { UseLumen } from "../useLumen";
import { useSlideTransition } from "../hooks/useSlideTransition";
import type { Breakpoint } from "../hooks/useViewportBreakpoint";
import { useLiveSelectionTracking } from "./useLiveSelectionTracking";
import { getConnectedOutputs, getProgressInfo } from "./previewPanelHelpers";
import { LiveOutputBox } from "./LiveOutputBox";
import { PreviewThumbnail } from "./PreviewThumbnail";
import { ProgressBar } from "./ProgressBar";
import { TransportControls } from "./TransportControls";
import { OutputActionsRow } from "./OutputActionsRow";
import { ConnectedOutputsList } from "./ConnectedOutputsList";
import { OperatorNotes } from "./OperatorNotes";

// Operator screen's right-hand column: live output and navigation.
export function PreviewPanel({ lumen, breakpoint }: { lumen: UseLumen; breakpoint: Breakpoint }) {
  const {
    state, patch, go, cur, nxt, prv, idx, hidden, look, allLooks, lyricFamily,
    outputAspectRatio, outputStatus, boundaryPrevLabel, boundaryNextLabel, startPresenting,
    canGoNext, canGoPrev, atEndOverflow, atStartOverflow, slideCount, isPresenting,
  } = lumen;

  const isMobile = breakpoint === "mobile";
  // Panel width: fixed on tablet, draggable on desktop.
  const panelWidth = isMobile ? undefined : breakpoint === "tablet" ? 320 : state.layoutSizes.previewWidth;

  // Per-slide background look, falling back to the global look.
  const curLook = useMemo(() => (cur.lookId && allLooks.find((l) => l.id === cur.lookId)) || look, [cur, allLooks, look]);
  const nxtLook = useMemo(() => (nxt?.lookId && allLooks.find((l) => l.id === nxt.lookId)) || look, [nxt, allLooks, look]);
  const prvLook = useMemo(() => (prv?.lookId && allLooks.find((l) => l.id === prv.lookId)) || look, [prv, allLooks, look]);
  const slideTransitionStyle = useSlideTransition(state.transitionType, state.transitionDurationMs, state.performanceMode);

  const liveOutputRef = useLiveSelectionTracking(lumen);

  const { progressPct, progressLabel } = getProgressInfo(idx, slideCount);
  // "End" label only once past the last slide, otherwise "Next up".
  const nextUpLabel = atEndOverflow ? "End" : "Next up";
  const prevLabel = atStartOverflow ? "Start" : "Previous";

  const connectedOutputs = getConnectedOutputs(outputStatus, state.black, state.blank);

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
      {/* Fixed top section: live output, previous/next, progress, transport. */}
      <div className="flex-none flex flex-col gap-3.5">
        <LiveOutputBox
          liveOutputRef={liveOutputRef}
          cur={cur}
          curLook={curLook}
          black={state.black}
          presentingPreview={state.presenting}
          hidden={hidden}
          lyricStyle={state.lyricStyle}
          fontClassName={lyricFamily}
          scale={state.scale}
          transitionStyle={slideTransitionStyle}
          transitionKey={idx}
          outputAspectRatio={outputAspectRatio}
          isPresenting={isPresenting}
        />

        {/* PREVIOUS / NEXT UP */}
        <div className={cx("flex gap-2.5 flex-none min-w-0", isMobile ? "flex-col" : "flex-row")} data-tour="preview">
          <PreviewThumbnail
            variant="previous"
            sectionLabel={prevLabel}
            boundaryLabel={boundaryPrevLabel}
            slide={prv}
            look={prvLook}
            outputAspectRatio={outputAspectRatio}
            lyricStyle={state.lyricStyle}
            fontClassName={lyricFamily}
            scale={state.scale}
          />
          <PreviewThumbnail
            variant="next"
            sectionLabel={nextUpLabel}
            boundaryLabel={boundaryNextLabel}
            slide={nxt}
            look={nxtLook}
            black={state.black}
            outputAspectRatio={outputAspectRatio}
            lyricStyle={state.lyricStyle}
            fontClassName={lyricFamily}
            scale={state.scale}
          />
        </div>

        <ProgressBar progressPct={progressPct} progressLabel={progressLabel} />

        <TransportControls
          onPrevious={() => go(-1)}
          onNext={() => go(1)}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
        />
      </div>

      {/* Scrollable bottom section: blank/black/fullscreen, outputs, notes. */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3.5">
        <OutputActionsRow
          blank={state.blank}
          black={state.black}
          onToggleBlank={() => patch((previousState) => ({ blank: !previousState.blank, black: false }))}
          onToggleBlack={() => patch((previousState) => ({ black: !previousState.black, blank: false }))}
          onFullscreen={startPresenting}
        />

        <ConnectedOutputsList
          connectedOutputs={connectedOutputs}
          outputAspectRatio={outputAspectRatio}
          curLook={curLook}
          black={state.black}
          onManageDisplays={() => patch({ displaysModalOpen: true })}
        />

        <OperatorNotes
          open={state.operatorNotesOpen}
          notes={state.operatorNotes}
          onToggleOpen={() => patch((previousState) => ({ operatorNotesOpen: !previousState.operatorNotesOpen }))}
          onChangeNotes={(value) => patch({ operatorNotes: value })}
        />
      </div>
    </div>
  );
}
