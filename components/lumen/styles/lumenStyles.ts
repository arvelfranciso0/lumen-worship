import { cx } from "../cx";

export const chipBase = (on: boolean) => cx(
  "h-[26px] px-[11px] rounded-[20px] text-[12px] cursor-pointer border",
  on ? "border-accent bg-accent-soft text-text font-semibold" : "border-border bg-panel2 text-muted font-normal"
);

export const tabStyle = (on: boolean) => cx(
  "flex-1 h-[28px] rounded-[8px] border-none cursor-pointer text-[12.5px]",
  on ? "font-semibold bg-raise text-text shadow-app-sm" : "font-medium bg-transparent text-muted shadow-none"
);

export const pill = (isAccent: boolean) => cx(
  "text-[11px] font-semibold tracking-[.04em] uppercase px-[9px] py-[3px] rounded-[6px] border",
  isAccent ? "bg-accent-soft text-accent border-accent" : "bg-raise text-muted border-border"
);

// onClasses must be a literal Tailwind class string since Tailwind can't generate classes assembled at runtime.
export const toolBtn = (on: boolean, onClasses: string) => cx(
  "h-[44px] px-[18px] rounded-[11px] text-[13.5px] font-semibold cursor-pointer border",
  on ? onClasses : "border-border bg-panel2 text-muted"
);
