"use client";

/**
 * Labelled form controls, sized for older hands and eyes: every input is at
 * least 56px tall with 20px text, and the label is always visible (never a
 * placeholder-only field).
 */

import type { ReactNode } from "react";

export const inputClass =
  "w-full min-h-[56px] rounded-xl border-2 border-line bg-surface px-4 text-base text-fg placeholder:text-fg-muted focus-visible:border-accent";

export const selectClass = `${inputClass} pr-3`;

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-base font-semibold text-fg">
        {label}
        {hint ? <span className="ml-2 font-normal text-fg-muted">{hint}</span> : null}
      </label>
      {children}
    </div>
  );
}

/** A group of related controls with one visible heading. */
export function FieldGroup({
  legend,
  hint,
  children,
}: {
  legend: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[1.4rem] font-bold text-fg">{legend}</h2>
      {hint ? <p className="text-[0.9rem] text-fg-muted">{hint}</p> : null}
      {children}
    </div>
  );
}
