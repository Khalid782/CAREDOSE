"use client";

/**
 * The big time badge: the most important number on the Today screen. It always
 * shows the time as text, so it works even if a glyph is missing in the font.
 */

import { useTranslator } from "@/lib/i18n/useTranslator";
import type { TimeOfDay } from "@/lib/data/types";

export type BigTimeBadgeTone = "default" | "done" | "late";

const TONE_CLASSES: Record<BigTimeBadgeTone, string> = {
  default: "bg-accent-soft border-line text-fg",
  done: "bg-ok-soft border-ok-line text-ok-fg",
  late: "bg-warn-soft border-warn-line text-warn-fg",
};

export function BigTimeBadge({
  time,
  caption,
  tone = "default",
}: {
  /** Local time "HH:mm". */
  time: string;
  /** Small label under the time, e.g. "Morning" or "After food". */
  caption?: string | TimeOfDay;
  tone?: BigTimeBadgeTone;
}) {
  const { clock, timeOfDay } = useTranslator();
  const { clock: clockText, suffix } = clock(time);
  const captionText = caption ? (isTimeOfDay(caption) ? timeOfDay(caption) : caption) : null;

  return (
    <div
      className={`flex min-w-[92px] shrink-0 flex-col items-center rounded-xl border-2 px-3 py-2 ${TONE_CLASSES[tone]}`}
    >
      <span className="text-[1.45rem] font-bold leading-none tabular-nums">{clockText}</span>
      <span className="mt-1 text-[0.8rem] font-semibold uppercase tracking-wide opacity-80">
        {suffix}
      </span>
      {captionText ? (
        <span className="mt-2 text-[0.85rem] font-semibold leading-tight">{captionText}</span>
      ) : null}
    </div>
  );
}

const TIME_OF_DAY_VALUES: TimeOfDay[] = ["morning", "afternoon", "evening", "night"];

function isTimeOfDay(value: string): value is TimeOfDay {
  return (TIME_OF_DAY_VALUES as string[]).includes(value);
}
