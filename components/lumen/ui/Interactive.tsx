"use client";

import { InputHTMLAttributes, ButtonHTMLAttributes } from "react";

type InteractiveButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function InteractiveButton({ className, ...rest }: InteractiveButtonProps) {
  return <button className={className} {...rest} />;
}

type InteractiveInputProps = InputHTMLAttributes<HTMLInputElement>;

export function InteractiveInput({ className, ...rest }: InteractiveInputProps) {
  return <input className={className} {...rest} />;
}
