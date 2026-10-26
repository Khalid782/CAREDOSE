/**
 * The single switch between the mock data and Supabase.
 *
 * Set NEXT_PUBLIC_DATA_SOURCE=supabase in .env.local once the Supabase adapter
 * is filled in; anything else (or unset) keeps the app on the mock adapter.
 */

import { createMockDataLayer, resetMockStorage } from "./mock/mockDataLayer";
import { createSupabaseDataLayer } from "./supabase/supabaseDataLayer";
import type { DataLayer } from "./repositories";
import type { DataSource } from "./types";

export function getDataSource(): DataSource {
  return process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase" ? "supabase" : "mock";
}

let cached: DataLayer | null = null;
let cachedSource: DataSource | null = null;

/** The active data layer, created once per source. */
export function getDataLayer(): DataLayer {
  const source = getDataSource();
  if (!cached || cachedSource !== source) {
    cached = source === "supabase" ? createSupabaseDataLayer() : createMockDataLayer();
    cachedSource = source;
  }
  return cached;
}

/** Wipes the mock store and writes fresh sample data (no-op for Supabase). */
export function resetDemoData(): void {
  if (getDataSource() !== "mock") return;
  resetMockStorage();
  cached = null;
  cachedSource = null;
}

export * from "./types";
export type {
  CaregiverRepository,
  DataLayer,
  DoseLogRepository,
  MedicineRepository,
  Repository,
  ScheduleItemRepository,
  SettingsRepository,
} from "./repositories";
