/**
 * Realistic sample data for the mock data adapter.
 *
 * The seed runs once, on the first read of an empty store, so every screen has
 * something sensible to show without a backend. Ids are fixed so re-seeding
 * after "Reset sample data" produces the same plan.
 */

import { lastDateKeys, runsOnDate, timeOfDayFromTime, toDateKey, toTimeKey } from "../time";
import {
  DEFAULT_MEAL_TIMES,
  TIMES_OF_DAY,
  type Caregiver,
  type DoseLog,
  type FoodRelation,
  type Medicine,
  type MedicineForm,
  type ScheduleItem,
  type Settings,
} from "../types";

interface SeedDose {
  time: string;
  dosage: string;
  food: FoodRelation;
}

interface SeedMedicine {
  id: string;
  name: string;
  strength: string;
  form: MedicineForm;
  notes: string;
  unitsRemaining: number | null;
  doses: SeedDose[];
}

/** Six everyday medicines that cover all four parts of the day. */
const SEED_MEDICINES: SeedMedicine[] = [
  {
    id: "med_levothyroxine",
    name: "Levothyroxine",
    strength: "50 mcg",
    form: "tablet",
    notes: "For thyroid. Take on an empty stomach.",
    unitsRemaining: 14,
    doses: [{ time: "07:00", dosage: "1 tablet", food: "before" }],
  },
  {
    id: "med_amlodipine",
    name: "Amlodipine",
    strength: "5 mg",
    form: "tablet",
    notes: "For blood pressure.",
    unitsRemaining: 26,
    doses: [{ time: "08:00", dosage: "1 tablet", food: "after" }],
  },
  {
    id: "med_metformin",
    name: "Metformin",
    strength: "500 mg",
    form: "tablet",
    notes: "For sugar. Twice a day.",
    unitsRemaining: 9,
    doses: [
      { time: "08:00", dosage: "1 tablet", food: "after" },
      { time: "19:00", dosage: "1 tablet", food: "after" },
    ],
  },
  {
    id: "med_calcium",
    name: "Calcium + Vitamin D3",
    strength: "500 mg",
    form: "tablet",
    notes: "For bones.",
    unitsRemaining: 30,
    doses: [{ time: "14:00", dosage: "1 tablet", food: "after" }],
  },
  {
    id: "med_atorvastatin",
    name: "Atorvastatin",
    strength: "10 mg",
    form: "tablet",
    notes: "For cholesterol.",
    unitsRemaining: 6,
    doses: [{ time: "21:30", dosage: "1 tablet", food: "after" }],
  },
  {
    id: "med_travoprost",
    name: "Travoprost eye drops",
    strength: "0.004%",
    form: "drops",
    notes: "For eye pressure. One drop in each eye.",
    unitsRemaining: null,
    doses: [{ time: "22:00", dosage: "1 drop each eye", food: "anytime" }],
  },
];

/**
 * Doses that were not taken, keyed by how many days ago it was (1 = yesterday).
 * Values are schedule ids shaped `${medicineId}_s${index}`.
 */
const MISSED_DOSES: Partial<Record<number, string[]>> = {
  6: ["med_metformin_s1"],
  4: ["med_atorvastatin_s0", "med_travoprost_s0"],
  3: ["med_calcium_s0"],
  2: ["med_metformin_s1"],
};

export interface SeedData {
  medicines: Medicine[];
  scheduleItems: ScheduleItem[];
  doseLogs: DoseLog[];
  caregivers: Caregiver[];
  settings: Settings;
}

/** Uses the phone's own preference the first time the app is opened. */
function preferredTheme(): Settings["theme"] {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function buildSeed(now: Date = new Date()): SeedData {
  const seededAt = now.toISOString();
  const medicines: Medicine[] = [];
  const scheduleItems: ScheduleItem[] = [];

  for (const seed of SEED_MEDICINES) {
    medicines.push({
      id: seed.id,
      name: seed.name,
      strength: seed.strength,
      form: seed.form,
      notes: seed.notes,
      unitsRemaining: seed.unitsRemaining,
      isActive: true,
      createdAt: seededAt,
      updatedAt: seededAt,
    });

    seed.doses.forEach((dose, index) => {
      scheduleItems.push({
        id: `${seed.id}_s${index}`,
        medicineId: seed.id,
        time: dose.time,
        timeOfDay: timeOfDayFromTime(dose.time),
        dosage: dose.dosage,
        food: dose.food,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        startDate: null,
        endDate: null,
        isActive: true,
        createdAt: seededAt,
        updatedAt: seededAt,
      });
    });
  }

  const caregivers: Caregiver[] = [
    {
      id: "cg_anita",
      name: "Anita",
      phone: "+91 98765 43210",
      isPrimary: true,
      createdAt: seededAt,
      updatedAt: seededAt,
    },
  ];

  const settings: Settings = {
    id: "settings",
    fontSize: "normal",
    language: "en",
    theme: preferredTheme(),
    mealTimes: { ...DEFAULT_MEAL_TIMES },
    primaryCaregiverId: caregivers[0]?.id ?? null,
    updatedAt: seededAt,
  };

  // A week of history: older days follow the missed-dose pattern above, while
  // today keeps the current and later parts of the day unanswered so the
  // patient has something to tap on the Today screen.
  const dateKeys = lastDateKeys(7, toDateKey(now));
  const today = dateKeys[dateKeys.length - 1];
  const currentGroup = TIMES_OF_DAY.indexOf(timeOfDayFromTime(toTimeKey(now)));
  const doseLogs: DoseLog[] = [];

  dateKeys.forEach((dateKey, index) => {
    const daysAgo = dateKeys.length - 1 - index;
    for (const item of scheduleItems) {
      if (!runsOnDate(item, dateKey)) continue;
      if (dateKey === today && TIMES_OF_DAY.indexOf(item.timeOfDay) >= currentGroup) {
        continue;
      }
      const missed = daysAgo > 0 && (MISSED_DOSES[daysAgo] ?? []).includes(item.id);
      doseLogs.push(makeLog(item, dateKey, missed ? "skipped" : "taken", now));
    }
  });

  return { medicines, scheduleItems, doseLogs, caregivers, settings };
}

function makeLog(
  item: ScheduleItem,
  dateKey: string,
  status: "taken" | "skipped",
  now: Date,
): DoseLog {
  const [hours, minutes] = item.time.split(":").map(Number);
  const recorded = new Date(now);
  if (dateKey !== toDateKey(now)) {
    const [year, month, day] = dateKey.split("-").map(Number);
    recorded.setFullYear(year ?? now.getFullYear(), (month ?? 1) - 1, day ?? 1);
  }
  // Taken doses are recorded a few minutes after the scheduled time.
  recorded.setHours(hours ?? 0, (minutes ?? 0) + (status === "taken" ? 4 : 50), 0, 0);

  return {
    id: `log_${item.id}_${dateKey}`,
    medicineId: item.medicineId,
    scheduleItemId: item.id,
    date: dateKey,
    time: item.time,
    status,
    recordedAt: recorded.toISOString(),
    updatedAt: recorded.toISOString(),
  };
}
