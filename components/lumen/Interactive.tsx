"use client";

import { CSSProperties, InputHTMLAttributes, ButtonHTMLAttributes, useState } from "react";

type InteractiveButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  base: CSSProperties;
  hover?: CSSProperties;
  active?: CSSProperties;
};

export function InteractiveButton({ base, hover, active, onMouseEnter, onMouseLeave, onMouseDown, onMouseUp, ...rest }: InteractiveButtonProps) {
  const [isHover, setHover] = useState(false);
  const [isActive, setActive] = useState(false);
  const style: CSSProperties = { ...base, ...(isHover ? hover : null), ...(isActive ? active : null) };
  return (
    <button
      {...rest}
      style={style}
      onMouseEnter={(e) => { setHover(true); onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setHover(false); setActive(false); onMouseLeave?.(e); }}
      onMouseDown={(e) => { setActive(true); onMouseDown?.(e); }}
      onMouseUp={(e) => { setActive(false); onMouseUp?.(e); }}
    />
  );
}

type InteractiveInputProps = InputHTMLAttributes<HTMLInputElement> & {
  base: CSSProperties;
  focusStyle?: CSSProperties;
};

export function InteractiveInput({ base, focusStyle, onFocus, onBlur, ...rest }: InteractiveInputProps) {
  const [isFocused, setFocused] = useState(false);
  const style: CSSProperties = { ...base, ...(isFocused ? focusStyle : null) };
  return (
    <input
      {...rest}
      style={style}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
    />
  );
}
