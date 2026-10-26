/**
 * localStorage-backed data layer.
 *
 * This is the adapter the app runs on today: every screen works with no
 * backend. It behaves like a small relational store — rows in tables, a radio
 * of find/set helpers — so the Supabase adapter can follow the same interfaces.
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
  Settings,
  SettingsInput,
} from "../types";
import { DEFAULT_MEAL_TIMES, DEFAULT_SETTINGS } from "../types";
import type {
  CaregiverRepository,
  DataLayer,
  DoseLogRepository,
  MedicineRepository,
  Repository,
  ScheduleItemRepository,
  SettingsRepository,
} from "../repositories";
import { compareTimes } from "../time";
import { buildSeed } from "./seed";
import {
  RECORDS,
  SCHEMA_VERSION,
  TABLES,
  createId,
  clearStorage,
  nowIso,
  readRecord,
  readTable,
  writeRecord,
  writeTable,
  type TableName,
} from "./storage";

interface StoreMeta {
  version: number;
  seededAt: string;
}

/** Writes the sample data the first time the app runs, or after a reset. */
function ensureSeeded(): void {
  const meta = readRecord<StoreMeta>(RECORDS.meta);
  if (meta && meta.version === SCHEMA_VERSION) return;

  const seed = buildSeed();
  writeTable(TABLES.medicines, seed.medicines);
  writeTable(TABLES.scheduleItems, seed.scheduleItems);
  writeTable(TABLES.doseLogs, seed.doseLogs);
  writeTable(TABLES.caregivers, seed.caregivers);
  writeRecord(RECORDS.settings, seed.settings);
  writeRecord(RECORDS.meta, { version: SCHEMA_VERSION, seededAt: nowIso() });
}

function readRows<T>(table: TableName): T[] {
  ensureSeeded();
  return readTable<T>(table) ?? [];
}

/** Standard CRUD over one table, shared by every simple entity. */
function createTableRepository<TEntity extends { id: string; updatedAt: string }, TInput>(
  table: TableName,
  idPrefix: string,
  sort?: (a: TEntity, b: TEntity) => number,
): Repository<TEntity, TInput> {
  const byId = (rows: TEntity[], id: string): TEntity => {
    const row = rows.find((candidate) => candidate.id === id);
    if (!row) throw new Error(`CareDose: no row with id "${id}" in "${table}".`);
    return row;
  };

  return {
    async list() {
      const rows = readRows<TEntity>(table);
      return sort ? [...rows].sort(sort) : rows;
    },
    async get(id) {
      return readRows<TEntity>(table).find((row) => row.id === id) ?? null;
    },
    async create(input) {
      const rows = readRows<TEntity>(table);
      const timestamp = nowIso();
      const row = {
        ...input,
        id: createId(idPrefix),
        createdAt: timestamp,
        updatedAt: timestamp,
      } as unknown as TEntity;
      writeTable(table, [...rows, row]);
      return row;
    },
    async update(id, patch) {
      const rows = readRows<TEntity>(table);
      const current = byId(rows, id);
      const next = { ...current, ...patch, id, updatedAt: nowIso() } as TEntity;
      writeTable(
        table,
        rows.map((row) => (row.id === id ? next : row)),
      );
      return next;
    },
    async remove(id) {
      const rows = readRows<TEntity>(table);
      writeTable(
        table,
        rows.filter((row) => row.id !== id),
      );
    },
  };
}

const byMedicineName = (a: Medicine, b: Medicine): number => a.name.localeCompare(b.name);

const byTimeThenMedicine = (a: ScheduleItem, b: ScheduleItem): number =>
  a.medicineId === b.medicineId
    ? compareTimes(a.time, b.time)
    : a.medicineId.localeCompare(b.medicineId);

function createScheduleRepository(): ScheduleItemRepository {
  const base = createTableRepository<ScheduleItem, ScheduleItemInput>(
    TABLES.scheduleItems,
    "sch",
    byTimeThenMedicine,
  );

  return {
    ...base,
    async listByMedicine(medicineId) {
      const rows = await base.list();
      return rows
        .filter((row) => row.medicineId === medicineId)
        .sort((a, b) => compareTimes(a.time, b.time));
    },
  };
}

function createMedicineRepository(): MedicineRepository {
  const base = createTableRepository<Medicine, MedicineInput>(
    TABLES.medicines,
    "med",
    byMedicineName,
  );

  return {
    ...base,
    async remove(id) {
      // Removing a medicine also clears its times. Past dose records stay so
      // the History screen keeps the medicine name.
      await base.remove(id);
      const schedules = readRows<ScheduleItem>(TABLES.scheduleItems);
      writeTable(
        TABLES.scheduleItems,
        schedules.filter((row) => row.medicineId !== id),
      );
    },
  };
}

function createDoseLogRepository(): DoseLogRepository {
  const base = createTableRepository<DoseLog, DoseLogInput>(TABLES.doseLogs, "log");

  const sorted = (rows: DoseLog[]): DoseLog[] => [...rows].sort((a, b) => compareTimes(a.time, b.time));

  return {
    ...base,
    async list() {
      return sorted(await base.list());
    },
    async listByDate(date) {
      const rows = await base.list();
      return sorted(rows.filter((row) => row.date === date));
    },
    async listBetween(fromDate, toDate) {
      const rows = await base.list();
      return sorted(rows.filter((row) => row.date >= fromDate && row.date <= toDate));
    },
    async find(scheduleItemId, date) {
      const rows = await base.list();
      return (
        rows.find((row) => row.scheduleItemId === scheduleItemId && row.date === date) ?? null
      );
    },
    async setStatus(scheduleItemId, date, status) {
      const rows = readRows<DoseLog>(TABLES.doseLogs);
      const existing = rows.find(
        (row) => row.scheduleItemId === scheduleItemId && row.date === date,
      );
      const timestamp = nowIso();

      if (!existing) {
        const schedule = readRows<ScheduleItem>(TABLES.scheduleItems).find(
          (row) => row.id === scheduleItemId,
        );
        const created: DoseLog = {
          id: createId("log"),
          medicineId: schedule?.medicineId ?? "",
          scheduleItemId,
          date,
          time: schedule?.time ?? "00:00",
          status,
          recordedAt: timestamp,
          updatedAt: timestamp,
        };
        writeTable(TABLES.doseLogs, [...rows, created]);
        return created;
      }

      const next: DoseLog = { ...existing, status, recordedAt: timestamp, updatedAt: timestamp };
      writeTable(
        TABLES.doseLogs,
        rows.map((row) => (row.id === existing.id ? next : row)),
      );
      return next;
    },
    async clear(scheduleItemId, date) {
      const rows = readRows<DoseLog>(TABLES.doseLogs);
      writeTable(
        TABLES.doseLogs,
        rows.filter((row) => !(row.scheduleItemId === scheduleItemId && row.date === date)),
      );
    },
  };
}

function createCaregiverRepository(): CaregiverRepository {
  const base = createTableRepository<Caregiver, CaregiverInput>(TABLES.caregivers, "cg");

  return {
    ...base,
    async findPrimary() {
      const rows = await base.list();
      return rows.find((row) => row.isPrimary) ?? rows[0] ?? null;
    },
  };
}

function createSettingsRepository(): SettingsRepository {
  const readSettings = (): Settings => {
    ensureSeeded();
    const stored = readRecord<Settings>(RECORDS.settings);
    if (!stored) return { ...DEFAULT_SETTINGS, id: "settings", updatedAt: nowIso() };
    return { ...stored, mealTimes: { ...DEFAULT_MEAL_TIMES, ...stored.mealTimes } };
  };

  return {
    async get() {
      return readSettings();
    },
    async update(patch: Partial<SettingsInput>) {
      const current = readSettings();
      const next: Settings = {
        ...current,
        ...patch,
        mealTimes: patch.mealTimes
          ? { ...current.mealTimes, ...patch.mealTimes }
          : current.mealTimes,
        id: current.id,
        updatedAt: nowIso(),
      };
      writeRecord(RECORDS.settings, next);
      return next;
    },
  };
}

/** Removes every CareDose key and writes the sample data again. */
export function resetMockStorage(): void {
  clearStorage();
  ensureSeeded();
}

export function createMockDataLayer(): DataLayer {
  return {
    source: "mock",
    medicines: createMedicineRepository(),
    schedules: createScheduleRepository(),
    doseLogs: createDoseLogRepository(),
    caregivers: createCaregiverRepository(),
    settings: createSettingsRepository(),
  };
}
