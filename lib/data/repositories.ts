/**
 * Repository interfaces for the CareDose data layer.
 *
 * Every screen talks to these interfaces only, so swapping the mock adapter
 * for the Supabase adapter is the only change needed to go live.
 */

import type {
  Caregiver,
  CaregiverInput,
  DataSource,
  DoseLog,
  DoseLogInput,
  DoseStatus,
  Medicine,
  MedicineInput,
  ScheduleItem,
  ScheduleItemInput,
  Settings,
  SettingsInput,
} from "./types";

/** Standard CRUD shape shared by the simple entities. */
export interface Repository<TEntity, TInput, TPatch = Partial<TInput>> {
  list(): Promise<TEntity[]>;
  get(id: string): Promise<TEntity | null>;
  create(input: TInput): Promise<TEntity>;
  update(id: string, patch: TPatch): Promise<TEntity>;
  remove(id: string): Promise<void>;
}

export type MedicineRepository = Repository<Medicine, MedicineInput>;

export type ScheduleItemRepository = Repository<ScheduleItem, ScheduleItemInput> & {
  /** All schedule rows for one medicine, earliest time first. */
  listByMedicine(medicineId: string): Promise<ScheduleItem[]>;
};

export type DoseLogRepository = Repository<DoseLog, DoseLogInput> & {
  /** Every log for one local date key "YYYY-MM-DD". */
  listByDate(date: string): Promise<DoseLog[]>;
  /** Logs for the inclusive range of local date keys. */
  listBetween(fromDate: string, toDate: string): Promise<DoseLog[]>;
  /** The log for one schedule row on one date, or null when not answered. */
  find(scheduleItemId: string, date: string): Promise<DoseLog | null>;
  /** Creates or replaces the log for a schedule row on a date. */
  setStatus(scheduleItemId: string, date: string, status: DoseStatus): Promise<DoseLog>;
  /** Removes the log so the dose counts as not answered again. */
  clear(scheduleItemId: string, date: string): Promise<void>;
};

export type CaregiverRepository = Repository<Caregiver, CaregiverInput> & {
  /** The first caregiver with `isPrimary`, or null when none is set. */
  findPrimary(): Promise<Caregiver | null>;
};

/** The settings screen edits one single row. */
export interface SettingsRepository {
  get(): Promise<Settings>;
  update(patch: Partial<SettingsInput>): Promise<Settings>;
}

/** Everything the app needs from a backend, mock or real. */
export interface DataLayer {
  readonly source: DataSource;
  readonly medicines: MedicineRepository;
  readonly schedules: ScheduleItemRepository;
  readonly doseLogs: DoseLogRepository;
  readonly caregivers: CaregiverRepository;
  readonly settings: SettingsRepository;
}
