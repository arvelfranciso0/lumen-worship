"use client";

import { cx } from "../cx";
import { LYRIC_FONT_GROUPS, LYRIC_FONTS } from "../data";
import { InteractiveButton } from "../ui/Interactive";
import { useDebouncedColor } from "../hooks/useDebouncedColor";
import type { UseLumen } from "../useLumen";
import {
  clampOutlineWidth, DEFAULT_OUTLINE_COLOR, LYRIC_SCALE_STEP_PCT, OUTLINE_WIDTH_DEFAULT,
  OUTLINE_WIDTH_MIN, OUTLINE_WIDTH_STEP, scaleFromPercent,
} from "./mainPanelStyleControls";

// Text styling toolbar: font, weight/italic, colors, outline, highlight, and lyric scale.
export function MainPanelToolbar({ lumen }: { lumen: UseLumen }) {
  const { state, patch, applyLiveHighlight, removeLiveHighlight } = lumen;

  const [textColorDraft, onTextColorChange] = useDebouncedColor(
    state.lyricStyle.color || "#ffffff",
    (value) => patch((previousState) => ({ lyricStyle: { ...previousState.lyricStyle, color: value } }))
  );
  const [outlineColorDraft, onOutlineColorChange] = useDebouncedColor(
    state.lyricStyle.outlineColor || DEFAULT_OUTLINE_COLOR,
    (value) => patch((previousState) => ({ lyricStyle: { ...previousState.lyricStyle, outlineColor: value } }))
  );

  const outlineWidth = state.lyricStyle.outlineWidth || 0;
  const outlineOn = outlineWidth > 0;
  const setOutlineWidth = (width: number) =>
    patch((previousState) => ({ lyricStyle: { ...previousState.lyricStyle, outlineWidth: clampOutlineWidth(width) } }));

  const scalePct = Math.round(state.scale * 100);
  const setScalePct = (pct: number) => patch({ scale: scaleFromPercent(pct) });

  const selection = state.liveSelection;

  return (
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
        onClick={() => patch((previousState) => ({ lyricStyle: { ...previousState.lyricStyle, bold: !previousState.lyricStyle.bold } }))}
        className={cx(
          "w-7.5 h-7.5 rounded-2 border text-text font-bold cursor-pointer",
          state.lyricStyle.bold ? "border-accent bg-accent-soft" : "border-border bg-panel"
        )}
      >
        B
      </button>
      <button
        title="Italic"
        onClick={() => patch((previousState) => ({ lyricStyle: { ...previousState.lyricStyle, italic: !previousState.lyricStyle.italic } }))}
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
        onClick={() => setScalePct(scalePct - LYRIC_SCALE_STEP_PCT)}
        title="Smaller lyrics"
        className="w-6 h-6 rounded-2 border border-border bg-panel2 text-text text-[12px] cursor-pointer"
      >
        A−
      </button>
      <span className="font-mono text-[11px] text-text w-13 h-6 rounded-2 border border-border bg-panel2 flex items-center justify-center">
        {scalePct}%
      </span>
      <button
        onClick={() => setScalePct(scalePct + LYRIC_SCALE_STEP_PCT)}
        title="Larger lyrics"
        className="w-6 h-6 rounded-2 border border-border bg-panel2 text-text text-[12px] cursor-pointer"
      >
        A+
      </button>
    </div>
  );
}
