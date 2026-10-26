"use client";

/**
 * Circular progress with the percentage written inside it. The number is real
 * text (not just a drawing) so it is readable and screen-reader friendly.
 */

export function ProgressRing({
  taken,
  total,
  size = 132,
  label,
  caption,
}: {
  /** Doses answered "taken". */
  taken: number;
  /** Doses expected. */
  total: number;
  size?: number;
  /** Accessible description, e.g. "6 of 7 doses taken". */
  label: string;
  /** Text under the percentage, e.g. "doses taken". */
  caption?: string;
}) {
  const stroke = Math.max(10, Math.round(size / 12));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = total > 0 ? Math.min(1, Math.max(0, taken / total)) : 0;
  const percent = Math.round(ratio * 100);

  return (
    <div
      role="img"
      aria-label={label}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[1.7rem] font-bold leading-none text-fg tabular-nums">
          {percent}
          <span className="text-[1rem] font-bold">%</span>
        </span>
        {caption ? (
          <span className="mt-1 px-1 text-center text-[0.8rem] font-semibold text-fg-muted">
            {caption}
          </span>
        ) : null}
      </span>
    </div>
  );
}
