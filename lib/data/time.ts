/**
 * Local-time helpers shared by the data layer and the screens.
 *
 * Everything is stored with local wall-clock values ("08:00" and "2026-10-26")
 * so the app keeps working on a phone with no network and no server timezone.
 */

import { TIMES_OF_DAY, type TimeOfDay } from "./types";

const pad = (value: number): string => String(value).padStart(2, "0");

/** Local date key, e.g. "2026-10-26". Never uses UTC. */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local time key, e.g. "08:05". */
export function toTimeKey(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parses "YYYY-MM-DD" into a local Date at midnight. */
export function fromDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

/** Today's local date key. */
export function todayKey(): string {
  return toDateKey(new Date());
}

/** A new date `days` away from `date` (negative goes back in time). */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** The last `count` local date keys, oldest first, ending with `endDateKey`. */
export function lastDateKeys(count: number, endDateKey: string = todayKey()): string[] {
  const end = fromDateKey(endDateKey);
  const keys: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    keys.push(toDateKey(addDays(end, -offset)));
  }
  return keys;
}

/** Minutes since local midnight for "HH:mm". */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

/** "HH:mm" from minutes since local midnight. */
export function minutesToTime(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
}

/** The exact local Date a dose on `dateKey` at `time` is due. */
export function scheduledAt(dateKey: string, time: string): Date {
  const date = fromDateKey(dateKey);
  const minutes = timeToMinutes(time);
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
}

/**
 * Which part of the day a time belongs to. Used to group the Today screen and
 * to place a new medicine time automatically.
 */
export function timeOfDayFromTime(time: string): TimeOfDay {
  const minutes = timeToMinutes(time);
  if (minutes >= 300 && minutes < 720) return "morning"; // 05:00 – 11:59
  if (minutes >= 720 && minutes < 1020) return "afternoon"; // 12:00 – 16:59
  if (minutes >= 1020 && minutes < 1260) return "evening"; // 17:00 – 20:59
  return "night"; // 21:00 – 04:59
}

/** Order used everywhere the day is grouped. */
export const TIME_OF_DAY_ORDER = TIMES_OF_DAY;

/** Sort helper: by "HH:mm" ascending. */
export function compareTimes(a: string, b: string): number {
  return timeToMinutes(a) - timeToMinutes(b);
}

/** Splits a duration into whole hours and minutes (never negative). */
export function splitDuration(ms: number): { hours: number; minutes: number } {
  const total = Math.max(0, Math.floor(ms / 60000));
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

/** Does this schedule run on the given weekday (0 = Sunday)? */
export function runsOnWeekday(daysOfWeek: readonly number[], weekday: number): boolean {
  return daysOfWeek.length === 0 || daysOfWeek.includes(weekday);
}

/** Is this schedule active on the given local date key? */
export function runsOnDate(
  schedule: { startDate: string | null; endDate: string | null; daysOfWeek: readonly number[] },
  dateKey: string,
): boolean {
  if (schedule.startDate && dateKey < schedule.startDate) return false;
  if (schedule.endDate && dateKey > schedule.endDate) return false;
  return runsOnWeekday(schedule.daysOfWeek, fromDateKey(dateKey).getDay());
}
