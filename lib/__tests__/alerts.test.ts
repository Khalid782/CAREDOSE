import { describe, expect, it } from "vitest";
import {
  ALARM_REPEAT_MS,
  ALERT_MAX_LATENESS_MS,
  SNOOZE_MS,
  findDueDose,
  toDoseAlert,
  type DoseAlert,
} from "@/lib/alerts";
import { scheduledAt } from "@/lib/data/time";
import type { DoseLog, Medicine, ScheduleItem } from "@/lib/data/types";
import type { PlannedDose } from "@/lib/schedule";

const medicine: Medicine = {
  id: "med_metformin",
  name: "Metformin",
  strength: "500 mg",
  form: "tablet",
  notes: "",
  unitsRemaining: null,
  isActive: true,
  createdAt: "2026-10-26T00:00:00.000Z",
  updatedAt: "2026-10-26T00:00:00.000Z",
};

const schedule: ScheduleItem = {
  id: "sch_metformin",
  medicineId: medicine.id,
  time: "08:00",
  timeOfDay: "morning",
  dosage: "1 tablet",
  food: "after",
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  startDate: null,
  endDate: null,
  isActive: true,
  createdAt: "2026-10-26T00:00:00.000Z",
  updatedAt: "2026-10-26T00:00:00.000Z",
};

function planned(overrides: Partial<PlannedDose> = {}): PlannedDose {
  return {
    id: "sch_metformin@2026-10-26",
    date: "2026-10-26",
    time: "08:00",
    timeOfDay: "morning",
    instruction: "Take 1 tablet of Metformin 500 mg after breakfast.",
    meal: "breakfast",
    schedule,
    medicine,
    log: null,
    ...overrides,
  };
}

function log(status: DoseLog["status"]): DoseLog {
  return {
    id: "log_1",
    medicineId: medicine.id,
    scheduleItemId: schedule.id,
    date: "2026-10-26",
    time: "08:00",
    status,
    recordedAt: "2026-10-26T08:04:00.000Z",
    updatedAt: "2026-10-26T08:04:00.000Z",
  };
}

const dueAt = scheduledAt("2026-10-26", "08:00").getTime();

describe("findDueDose", () => {
  it("returns a dose exactly at its time", () => {
    expect(findDueDose([planned()], dueAt)?.id).toBe("sch_metformin@2026-10-26");
  });

  it("does not return a dose before its time", () => {
    expect(findDueDose([planned()], dueAt - 1000)).toBeNull();
  });

  it("skips doses that already have a log", () => {
    expect(findDueDose([planned({ log: log("taken") })], dueAt)).toBeNull();
    expect(findDueDose([planned({ log: log("skipped") })], dueAt)).toBeNull();
  });

  it("still alarms for a dose 30 minutes late", () => {
    expect(findDueDose([planned()], dueAt + 30 * 60 * 1000)).not.toBeNull();
  });

  it("leaves very old doses to the missed-dose nudge", () => {
    expect(findDueDose([planned()], dueAt + ALERT_MAX_LATENESS_MS + 1)).toBeNull();
  });

  it("honours a snooze until it expires", () => {
    const snoozedUntil = { "sch_metformin@2026-10-26": dueAt + SNOOZE_MS };
    expect(findDueDose([planned()], dueAt + 5 * 60 * 1000, snoozedUntil)).toBeNull();
    expect(findDueDose([planned()], dueAt + SNOOZE_MS + 1, snoozedUntil)).not.toBeNull();
  });

  it("picks the earliest due dose", () => {
    const later = planned({
      id: "sch_metformin_late@2026-10-26",
      time: "09:00",
      schedule: { ...schedule, id: "sch_metformin_late", time: "09:00" },
    });
    expect(findDueDose([later, planned()], dueAt + 1)?.time).toBe("08:00");
  });
});

describe("alarm constants", () => {
  it("repeats every five minutes and snoozes for ten", () => {
    expect(ALARM_REPEAT_MS).toBe(5 * 60 * 1000);
    expect(SNOOZE_MS).toBe(10 * 60 * 1000);
  });
});

describe("toDoseAlert", () => {
  it("carries the medicine, instruction and due time", () => {
    const alert: DoseAlert = toDoseAlert(planned(), "en");

    expect(alert).toMatchObject({
      id: "sch_metformin@2026-10-26",
      scheduleItemId: "sch_metformin",
      medicineName: "Metformin",
      instruction: "Take 1 tablet of Metformin 500 mg after breakfast.",
      dueAt,
      language: "en",
    });
  });
});
