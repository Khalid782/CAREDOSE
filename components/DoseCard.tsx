"use client";

/**
 * One dose in the Today timeline.
 *
 * The whole card is built around a single big "I TOOK IT" button, because that
 * is the one thing the patient has to do. Taken and skipped doses turn into a
 * clear status row with an Undo button.
 */

import { Check, CircleCheck, CircleSlash, RotateCcw } from "lucide-react";
import { scheduledAt, timeToMinutes, toTimeKey } from "@/lib/data/time";
import type { Caregiver, DoseLog, Medicine, ScheduleItem } from "@/lib/data/types";
import { useTranslator } from "@/lib/i18n/useTranslator";
import { BigTimeBadge, type BigTimeBadgeTone } from "./BigTimeBadge";
import { Button } from "./Button";
import { Card } from "./Card";
import { CaregiverNudge, NUDGE_AFTER_MS } from "./CaregiverNudge";

export interface DoseEntry {
  schedule: ScheduleItem;
  medicine: Medicine;
  log: DoseLog | null;
  /** Plain-language sentence from the schedule engine. */
  instruction?: string;
}

export function DoseCard({
  dose,
  instruction,
  dateKey,
  caregiver,
  now,
  onTake,
  onSkip,
  onUndo,
}: {
  dose: DoseEntry;
  /** Optional plain-language sentence, already built for this dose. */
  instruction?: string;
  /** The local date this dose belongs to, used for the caregiver nudge. */
  dateKey?: string;
  /** The caregiver saved in Settings, if any. */
  caregiver?: Caregiver | null;
  /** Current time, used to mark a dose that is past its time. */
  now: Date;
  onTake: () => void;
  onSkip: () => void;
  onUndo: () => void;
}) {
  const { t, clock, food } = useTranslator();
  const { schedule, medicine, log } = dose;

  const isTaken = log?.status === "taken";
  const isSkipped = log?.status === "skipped";
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const isLate = !log && timeToMinutes(schedule.time) < minutesNow;
  const dueAt = dateKey ? scheduledAt(dateKey, schedule.time) : null;
  const needsCaregiverNudge =
    !log && dueAt !== null && now.getTime() - dueAt.getTime() >= NUDGE_AFTER_MS;

  const tone: BigTimeBadgeTone = isTaken ? "done" : isLate ? "late" : "default";
  const takenAt = log ? clock(toTimeKey(new Date(log.recordedAt))) : null;

  return (
    <Card as="li" className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <BigTimeBadge time={schedule.time} caption={food(schedule.food)} tone={tone} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="text-[1.4rem] font-bold leading-tight text-fg">{medicine.name}</h3>
          {instruction ? (
            <p className="text-base font-semibold leading-snug text-fg">{instruction}</p>
          ) : (
            <p className="text-[0.9rem] text-fg-muted">
              {schedule.dosage}
              {medicine.strength ? ` · ${medicine.strength}` : ""}
            </p>
          )}
          {isLate ? (
            <span className="mt-1 w-fit rounded-lg border-2 border-warn-line bg-warn-soft px-2 py-1 text-[0.85rem] font-semibold text-warn-fg">
              {t("today.late")}
            </span>
          ) : null}
        </div>
      </div>

      {needsCaregiverNudge ? (
        <CaregiverNudge
          caregiver={caregiver ?? null}
          medicineName={medicine.name}
          time={schedule.time}
        />
      ) : null}

      {isTaken && takenAt ? (
        <div className="flex items-center gap-3 rounded-xl border-2 border-ok-line bg-ok-soft p-3">
          <CircleCheck size={28} strokeWidth={2.5} aria-hidden="true" className="text-ok-fg" />
          <span className="flex-1 text-base font-semibold text-ok-fg">
            {t("today.takenAt", { time: `${takenAt.clock} ${takenAt.suffix}` })}
          </span>
        </div>
      ) : null}

      {isSkipped ? (
        <div className="flex items-center gap-3 rounded-xl border-2 border-warn-line bg-warn-soft p-3">
          <CircleSlash size={28} strokeWidth={2.5} aria-hidden="true" className="text-warn-fg" />
          <span className="flex-1 text-base font-semibold text-warn-fg">
            {t("today.skipped")}
          </span>
        </div>
      ) : null}

      {log ? (
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          icon={<RotateCcw size={22} strokeWidth={2.5} />}
          onClick={onUndo}
        >
          {t("today.undo")}
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<Check size={30} strokeWidth={3} />}
            onClick={onTake}
          >
            {t("today.tookIt")}
          </Button>
          <Button variant="secondary" size="sm" fullWidth onClick={onSkip}>
            {t("today.skip")}
          </Button>
        </div>
      )}
    </Card>
  );
}
