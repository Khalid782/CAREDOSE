"use client";

/**
 * Gives every screen the current language already bound to the copy and the
 * date/time helpers, so screens never pass the language around by hand.
 */

import { useMemo } from "react";
import { useSettings } from "@/lib/context/SettingsProvider";
import {
  formatClock,
  formatCountdown,
  formatDateLong,
  formatDateShort,
  formatRelativeDay,
  formatTime,
  formatWeekdayShort,
} from "./format";
import { translate, type TranslationKey } from "./dictionary";
import type {
  FoodRelation,
  Language,
  MealTimes,
  MedicineForm,
  TimeOfDay,
} from "@/lib/data/types";

export interface Translator {
  language: Language;
  /** Looks up copy, e.g. t("today.tookIt"). */
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  /** "8:00 AM" / "8:00 बजे". */
  at: (time: string) => string;
  /** Split clock parts for the big time badge. */
  clock: (time: string) => { clock: string; suffix: string };
  /** "Monday, 26 October". */
  longDate: (dateKey: string) => string;
  /** "26 Oct". */
  shortDate: (dateKey: string) => string;
  /** "Mon" / "सोम". */
  weekday: (dateKey: string) => string;
  /** "Today" / "Yesterday" / "Mon". */
  relativeDay: (dateKey: string, todayDateKey: string) => string;
  /** "1 hr 20 min". */
  countdown: (ms: number) => string;
  /** "Morning" / "सुबह". */
  timeOfDay: (timeOfDay: TimeOfDay) => string;
  /** "After food" / "खाने के बाद". */
  food: (food: FoodRelation) => string;
  /** "Tablet" / "गोली". */
  form: (form: MedicineForm) => string;
  /** "Breakfast" / "नाश्ता". */
  meal: (meal: keyof MealTimes) => string;
}

export function useTranslator(): Translator {
  const { settings } = useSettings();
  const language: Language = settings?.language ?? "en";

  return useMemo<Translator>(
    () => ({
      language,
      t: (key, values) => translate(language, key, values),
      at: (time) => formatTime(time, language),
      clock: (time) => formatClock(time, language),
      longDate: (dateKey) => formatDateLong(dateKey, language),
      shortDate: (dateKey) => formatDateShort(dateKey, language),
      weekday: (dateKey) => formatWeekdayShort(dateKey, language),
      relativeDay: (dateKey, todayDateKey) => formatRelativeDay(dateKey, todayDateKey, language),
      countdown: (ms) => formatCountdown(ms, language),
      timeOfDay: (value) => translate(language, `timeOfDay.${value}` as TranslationKey),
      food: (value) => translate(language, `food.${value}` as TranslationKey),
      form: (value) => translate(language, `form.${value}` as TranslationKey),
      meal: (value) => translate(language, `meal.${value}` as TranslationKey),
    }),
    [language],
  );
}
