/**
 * Supabase data layer — intentionally not implemented yet.
 *
 * The app already talks to the repository interfaces in `../repositories`, so
 * going live only means filling in the bodies below with Supabase queries:
 *
 *   import { getSupabaseClient } from "@/lib/supabase/client";
 *   const { data, error } = await getSupabaseClient()!.from("medicines").select("*");
 *
 * Keep the entity shapes in `../types` unchanged so the screens need no edits.
 * No tables are created from this project: the schema lives in Supabase.
 */

import type {
  Caregiver,
  CaregiverInput,
  DoseLog,
  DoseLogInput,
  Medicine,
  MedicineInput,
  ScheduleItem,
  ScheduleItemInput,
} from "../types";
import type {
  CaregiverRepository,
  DataLayer,
  DoseLogRepository,
  Repository,
  ScheduleItemRepository,
  SettingsRepository,
} from "../repositories";

function pending(method: string): never {
  throw new Error(
    `CareDose: supabase ${method} is not implemented yet. Either fill in lib/data/supabase/supabaseDataLayer.ts or keep NEXT_PUBLIC_DATA_SOURCE=mock.`,
  );
}

function pendingRepository<TEntity, TInput>(entity: string): Repository<TEntity, TInput> {
  return {
    list: async () => pending(`${entity}.list`),
    get: async () => pending(`${entity}.get`),
    create: async () => pending(`${entity}.create`),
    update: async () => pending(`${entity}.update`),
    remove: async () => pending(`${entity}.remove`),
  };
}

export function createSupabaseDataLayer(): DataLayer {
  const medicines = pendingRepository<Medicine, MedicineInput>("medicines");

  const schedules: ScheduleItemRepository = {
    ...pendingRepository<ScheduleItem, ScheduleItemInput>("schedules"),
    listByMedicine: async () => pending("schedules.listByMedicine"),
  };

  const doseLogs: DoseLogRepository = {
    ...pendingRepository<DoseLog, DoseLogInput>("doseLogs"),
    listByDate: async () => pending("doseLogs.listByDate"),
    listBetween: async () => pending("doseLogs.listBetween"),
    find: async () => pending("doseLogs.find"),
    setStatus: async () => pending("doseLogs.setStatus"),
    clear: async () => pending("doseLogs.clear"),
  };

  const caregivers: CaregiverRepository = {
    ...pendingRepository<Caregiver, CaregiverInput>("caregivers"),
    findPrimary: async () => pending("caregivers.findPrimary"),
  };

  const settings: SettingsRepository = {
    get: async () => pending("settings.get"),
    update: async () => pending("settings.update"),
  };

  return { source: "supabase", medicines, schedules, doseLogs, caregivers, settings };
}
