/**
 * Turns saved medicines and schedules into the doses the patient sees today.
 *
 * The data layer stores concrete wall-clock times ("08:00") and a date range.
 * This module adds the part a person needs: which meal a time belongs to and a
 * plain sentence such as "Take 1 tablet of Metformin 500 mg after breakfast."
 *
 * Meal times come from Settings, so changing breakfast in Settings also
 * changes the wording on the Today screen.
 */

import { addDays, fromDateKey, runsOnDate, timeOfDayFromTime, timeToMinutes, toDateKey } from "@/lib/data/time";
import type {
  DoseLog,
  FoodRelation,
  Language,
  MealTimes,
  Medicine,
  ScheduleItem,
  TimeOfDay,
} from "@/lib/data/types";
import { formatTime } from "@/lib/i18n/format";
import { translate, type TranslationKey } from "@/lib/i18n/dictionary";
import type { MealAnchor, ParsedMedicine } from "@/lib/parser";

const MEAL_ORDER: readonly MealAnchor[] = ["breakfast", "lunch", "dinner", "bedtime"];

/** A dose must be close to a meal before we name that meal in the sentence. */
const MEAL_DISTANCE_LIMIT_MINUTES = 150;
const BEDTIME_DISTANCE_LIMIT_MINUTES = 90;

function uniqueSortedTimes(times: readonly string[]): string[] {
  return [...new Set(times)].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

/**
 * The meal nearest to a wall-clock time, or null when the time is not close to
 * any meal. Handles the midnight wrap so 23:30 can belong to bedtime.
 */
export function mealAnchorForTime(time: string, mealTimes: MealTimes): MealAnchor | null {
  const minutes = timeToMinutes(time);
  let best: MealAnchor | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const meal of MEAL_ORDER) {
    const mealMinutes = timeToMinutes(mealTimes[meal]);
    const direct = Math.abs(minutes - mealMinutes);
    const distance = Math.min(direct, 1440 - direct);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = meal;
    }
  }

  const limit =
    best === "bedtime" ? BEDTIME_DISTANCE_LIMIT_MINUTES : MEAL_DISTANCE_LIMIT_MINUTES;
  return best && bestDistance <= limit ? best : null;
}

/**
 * The times a scanned medicine needs, derived from its printed frequency and
 * the meal times in Settings. "1-0-1" becomes breakfast and dinner; TDS adds
 * lunch; QID adds bedtime.
 */
export function timesForPrescription(
  prescription: Pick<ParsedMedicine, "frequency" | "dosePattern" | "meal">,
  mealTimes: MealTimes,
): string[] {
  const { dosePattern, frequency, meal } = prescription;

  if (dosePattern && dosePattern.length >= 2) {
    const active = dosePattern.filter((count) => count > 0).length;
    if (active === 1 && meal) {
      return [mealTimes[meal]];
    }

    const slots: MealAnchor[] =
      dosePattern.length === 2
        ? ["breakfast", "dinner"]
        : dosePattern.length === 3
          ? ["breakfast", "lunch", "dinner"]
          : ["breakfast", "lunch", "dinner", "bedtime"];

    const times = dosePattern.flatMap((count, index) => {
      const slot = slots[index];
      return count > 0 && slot ? [mealTimes[slot]] : [];
    });
    if (times.length > 0) return uniqueSortedTimes(times);
  }

  switch (frequency) {
    case "bd":
      return uniqueSortedTimes(
        meal === "bedtime"
          ? [mealTimes.breakfast, mealTimes.bedtime]
          : [mealTimes.breakfast, mealTimes.dinner],
      );
    case "tds":
      return uniqueSortedTimes([
        mealTimes.breakfast,
        mealTimes.lunch,
        mealTimes.dinner,
      ]);
    case "qid":
      return uniqueSortedTimes([
        mealTimes.breakfast,
        mealTimes.lunch,
        mealTimes.dinner,
        mealTimes.bedtime,
      ]);
    case "od":
    case "custom":
    default:
      return [mealTimes[meal ?? "breakfast"]];
  }
}

/** The first and last local dates for a course, or "always" for no duration. */
export function dateRangeForDuration(
  durationDays: number | null,
  startDateKey: string,
): { startDate: string | null; endDate: string | null } {
  if (!durationDays || durationDays <= 0) {
    return { startDate: null, endDate: null };
  }
  const start = fromDateKey(startDateKey);
  return {
    startDate: startDateKey,
    endDate: toDateKey(addDays(start, Math.round(durationDays) - 1)),
  };
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function mealName(meal: MealAnchor, language: Language): string {
  return translate(language, `meal.${meal}` as TranslationKey);
}

/**
 * One readable sentence. Kept in both languages because it is the main thing
 * the patient reads on the Today screen.
 */
export function describeDose({
  medicine,
  schedule,
  mealTimes,
  language = "en",
  meal = null,
}: {
  medicine: Pick<Medicine, "name" | "strength">;
  schedule: Pick<ScheduleItem, "time" | "food" | "dosage">;
  mealTimes: MealTimes;
  language?: Language;
  /** Pass a known meal; otherwise it is inferred from the time. */
  meal?: MealAnchor | null;
}): string {
  const anchor = meal ?? mealAnchorForTime(schedule.time, mealTimes);
  const strength = medicine.strength.trim();
  const namedMedicine = `${medicine.name.trim()}${strength ? ` ${strength}` : ""}`;
  const dosage = schedule.dosage.trim() || "1";

  if (language === "hi") {
    const when = (() => {
      if (anchor === "bedtime") return "सोने के समय";
      if (anchor) {
        const parts: Record<FoodRelation, string> = {
          before: "से पहले",
          after: "के बाद",
          anytime: "के समय",
        };
        return `${mealName(anchor, "hi")} ${parts[schedule.food]}`;
      }
      if (schedule.food === "before") return `खाने से पहले ${formatTime(schedule.time, "hi")}`;
      if (schedule.food === "after") return `खाने के बाद ${formatTime(schedule.time, "hi")}`;
      return formatTime(schedule.time, "hi");
    })();

    return `${namedMedicine} की ${dosage} ${when} लें।`;
  }

  const when = (() => {
    if (anchor === "bedtime") return "at bedtime";
    if (anchor) {
      const relation =
        schedule.food === "before" ? "before" : schedule.food === "after" ? "after" : "at";
      return `${relation} ${lowerFirst(mealName(anchor, "en"))}`;
    }
    if (schedule.food === "before") {
      return `before food at ${formatTime(schedule.time, "en")}`;
    }
    if (schedule.food === "after") {
      return `after food at ${formatTime(schedule.time, "en")}`;
    }
    return `at ${formatTime(schedule.time, "en")}`;
  })();

  return `Take ${dosage} of ${namedMedicine} ${when}.`;
}

/** One dated dose the Today screen can render and answer. */
export interface PlannedDose {
  id: string;
  date: string;
  time: string;
  timeOfDay: TimeOfDay;
  instruction: string;
  meal: MealAnchor | null;
  schedule: ScheduleItem;
  medicine: Medicine;
  log: DoseLog | null;
}

export interface BuildDosePlanInput {
  dateKey: string;
  medicines: readonly Medicine[];
  scheduleItems: readonly ScheduleItem[];
  doseLogs?: readonly DoseLog[];
  mealTimes: MealTimes;
  language?: Language;
}

/**
 * Every active dose for one local date, already described in plain language.
 * Date ranges, weekdays, inactive rows and missing medicines are all handled
 * here so screens never have to repeat those rules.
 */
export function buildDosePlan({
  dateKey,
  medicines,
  scheduleItems,
  doseLogs = [],
  mealTimes,
  language = "en",
}: BuildDosePlanInput): PlannedDose[] {
  const medicineById = new Map(medicines.map((medicine) => [medicine.id, medicine]));
  const logBySchedule = new Map<string, DoseLog>();
  for (const log of doseLogs) {
    if (log.date === dateKey) logBySchedule.set(log.scheduleItemId, log);
  }

  return scheduleItems
    .filter((item) => {
      if (!item.isActive || !runsOnDate(item, dateKey)) return false;
      const medicine = medicineById.get(item.medicineId);
      return Boolean(medicine?.isActive);
    })
    .map((item): PlannedDose | null => {
      const medicine = medicineById.get(item.medicineId);
      if (!medicine) return null;
      const meal = mealAnchorForTime(item.time, mealTimes);
      return {
        id: `${item.id}@${dateKey}`,
        date: dateKey,
        time: item.time,
        timeOfDay: item.timeOfDay ?? timeOfDayFromTime(item.time),
        instruction: describeDose({ medicine, schedule: item, mealTimes, language, meal }),
        meal,
        schedule: item,
        medicine,
        log: logBySchedule.get(item.id) ?? null,
      };
    })
    .filter((dose): dose is PlannedDose => dose !== null)
    .sort((a, b) =>
      a.time === b.time
        ? a.medicine.name === b.medicine.name
          ? a.id.localeCompare(b.id)
          : a.medicine.name.localeCompare(b.medicine.name)
        : a.time.localeCompare(b.time),
    );
}
