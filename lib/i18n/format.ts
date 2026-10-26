/**
 * Date and time formatting for both languages.
 *
 * Written by hand instead of using Intl: it keeps the same output on every
 * phone, works inside the Android wrapper with no ICU surprises, and lets the
 * Hindi strings read naturally ("7:00 बजे").
 */

import { fromDateKey, splitDuration, timeToMinutes } from "@/lib/data/time";
import type { Language } from "@/lib/data/types";
import { translate } from "./dictionary";

const WEEKDAYS: Record<Language, string[]> = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  hi: ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"],
};

const WEEKDAYS_SHORT: Record<Language, string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  hi: ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"],
};

const MONTHS: Record<Language, string[]> = {
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  hi: [
    "जनवरी",
    "फ़रवरी",
    "मार्च",
    "अप्रैल",
    "मई",
    "जून",
    "जुलाई",
    "अगस्त",
    "सितंबर",
    "अक्टूबर",
    "नवंबर",
    "दिसंबर",
  ],
};

export interface ClockParts {
  /** "8:00" — the part shown large. */
  clock: string;
  /** "AM" / "PM", or "बजे" in Hindi. */
  suffix: string;
}

/** Splits "HH:mm" into a 12-hour clock and its suffix. */
export function formatClock(time: string, language: Language = "en"): ClockParts {
  const minutes = timeToMinutes(time);
  const hours24 = Math.floor(minutes / 60);
  const minutesInHour = minutes % 60;
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const clock = `${hours12}:${String(minutesInHour).padStart(2, "0")}`;
  const suffix = language === "hi" ? "बजे" : hours24 < 12 ? "AM" : "PM";
  return { clock, suffix };
}

/** "8:00 AM" / "8:00 बजे". */
export function formatTime(time: string, language: Language = "en"): string {
  const { clock, suffix } = formatClock(time, language);
  return `${clock} ${suffix}`;
}

/** "Monday, 26 October" / "सोमवार, 26 अक्टूबर". */
export function formatDateLong(dateKey: string, language: Language = "en"): string {
  const date = fromDateKey(dateKey);
  const weekday = WEEKDAYS[language][date.getDay()] ?? "";
  const month = MONTHS[language][date.getMonth()] ?? "";
  return `${weekday}, ${date.getDate()} ${month}`;
}

/** "26 Oct" / "26 अक्टू". */
export function formatDateShort(dateKey: string, language: Language = "en"): string {
  const date = fromDateKey(dateKey);
  const month = MONTHS[language][date.getMonth()] ?? "";
  const shortMonth = language === "hi" ? month.slice(0, 5) : month.slice(0, 3);
  return `${date.getDate()} ${shortMonth}`;
}

/** "Mon" / "सोम". */
export function formatWeekdayShort(dateKey: string, language: Language = "en"): string {
  const date = fromDateKey(dateKey);
  return WEEKDAYS_SHORT[language][date.getDay()] ?? "";
}

/** "in 1 hr 20 min" style countdown text without the leading preposition. */
export function formatCountdown(ms: number, language: Language = "en"): string {
  const { hours, minutes } = splitDuration(ms);
  if (hours <= 0 && minutes <= 0) return translate(language, "common.now");
  if (hours <= 0) return translate(language, "today.countdownMinutes", { minutes });
  return translate(language, "today.countdownHours", { hours, minutes });
}

/** The 12-hour clock string plus suffix, e.g. for a phone number or a log time. */
export function formatLogTime(time: string, language: Language = "en"): string {
  return formatTime(time, language);
}

/** "Today" / "Yesterday" / "Mon". */
export function formatRelativeDay(
  dateKey: string,
  todayKey: string,
  language: Language = "en",
): string {
  if (dateKey === todayKey) return translate(language, "history.today");
  const today = fromDateKey(todayKey);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey === formatKey(yesterday)) return translate(language, "history.yesterday");
  return formatWeekdayShort(dateKey, language);
}

function formatKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
