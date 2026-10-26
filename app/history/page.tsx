"use client";

/**
 * History — how the last seven days went.
 *
 * Shown as a small bar chart plus the numbers written out, because a picture
 * alone is not enough for everyone. Missed doses are also summarised per
 * medicine so a caregiver can act on them.
 */

import { CalendarDays, CircleCheck, TriangleAlert } from "lucide-react";
import { useMemo } from "react";
import { Card, CardTitle } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { ProgressRing } from "@/components/ProgressRing";
import { useCareData } from "@/lib/context/CareDataProvider";
import { lastDateKeys, runsOnDate, timeToMinutes, toDateKey } from "@/lib/data/time";
import { useNow } from "@/lib/hooks/useNow";
import { useTranslator } from "@/lib/i18n/useTranslator";

const HISTORY_DAYS = 7;

export default function HistoryPage() {
  const { t, weekday, relativeDay, longDate } = useTranslator();
  const { medicines, scheduleItems, doseLogs } = useCareData();
  const now = useNow(30000);
  const todayDateKey = toDateKey(now);

  const days = useMemo(() => {
    const dateKeys = lastDateKeys(HISTORY_DAYS, todayDateKey);
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const byId = new Map(medicines.map((medicine) => [medicine.id, medicine]));

    return dateKeys.map((dateKey) => {
      const isToday = dateKey === todayDateKey;
      const expected = scheduleItems.filter((item) => runsOnDate(item, dateKey));
      const logs = doseLogs.filter((log) => log.date === dateKey);
      const answeredFor = (scheduleItemId: string) =>
        logs.find((log) => log.scheduleItemId === scheduleItemId) ?? null;

      const missedMedicines: string[] = [];
      let takenCount = 0;

      for (const item of expected) {
        const log = answeredFor(item.id);
        const isPast = !isToday || timeToMinutes(item.time) < minutesNow;
        if (log?.status === "taken") {
          takenCount += 1;
          continue;
        }
        if (log?.status === "skipped" || (isPast && !log)) {
          const medicine = byId.get(item.medicineId);
          missedMedicines.push(medicine?.name ?? "");
        }
      }

      return {
        dateKey,
        isToday,
        total: expected.length,
        taken: takenCount,
        missed: missedMedicines.length,
        missedMedicines: missedMedicines.filter(Boolean),
      };
    });
  }, [medicines, scheduleItems, doseLogs, now, todayDateKey]);

  const totalExpected = days.reduce((sum, day) => sum + day.total, 0);
  const totalTaken = days.reduce((sum, day) => sum + day.taken, 0);

  // A streak counts back from today; an unfinished today does not break it.
  const streak = useMemo(() => {
    let count = 0;
    for (let index = days.length - 1; index >= 0; index -= 1) {
      const day = days[index];
      if (!day || day.total === 0) continue;
      if (day.missed === 0) count += 1;
      else if (index === days.length - 1) continue;
      else break;
    }
    return count;
  }, [days]);

  const missedByMedicine = useMemo(() => {
    const counts = new Map<string, number>();
    for (const day of days) {
      for (const name of day.missedMedicines) {
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [days]);

  if (totalExpected === 0) {
    return (
      <>
        <PageHeader
          title={t("history.title")}
          subtitle={t("history.subtitle")}
          backHref="/"
          backLabel={t("nav.today")}
        />
        <EmptyState
          icon={<CalendarDays size={36} strokeWidth={2.5} />}
          title={t("history.emptyTitle")}
          message={t("history.emptyBody")}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t("history.title")}
        subtitle={t("history.subtitle")}
        backHref="/"
        backLabel={t("nav.today")}
      />

      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <ProgressRing
            taken={totalTaken}
            total={totalExpected}
            size={128}
            label={t("history.dosesTaken", { taken: totalTaken, total: totalExpected })}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <CardTitle icon={<CalendarDays size={26} strokeWidth={2.5} />}>
              {t("history.adherence")}
            </CardTitle>
            <p className="text-base font-semibold text-fg">
              {t("history.dosesTaken", { taken: totalTaken, total: totalExpected })}
            </p>
            <p className="text-[0.9rem] text-fg-muted">
              {streak > 0 ? t("history.streak", { days: streak }) : t("history.streakNone")}
            </p>
          </div>
        </div>

        <div className="rounded-xl border-2 border-line bg-surface-2 p-3">
          <ul className="flex items-end justify-between gap-1">
            {days.map((day) => {
              const percent = day.total > 0 ? Math.round((day.taken / day.total) * 100) : 0;
              return (
                <li key={day.dateKey} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <span className="text-[0.8rem] font-semibold text-fg tabular-nums">
                    {day.total > 0 ? `${day.taken}/${day.total}` : "–"}
                  </span>
                  <span
                    aria-hidden="true"
                    className="flex h-[92px] w-full max-w-[30px] items-end overflow-hidden rounded-lg bg-surface-3"
                  >
                    <span
                      className="w-full rounded-lg"
                      style={{
                        height: `${percent}%`,
                        backgroundColor: day.missed > 0 ? "var(--warn)" : "var(--ok)",
                      }}
                    />
                  </span>
                  <span className="text-[0.8rem] font-semibold text-fg-muted">
                    {weekday(day.dateKey)}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex flex-wrap items-center gap-4 border-t-2 border-line pt-3">
            <span className="flex items-center gap-2 text-[0.85rem] font-semibold text-fg">
              <span
                aria-hidden="true"
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: "var(--ok)" }}
              />
              {t("history.legendTaken")}
            </span>
            <span className="flex items-center gap-2 text-[0.85rem] font-semibold text-fg">
              <span
                aria-hidden="true"
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: "var(--warn)" }}
              />
              {t("history.legendMissed")}
            </span>
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle icon={<TriangleAlert size={26} strokeWidth={2.5} />}>
          {t("history.missedTitle")}
        </CardTitle>
        {missedByMedicine.length === 0 ? (
          <div className="flex items-center gap-3">
            <CircleCheck size={26} strokeWidth={2.5} aria-hidden="true" className="text-ok-fg" />
            <p className="text-[0.95rem] font-semibold text-ok-fg">{t("history.noMissed")}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {missedByMedicine.map(([name, count]) => (
              <li
                key={name}
                className="flex items-center justify-between gap-3 rounded-xl border-2 border-warn-line bg-warn-soft px-3 py-2"
              >
                <span className="text-[0.95rem] font-semibold text-warn-fg">{name}</span>
                <span className="text-[0.95rem] font-semibold text-warn-fg tabular-nums">
                  {t("history.missedCount", { count })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle>{t("history.subtitle")}</CardTitle>
        <ul className="flex flex-col gap-2">
          {[...days].reverse().map((day) => (
            <li
              key={day.dateKey}
              className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-line py-2 last:border-b-0"
            >
              <span className="text-[0.95rem] font-semibold text-fg">
                {relativeDay(day.dateKey, todayDateKey)}
                <span className="ml-2 font-normal text-fg-muted">{longDate(day.dateKey)}</span>
              </span>
              <span className="text-[0.95rem] font-semibold text-fg-muted tabular-nums">
                {day.total > 0 ? `${day.taken}/${day.total}` : "–"}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
