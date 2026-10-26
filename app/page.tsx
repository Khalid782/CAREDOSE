"use client";

/**
 * Today — the screen the patient opens most.
 *
 * One flat list of doses grouped by Morning / Afternoon / Evening / Night, each
 * with a single big "I TOOK IT" button. Nothing is hidden behind a menu, and the
 * next dose and the progress ring are always at the top.
 */

import { CalendarCheck, CalendarDays, CircleCheck, Pill } from "lucide-react";
import { LinkButton } from "@/components/Button";
import { Card, CardTitle } from "@/components/Card";
import { DoseCard } from "@/components/DoseCard";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { ProgressRing } from "@/components/ProgressRing";
import { WarningBanner } from "@/components/WarningBanner";
import { useCareData, useDosesForDate } from "@/lib/context/CareDataProvider";
import { useSettings } from "@/lib/context/SettingsProvider";
import { TIME_OF_DAY_ORDER, scheduledAt, timeToMinutes, toDateKey } from "@/lib/data/time";
import type { MealTimes, TimeOfDay } from "@/lib/data/types";
import { useNow } from "@/lib/hooks/useNow";
import { useTranslator } from "@/lib/i18n/useTranslator";

/** Which meal time is shown as a hint next to each group heading. */
const MEAL_FOR_SLOT: Record<TimeOfDay, keyof MealTimes> = {
  morning: "breakfast",
  afternoon: "lunch",
  evening: "dinner",
  night: "bedtime",
};

export default function TodayPage() {
  const { t, longDate, at, timeOfDay, meal, countdown } = useTranslator();
  const { settings } = useSettings();
  const { setDoseStatus, clearDose } = useCareData();
  const now = useNow(1000);

  const dateKey = toDateKey(now);
  const doses = useDosesForDate(dateKey);

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const takenCount = doses.filter((dose) => dose.log?.status === "taken").length;
  const total = doses.length;
  const overdueCount = doses.filter(
    (dose) => !dose.log && timeToMinutes(dose.schedule.time) < minutesNow,
  ).length;
  const nextDose =
    doses.find((dose) => !dose.log && timeToMinutes(dose.schedule.time) > minutesNow) ?? null;
  const countdownMs = nextDose
    ? scheduledAt(dateKey, nextDose.schedule.time).getTime() - now.getTime()
    : 0;
  const allTaken = total > 0 && takenCount === total;

  const groups = TIME_OF_DAY_ORDER.map((slot) => ({
    slot,
    items: doses.filter((dose) => dose.schedule.timeOfDay === slot),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <PageHeader title={t("today.title")} subtitle={longDate(dateKey)} />

      {total === 0 ? (
        <EmptyState
          icon={<Pill size={36} strokeWidth={2.5} />}
          title={t("today.emptyTitle")}
          message={t("today.emptyBody")}
          action={
            <LinkButton href="/medicines" fullWidth icon={<Pill size={26} strokeWidth={2.5} />}>
              {t("today.emptyAction")}
            </LinkButton>
          }
        />
      ) : (
        <Card className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <ProgressRing
              taken={takenCount}
              total={total}
              size={116}
              label={t("today.dosesTaken", { taken: takenCount, total })}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <CardTitle icon={<CalendarCheck size={26} strokeWidth={2.5} />}>
                {t("today.progress")}
              </CardTitle>
              <p className="text-base font-semibold text-fg">
                {t("today.dosesTaken", { taken: takenCount, total })}
              </p>
            </div>
          </div>

          <div className="rounded-xl border-2 border-line bg-surface-2 p-3">
            <p className="text-[0.9rem] font-semibold text-fg-muted">{t("today.nextDose")}</p>
            {nextDose ? (
              <p className="mt-1 text-base font-semibold text-fg">
                {t("today.nextDoseAt", {
                  name: nextDose.medicine.name,
                  time: at(nextDose.schedule.time),
                })}
                {" · "}
                {t("today.inCountdown", { countdown: countdown(countdownMs) })}
              </p>
            ) : (
              <p className="mt-1 text-base font-semibold text-fg">{t("today.allDone")}</p>
            )}
          </div>

          <LinkButton
            href="/history"
            variant="secondary"
            size="md"
            fullWidth
            icon={<CalendarDays size={24} strokeWidth={2.5} />}
          >
            {t("today.historyLink")}
          </LinkButton>
        </Card>
      )}

      {allTaken ? (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-ok-line bg-ok-soft p-4">
          <CircleCheck size={30} strokeWidth={2.5} aria-hidden="true" className="text-ok-fg" />
          <p className="text-base font-semibold text-ok-fg">{t("today.allDone")}</p>
        </div>
      ) : null}

      {overdueCount > 0 ? (
        <WarningBanner
          title={
            overdueCount === 1
              ? t("today.overdueOne")
              : t("today.overdueMany", { count: overdueCount })
          }
        >
          <p>{t("today.overdueBody")}</p>
        </WarningBanner>
      ) : null}

      {groups.map((group) => (
        <section key={group.slot} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="text-[1.4rem] font-bold text-fg">{timeOfDay(group.slot)}</h2>
            {settings ? (
              <span className="text-[0.9rem] text-fg-muted">
                {t("today.mealHint", {
                  meal: meal(MEAL_FOR_SLOT[group.slot]),
                  time: at(settings.mealTimes[MEAL_FOR_SLOT[group.slot]]),
                })}
              </span>
            ) : null}
          </div>
          <ul className="flex flex-col gap-4">
            {group.items.map((dose) => (
              <DoseCard
                key={dose.schedule.id}
                dose={dose}
                now={now}
                onTake={() => void setDoseStatus(dose.schedule.id, dateKey, "taken")}
                onSkip={() => void setDoseStatus(dose.schedule.id, dateKey, "skipped")}
                onUndo={() => void clearDose(dose.schedule.id, dateKey)}
              />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
