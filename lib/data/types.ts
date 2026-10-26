/**
 * Shared types for the CareDose data layer.
 *
 * These types are the contract between the screens and whatever stores the
 * data: today the localStorage mock adapter, later the Supabase adapter.
 * Nothing here talks to a network or a database.
 */

/* -------------------------------------------------------------------------- */
/* Enumerations                                                               */
/* -------------------------------------------------------------------------- */

/** Where a data layer implementation gets its data from. */
export const DATA_SOURCES = ["mock", "supabase"] as const;
export type DataSource = (typeof DATA_SOURCES)[number];

/** Kind of medicine, used for labels and icons. */
export const MEDICINE_FORMS = [
  "tablet",
  "capsule",
  "syrup",
  "drops",
  "injection",
  "cream",
  "inhaler",
] as const;
export type MedicineForm = (typeof MEDICINE_FORMS)[number];

/** The four parts of the day the Today screen is grouped by. */
export const TIMES_OF_DAY = ["morning", "afternoon", "evening", "night"] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];

/** Whether a dose is taken around a meal. */
export const FOOD_RELATIONS = ["before", "after", "anytime"] as const;
export type FoodRelation = (typeof FOOD_RELATIONS)[number];

/** Recorded outcome of a scheduled dose. A dose with no log is still pending. */
export const DOSE_STATUSES = ["taken", "skipped"] as const;
export type DoseStatus = (typeof DOSE_STATUSES)[number];

/** Text size preference (scales the whole app). */
export const FONT_SIZES = ["normal", "large", "xlarge"] as const;
export type FontSize = (typeof FONT_SIZES)[number];

/** Interface language. */
export const LANGUAGES = ["en", "hi"] as const;
export type Language = (typeof LANGUAGES)[number];

/** Light or dark theme. */
export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/* -------------------------------------------------------------------------- */
/* Entities                                                                   */
/* -------------------------------------------------------------------------- */

/** A medicine the patient keeps at home. */
export interface Medicine {
  id: string;
  /** Display name, e.g. "Amlodipine". */
  name: string;
  /** Dose strength as printed on the pack, e.g. "5 mg". Empty when unknown. */
  strength: string;
  form: MedicineForm;
  /** Free-text note, e.g. "for blood pressure". Empty when unused. */
  notes: string;
  /** How many units are left in the pack, or null when not tracked. */
  unitsRemaining: number | null;
  /** Inactive medicines stay in History but are hidden from today's plan. */
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Everything needed to create a medicine (id and timestamps are generated). */
export type MedicineInput = Omit<Medicine, "id" | "createdAt" | "updatedAt">;

/** One time in the day a medicine is taken. */
export interface ScheduleItem {
  id: string;
  medicineId: string;
  /** Local wall-clock time, 24h "HH:mm". */
  time: string;
  /** Which part of the day the time belongs to (derived from `time`). */
  timeOfDay: TimeOfDay;
  /** Amount for a single dose, e.g. "1 tablet". */
  dosage: string;
  food: FoodRelation;
  /** 0 = Sunday … 6 = Saturday. All seven days means "every day". */
  daysOfWeek: number[];
  /** Local date key "YYYY-MM-DD" the schedule starts, or null for "always". */
  startDate: string | null;
  /** Local date key "YYYY-MM-DD" the schedule ends, or null for "no end". */
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Everything needed to create a schedule item. */
export type ScheduleItemInput = Omit<ScheduleItem, "id" | "createdAt" | "updatedAt">;

/** A record of what happened to one scheduled dose on one day. */
export interface DoseLog {
  id: string;
  medicineId: string;
  scheduleItemId: string;
  /** Local date key "YYYY-MM-DD" the dose was scheduled for. */
  date: string;
  /** Local time "HH:mm" the dose was scheduled for. */
  time: string;
  status: DoseStatus;
  /** ISO timestamp of when the patient answered. */
  recordedAt: string;
  updatedAt: string;
}

/** Everything needed to create a dose log. */
export type DoseLogInput = Omit<DoseLog, "id" | "updatedAt">;

/** A family member or friend the app can reach out to. */
export interface Caregiver {
  id: string;
  name: string;
  phone: string;
  /** The caregiver shown first on reminders. */
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Everything needed to create a caregiver. */
export type CaregiverInput = Omit<Caregiver, "id" | "createdAt" | "updatedAt">;

/** Times of the day the patient usually eats, used for reminder copy. */
export interface MealTimes {
  breakfast: string;
  lunch: string;
  dinner: string;
  bedtime: string;
}

/** The single row of app preferences. */
export interface Settings {
  id: string;
  fontSize: FontSize;
  language: Language;
  theme: Theme;
  mealTimes: MealTimes;
  /** Caregiver shown first; also edited from the Settings screen. */
  primaryCaregiverId: string | null;
  updatedAt: string;
}

/** Everything that can be changed on the settings row. */
export type SettingsInput = Omit<Settings, "id" | "updatedAt">;

/**
 * A medicine together with the times it is taken, which is how the Add /
 * Edit Medicine form works.
 */
export interface MedicineDraft {
  name: string;
  strength: string;
  form: MedicineForm;
  dosage: string;
  food: FoodRelation;
  notes: string;
  unitsRemaining: number | null;
  /** One entry per time of day, 24h "HH:mm". At least one is required. */
  times: string[];
  /**
   * First local date "YYYY-MM-DD" the course runs. Undefined keeps whatever
   * range an existing schedule already has; null means "always".
   */
  startDate?: string | null;
  /** Last local date for the course, or null/undefined for no end date. */
  endDate?: string | null;
}

/** Defaults used when storage is empty or settings cannot be read. */
export const DEFAULT_MEAL_TIMES: MealTimes = {
  breakfast: "08:00",
  lunch: "13:00",
  dinner: "19:30",
  bedtime: "22:00",
};

export const DEFAULT_SETTINGS: SettingsInput = {
  fontSize: "normal",
  language: "en",
  theme: "light",
  mealTimes: DEFAULT_MEAL_TIMES,
  primaryCaregiverId: null,
};
