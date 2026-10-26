"use client";

/**
 * Holds everything the screens read: medicines, their times, dose records and
 * caregivers. Screens call the small actions here instead of touching the data
 * layer, so switching to Supabase cannot change any screen behaviour.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getDataLayer, resetDemoData } from "@/lib/data";
import { lastDateKeys, runsOnDate, timeOfDayFromTime, todayKey } from "@/lib/data/time";
import type {
  Caregiver,
  DoseLog,
  DoseStatus,
  Medicine,
  MedicineDraft,
  ScheduleItem,
} from "@/lib/data/types";

/** How much dose history is kept in memory (the History screen shows 7 days). */
const HISTORY_DAYS = 30;

type LoadStatus = "loading" | "ready" | "error";

/** Everything the app reads at once. */
interface Snapshot {
  medicines: Medicine[];
  scheduleItems: ScheduleItem[];
  doseLogs: DoseLog[];
  caregivers: Caregiver[];
}

/**
 * Reads the whole plan and the recent dose history in one go. Kept outside the
 * component so it touches no React state: the caller decides what to do with it.
 */
async function fetchSnapshot(): Promise<Snapshot> {
  const layer = getDataLayer();
  const dateKeys = lastDateKeys(HISTORY_DAYS);
  const [medicines, scheduleItems, caregivers, doseLogs] = await Promise.all([
    layer.medicines.list(),
    layer.schedules.list(),
    layer.caregivers.list(),
    layer.doseLogs.listBetween(dateKeys[0] ?? todayKey(), todayKey()),
  ]);
  return { medicines, scheduleItems, doseLogs, caregivers };
}

interface CareDataValue {
  status: LoadStatus;
  error: string | null;
  medicines: Medicine[];
  scheduleItems: ScheduleItem[];
  doseLogs: DoseLog[];
  caregivers: Caregiver[];
  primaryCaregiver: Caregiver | null;
  /** Records "I TOOK IT" or a skipped dose for one day. */
  setDoseStatus: (scheduleItemId: string, date: string, status: DoseStatus) => Promise<void>;
  /** Undo: the dose counts as unanswered again. */
  clearDose: (scheduleItemId: string, date: string) => Promise<void>;
  /** Creates or updates a medicine together with its times. */
  saveMedicine: (draft: MedicineDraft, medicineId?: string) => Promise<void>;
  /** Removes a medicine from the plan, keeping its past records. */
  deleteMedicine: (medicineId: string) => Promise<void>;
  saveCaregiver: (input: { name: string; phone: string }) => Promise<void>;
  /** Wipes the device data and writes the sample data again. */
  resetSampleData: () => Promise<void>;
  /** Tries the initial load again after a failure. */
  retry: () => Promise<void>;
}

const CareDataContext = createContext<CareDataValue | null>(null);

export function CareDataProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot>({
    medicines: [],
    scheduleItems: [],
    doseLogs: [],
    caregivers: [],
  });

  const applySnapshot = useCallback((next: Snapshot) => {
    setSnapshot(next);
  }, []);

  const refresh = useCallback(async () => {
    applySnapshot(await fetchSnapshot());
  }, [applySnapshot]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const next = await fetchSnapshot();
        if (!active) return;
        applySnapshot(next);
        setError(null);
        setStatus("ready");
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus("error");
      }
    })();
    return () => {
      active = false;
    };
  }, [applySnapshot]);

  const retry = useCallback(async () => {
    try {
      await refresh();
      setError(null);
      setStatus("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("error");
    }
  }, [refresh]);

  const setDoseStatus = useCallback(
    async (scheduleItemId: string, date: string, next: DoseStatus) => {
      const saved = await getDataLayer().doseLogs.setStatus(scheduleItemId, date, next);
      setSnapshot((previous) => ({
        ...previous,
        doseLogs: [...previous.doseLogs.filter((log) => log.id !== saved.id), saved],
      }));
    },
    [],
  );

  const clearDose = useCallback(async (scheduleItemId: string, date: string) => {
    await getDataLayer().doseLogs.clear(scheduleItemId, date);
    setSnapshot((previous) => ({
      ...previous,
      doseLogs: previous.doseLogs.filter(
        (log) => !(log.scheduleItemId === scheduleItemId && log.date === date),
      ),
    }));
  }, []);

  const saveMedicine = useCallback(
    async (draft: MedicineDraft, medicineId?: string) => {
      const layer = getDataLayer();
      const fields = {
        name: draft.name.trim(),
        strength: draft.strength.trim(),
        form: draft.form,
        notes: draft.notes.trim(),
        unitsRemaining: draft.unitsRemaining,
        isActive: true,
      };

      const medicine = medicineId
        ? await layer.medicines.update(medicineId, fields)
        : await layer.medicines.create(fields);

      const existing = await layer.schedules.listByMedicine(medicine.id);
      const wantedTimes = [...new Set(draft.times)].sort();

      // Rows whose time has not changed keep their id, so the dose history of
      // that time stays linked to the same schedule row.
      for (const time of wantedTimes) {
        const match = existing.find((item) => item.time === time);
        const timeFields = {
          medicineId: medicine.id,
          time,
          timeOfDay: timeOfDayFromTime(time),
          dosage: draft.dosage.trim() || "1",
          food: draft.food,
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          isActive: true,
        };
        if (match) await layer.schedules.update(match.id, timeFields);
        else await layer.schedules.create({ ...timeFields, startDate: null, endDate: null });
      }

      for (const item of existing) {
        if (!wantedTimes.includes(item.time)) await layer.schedules.remove(item.id);
      }

      await refresh();
    },
    [refresh],
  );

  const deleteMedicine = useCallback(
    async (medicineId: string) => {
      const layer = getDataLayer();
      // Soft delete: the medicine leaves the plan but History keeps its name.
      await layer.medicines.update(medicineId, { isActive: false });
      const items = await layer.schedules.listByMedicine(medicineId);
      for (const item of items) await layer.schedules.update(item.id, { isActive: false });
      await refresh();
    },
    [refresh],
  );

  const saveCaregiver = useCallback(
    async (input: { name: string; phone: string }) => {
      const layer = getDataLayer();
      const existing = await layer.caregivers.findPrimary();
      const next = existing
        ? await layer.caregivers.update(existing.id, { ...input, isPrimary: true })
        : await layer.caregivers.create({ ...input, isPrimary: true });

      await layer.settings.update({ primaryCaregiverId: next.id });
      await refresh();
    },
    [refresh],
  );

  const resetSampleData = useCallback(async () => {
    resetDemoData();
    await refresh();
  }, [refresh]);

  const primaryCaregiver = useMemo(
    () =>
      snapshot.caregivers.find((caregiver) => caregiver.isPrimary) ??
      snapshot.caregivers[0] ??
      null,
    [snapshot.caregivers],
  );

  const value = useMemo<CareDataValue>(
    () => ({
      status,
      error,
      medicines: snapshot.medicines.filter((medicine) => medicine.isActive),
      scheduleItems: snapshot.scheduleItems.filter((item) => item.isActive),
      doseLogs: snapshot.doseLogs,
      caregivers: snapshot.caregivers,
      primaryCaregiver,
      setDoseStatus,
      clearDose,
      saveMedicine,
      deleteMedicine,
      saveCaregiver,
      resetSampleData,
      retry,
    }),
    [
      status,
      error,
      snapshot,
      primaryCaregiver,
      setDoseStatus,
      clearDose,
      saveMedicine,
      deleteMedicine,
      saveCaregiver,
      resetSampleData,
      retry,
    ],
  );

  return <CareDataContext.Provider value={value}>{children}</CareDataContext.Provider>;
}

export function useCareData(): CareDataValue {
  const value = useContext(CareDataContext);
  if (!value) throw new Error("useCareData must be used inside <AppProviders>.");
  return value;
}

/** One dose of the day: its time, the medicine behind it and what happened. */
export interface DoseForDate {
  schedule: ScheduleItem;
  medicine: Medicine;
  log: DoseLog | null;
}

/** Schedules that run on a given local date, paired with their medicine. */
export function useDosesForDate(dateKey: string): DoseForDate[] {
  const { medicines, scheduleItems, doseLogs } = useCareData();

  return useMemo(() => {
    const byId = new Map(medicines.map((medicine) => [medicine.id, medicine]));
    return scheduleItems
      .filter((item) => runsOnDate(item, dateKey))
      .map((item): DoseForDate | null => {
        const medicine = byId.get(item.medicineId);
        if (!medicine) return null;
        return {
          schedule: item,
          medicine,
          log:
            doseLogs.find((log) => log.scheduleItemId === item.id && log.date === dateKey) ?? null,
        };
      })
      .filter((dose): dose is DoseForDate => dose !== null)
      .sort((a, b) =>
        a.schedule.time === b.schedule.time
          ? a.schedule.id.localeCompare(b.schedule.id)
          : a.schedule.time.localeCompare(b.schedule.time),
      );
  }, [medicines, scheduleItems, doseLogs, dateKey]);
}
