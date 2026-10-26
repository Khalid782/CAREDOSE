"use client";

/**
 * A stack of big radio options (text size, language). Real radio inputs keep it
 * accessible; each row is a 64px touch target so it is easy to hit.
 */

export interface SegmentedOption<TValue extends string> {
  value: TValue;
  label: string;
}

export function SegmentedControl<TValue extends string>({
  name,
  ariaLabel,
  value,
  options,
  onChange,
}: {
  name: string;
  ariaLabel: string;
  value: TValue;
  options: ReadonlyArray<SegmentedOption<TValue>>;
  onChange: (next: TValue) => void;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-col gap-3">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            className={`flex min-h-[64px] cursor-pointer items-center gap-4 rounded-xl border-2 px-4 text-base font-semibold ${
              selected ? "border-accent bg-accent-soft text-fg" : "border-line bg-surface text-fg"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="h-6 w-6 shrink-0 accent-[var(--accent)]"
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}
