/**
 * Small localStorage helper used by the mock data adapter.
 *
 * The API mirrors "tables" of rows plus a couple of single "records" so the
 * mock adapter looks like a real backend without pulling in a library. It only
 * ever runs in the browser; when storage is blocked (private mode, an embedded
 * webview) it falls back to an in-memory store so every screen still works.
 */

/** Namespace so CareDose never touches another app's keys. */
export const STORAGE_PREFIX = "caredose:";

/** Bumped when the stored shape changes; a mismatch triggers a re-seed. */
export const SCHEMA_VERSION = 1;

export const TABLES = {
  medicines: "medicines",
  scheduleItems: "scheduleItems",
  doseLogs: "doseLogs",
  caregivers: "caregivers",
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];

export const RECORDS = {
  settings: "settings",
  meta: "meta",
} as const;

export type RecordName = (typeof RECORDS)[keyof typeof RECORDS];

/** localStorage key for an entry, exported so the theme script can read it. */
export function storageKey(name: string): string {
  return `${STORAGE_PREFIX}${name}`;
}

/** Fallback used when localStorage is unavailable, so the UI keeps working. */
const memory = new Map<string, string>();

function localStorageOrNull(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // Storage access can throw in restricted browsing modes.
    return null;
  }
}

function readRaw(name: string): string | null {
  const store = localStorageOrNull();
  if (!store) return memory.get(name) ?? null;
  try {
    return store.getItem(storageKey(name));
  } catch {
    return memory.get(name) ?? null;
  }
}

function writeRaw(name: string, value: string): void {
  memory.set(name, value);
  const store = localStorageOrNull();
  if (!store) return;
  try {
    store.setItem(storageKey(name), value);
  } catch {
    // Quota errors must never break a screen; memory keeps the session going.
  }
}

export function readTable<T>(table: TableName): T[] | null {
  const raw = readRaw(table);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    // Corrupt data counts as "nothing stored yet".
    return null;
  }
}

export function writeTable<T>(table: TableName, rows: T[]): void {
  writeRaw(table, JSON.stringify(rows));
}

export function readRecord<T>(name: RecordName): T | null {
  const raw = readRaw(name);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeRecord<T>(name: RecordName, value: T): void {
  writeRaw(name, JSON.stringify(value));
}

/** Removes every CareDose key, used by "Reset sample data". */
export function clearStorage(): void {
  memory.clear();
  const store = localStorageOrNull();
  if (!store) return;
  const keys: string[] = [];
  for (let index = 0; index < store.length; index += 1) {
    const key = store.key(index);
    if (key && key.startsWith(STORAGE_PREFIX)) keys.push(key);
  }
  for (const key of keys) store.removeItem(key);
}

/** Unique id with a readable prefix, e.g. "med_1f3a4b5c". */
export function createId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${random}`;
}

/** ISO timestamp used for created/updated fields. */
export function nowIso(): string {
  return new Date().toISOString();
}
