"use client";

/**
 * Full-screen dose alarm. It deliberately has no close button: the patient
 * answers with I TOOK IT, Snooze 10 min, or Skip so the alarm cannot be
 * dismissed by accident.
 */

import { AlarmClock, Check, Clock3, SkipForward } from "lucide-react";
import { useEffect } from "react";
import type { DoseAlert } from "@/lib/alerts";
import { useTranslator } from "@/lib/i18n/useTranslator";
import { Button } from "./Button";

export function DoseAlarm({
  alert,
  onTake,
  onSnooze,
  onSkip,
}: {
  alert: DoseAlert;
  onTake: () => void;
  onSnooze: () => void;
  onSkip: () => void;
}) {
  const { t, at } = useTranslator();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="dose-alarm-title"
      aria-describedby="dose-alarm-instruction"
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-surface-2 px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(28px,env(safe-area-inset-top))]"
    >
      <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center gap-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <span
            aria-hidden="true"
            className="flex h-[96px] w-[96px] items-center justify-center rounded-full bg-warn-soft text-warn-fg"
          >
            <AlarmClock size={54} strokeWidth={2.5} />
          </span>
          <h1 id="dose-alarm-title" className="text-[2rem] font-bold leading-tight text-fg">
            {t("alarm.title")}
          </h1>
          <p className="rounded-xl border-2 border-warn-line bg-warn-soft px-4 py-2 text-[1.1rem] font-bold text-warn-fg">
            {t("alarm.dueAt", { time: at(alert.time) })}
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border-2 border-line bg-surface p-5">
          <h2 className="text-[1.7rem] font-bold leading-tight text-fg">
            {alert.medicineName}
          </h2>
          <p id="dose-alarm-instruction" className="text-base font-semibold leading-relaxed text-fg">
            {alert.instruction}
          </p>
          <p className="flex items-start gap-2 text-[0.9rem] text-fg-muted">
            <Clock3 size={20} strokeWidth={2.5} aria-hidden="true" className="mt-0.5 shrink-0" />
            {t("alarm.repeats")}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            autoFocus
            variant="primary"
            size="lg"
            fullWidth
            icon={<Check size={30} strokeWidth={3} />}
            onClick={onTake}
          >
            {t("alarm.took")}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            icon={<Clock3 size={26} strokeWidth={2.5} />}
            onClick={onSnooze}
          >
            {t("alarm.snooze")}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            icon={<SkipForward size={26} strokeWidth={2.5} />}
            onClick={onSkip}
          >
            {t("alarm.skip")}
          </Button>
        </div>
      </div>
    </div>
  );
}
