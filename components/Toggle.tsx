"use client";

/**
 * An on/off switch with a visible label and hint, used for dark mode.
 * The checkbox itself is off-screen but focusable, so keyboard and screen
 * readers get the normal switch behaviour.
 */

import type { ReactNode } from "react";

export function Toggle({
  label,
  hint,
  icon,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  icon?: ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex min-h-[72px] cursor-pointer items-center justify-between gap-4 rounded-2xl border-2 border-line bg-surface p-4">
      <span className="flex items-center gap-3">
        {icon ? (
          <span aria-hidden="true" className="shrink-0 text-accent">
            {icon}
          </span>
        ) : null}
        <span className="flex flex-col">
          <span className="text-base font-semibold text-fg">{label}</span>
          {hint ? <span className="text-[0.9rem] text-fg-muted">{hint}</span> : null}
        </span>
      </span>

      <span className="relative inline-flex h-[40px] w-[72px] shrink-0 items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border-2 border-line bg-surface-3 transition-colors peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus-ring)]"
        />
        <span
          aria-hidden="true"
          className="absolute left-[5px] h-[26px] w-[26px] rounded-full bg-surface shadow transition-transform peer-checked:translate-x-[32px]"
        />
      </span>
    </label>
  );
}
