import { describe, expect, it } from "vitest";
import {
  DEFAULT_MEAL_TIMES,
  type DoseLog,
  type Medicine,
  type ScheduleItem,
} from "@/lib/data/types";
import {
  buildDosePlan,
  dateRangeForDuration,
  describeDose,
  mealAnchorForTime,
  timesForPrescription,
} from "../schedule";

function makeMedicine(overrides: Partial<Medicine> = {}): Medicine {
  return {
    id: "med_metformin",
    name: "Metformin",
    strength: "500 mg",
    form: "tablet",
    notes: "",
    unitsRemaining: null,
    isActive: true,
    createdAt: "2026-10-26T00:00:00.000Z",
    updatedAt: "2026-10-26T00:00:00.000Z",
    ...overrides,
  };
}

function makeSchedule(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id: "sch_metformin_morning",
    medicineId: "med_metformin",
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
    ...overrides,
  };
}

describe("describeDose", () => {
  it("writes the example sentence for a breakfast dose", () => {
    expect(
      describeDose({
        medicine: makeMedicine(),
        schedule: makeSchedule(),
        mealTimes: DEFAULT_MEAL_TIMES,
      }),
    ).toBe("Take 1 tablet of Metformin 500 mg after breakfast.");
  });

  it("uses 'before breakfast' for an empty-stomach medicine", () => {
    expect(
      describeDose({
        medicine: makeMedicine({
          name: "Levothyroxine",
          strength: "50 mcg",
        }),
        schedule: makeSchedule({ time: "07:00", timeOfDay: "morning", food: "before" }),
        mealTimes: DEFAULT_MEAL_TIMES,
      }),
    ).toBe("Take 1 tablet of Levothyroxine 50 mcg before breakfast.");
  });

  it("matches a 19:00 dose to dinner", () => {
    expect(
      describeDose({
        medicine: makeMedicine(),
        schedule: makeSchedule({ time: "19:00", timeOfDay: "evening" }),
        mealTimes: DEFAULT_MEAL_TIMES,
      }),
    ).toBe("Take 1 tablet of Metformin 500 mg after dinner.");
  });

  it("uses bedtime wording for a night dose", () => {
    expect(
      describeDose({
        medicine: makeMedicine({
          name: "Travoprost eye drops",
          strength: "0.004%",
        }),
        schedule: makeSchedule({
          time: "22:00",
          timeOfDay: "night",
          dosage: "1 drop each eye",
          food: "anytime",
        }),
        mealTimes: DEFAULT_MEAL_TIMES,
      }),
    ).toBe("Take 1 drop each eye of Travoprost eye drops 0.004% at bedtime.");
  });

  it("falls back to the clock time when no meal is close", () => {
    expect(
      describeDose({
        medicine: makeMedicine(),
        schedule: makeSchedule({ time: "16:00", timeOfDay: "afternoon" }),
        mealTimes: DEFAULT_MEAL_TIMES,
      }),
    ).toBe("Take 1 tablet of Metformin 500 mg after food at 4:00 PM.");
  });

  it("does not invent a meal for an anytime dose far from meals", () => {
    expect(
      describeDose({
        medicine: makeMedicine(),
        schedule: makeSchedule({ time: "16:00", timeOfDay: "afternoon", food: "anytime" }),
        mealTimes: DEFAULT_MEAL_TIMES,
      }),
    ).toBe("Take 1 tablet of Metformin 500 mg at 4:00 PM.");
  });

  it("omits an empty strength", () => {
    expect(
      describeDose({
        medicine: makeMedicine({ name: "Paracetamol", strength: "" }),
        schedule: makeSchedule(),
        mealTimes: DEFAULT_MEAL_TIMES,
      }),
    ).toBe("Take 1 tablet of Paracetamol after breakfast.");
  });

  it("writes a Hindi sentence", () => {
    const sentence = describeDose({
      medicine: makeMedicine(),
      schedule: makeSchedule(),
      mealTimes: DEFAULT_MEAL_TIMES,
      language: "hi",
    });

    expect(sentence).toContain("Metformin 500 mg");
    expect(sentence).toContain("नाश्ता");
    expect(sentence.endsWith("लें।")).toBe(true);
  });
});

describe("mealAnchorForTime", () => {
  it.each([
    ["08:00", "breakfast"],
    ["07:00", "breakfast"],
    ["13:00", "lunch"],
    ["19:00", "dinner"],
    ["22:00", "bedtime"],
    ["23:30", "bedtime"],
    ["16:00", null],
  ] as const)("maps %s to %s", (time, expected) => {
    expect(mealAnchorForTime(time, DEFAULT_MEAL_TIMES)).toBe(expected);
  });
});

describe("timesForPrescription", () => {
  const base = { frequency: "od" as const, dosePattern: null, meal: null };

  it("uses breakfast for a once-a-day medicine", () => {
    expect(timesForPrescription({ ...base, meal: "breakfast" }, DEFAULT_MEAL_TIMES)).toEqual([
      "08:00",
    ]);
  });

  it("uses bedtime for a nightly once-a-day medicine", () => {
    expect(timesForPrescription({ ...base, meal: "bedtime" }, DEFAULT_MEAL_TIMES)).toEqual([
      "22:00",
    ]);
  });

  it("uses breakfast and dinner for BD", () => {
    expect(
      timesForPrescription({ ...base, frequency: "bd" }, DEFAULT_MEAL_TIMES),
    ).toEqual(["08:00", "19:30"]);
  });

  it("uses all three meals for TDS", () => {
    expect(
      timesForPrescription({ ...base, frequency: "tds" }, DEFAULT_MEAL_TIMES),
    ).toEqual(["08:00", "13:00", "19:30"]);
  });

  it("adds bedtime for QID", () => {
    expect(
      timesForPrescription({ ...base, frequency: "qid" }, DEFAULT_MEAL_TIMES),
    ).toEqual(["08:00", "13:00", "19:30", "22:00"]);
  });

  it("turns 1-0-1 into breakfast and dinner", () => {
    expect(
      timesForPrescription(
        { ...base, frequency: "bd", dosePattern: [1, 0, 1] },
        DEFAULT_MEAL_TIMES,
      ),
    ).toEqual(["08:00", "19:30"]);
  });

  it("uses an explicit meal for a single active pattern slot", () => {
    expect(
      timesForPrescription(
        { ...base, dosePattern: [1, 0, 0], meal: "lunch" },
        DEFAULT_MEAL_TIMES,
      ),
    ).toEqual(["13:00"]);
  });

  it("maps a three-part pattern to the three meals", () => {
    expect(
      timesForPrescription(
        { ...base, frequency: "tds", dosePattern: [1, 1, 1] },
        DEFAULT_MEAL_TIMES,
      ),
    ).toEqual(["08:00", "13:00", "19:30"]);
  });
});

describe("dateRangeForDuration", () => {
  it("includes the start day in a course length", () => {
    expect(dateRangeForDuration(5, "2026-10-26")).toEqual({
      startDate: "2026-10-26",
      endDate: "2026-10-30",
    });
  });

  it("treats a one-day course as a single date", () => {
    expect(dateRangeForDuration(1, "2026-10-26")).toEqual({
      startDate: "2026-10-26",
      endDate: "2026-10-26",
    });
  });

  it("returns an open range when no duration is known", () => {
    expect(dateRangeForDuration(null, "2026-10-26")).toEqual({
      startDate: null,
      endDate: null,
    });
    expect(dateRangeForDuration(0, "2026-10-26")).toEqual({
      startDate: null,
      endDate: null,
    });
  });
});

describe("buildDosePlan", () => {
  it("includes only dates inside a course", () => {
    const schedule = makeSchedule({ startDate: "2026-10-26", endDate: "2026-10-28" });
    const base = {
      medicines: [makeMedicine()],
      scheduleItems: [schedule],
      mealTimes: DEFAULT_MEAL_TIMES,
    };

    expect(buildDosePlan({ ...base, dateKey: "2026-10-26" })).toHaveLength(1);
    expect(buildDosePlan({ ...base, dateKey: "2026-10-28" })).toHaveLength(1);
    expect(buildDosePlan({ ...base, dateKey: "2026-10-29" })).toHaveLength(0);
    expect(buildDosePlan({ ...base, dateKey: "2026-10-25" })).toHaveLength(0);
  });

  it("honours weekdays", () => {
    const schedule = makeSchedule({ daysOfWeek: [1] });
    const base = {
      medicines: [makeMedicine()],
      scheduleItems: [schedule],
      mealTimes: DEFAULT_MEAL_TIMES,
    };

    expect(buildDosePlan({ ...base, dateKey: "2026-10-26" })).toHaveLength(1);
    expect(buildDosePlan({ ...base, dateKey: "2026-10-27" })).toHaveLength(0);
  });

  it("skips inactive rows and missing medicines", () => {
    const base = {
      medicines: [makeMedicine()],
      scheduleItems: [makeSchedule({ isActive: false })],
      mealTimes: DEFAULT_MEAL_TIMES,
    };
    expect(buildDosePlan({ ...base, dateKey: "2026-10-26" })).toHaveLength(0);

    expect(
      buildDosePlan({
        medicines: [makeMedicine({ isActive: false })],
        scheduleItems: [makeSchedule()],
        mealTimes: DEFAULT_MEAL_TIMES,
        dateKey: "2026-10-26",
      }),
    ).toHaveLength(0);

    expect(
      buildDosePlan({
        medicines: [],
        scheduleItems: [makeSchedule()],
        mealTimes: DEFAULT_MEAL_TIMES,
        dateKey: "2026-10-26",
      }),
    ).toHaveLength(0);
  });

  it("sorts by time and attaches the recorded dose", () => {
    const amlodipine = makeMedicine({
      id: "med_amlodipine",
      name: "Amlodipine",
      strength: "5 mg",
    });
    const log: DoseLog = {
      id: "log_1",
      medicineId: "med_metformin",
      scheduleItemId: "sch_metformin_morning",
      date: "2026-10-26",
      time: "08:00",
      status: "taken",
      recordedAt: "2026-10-26T08:04:00.000Z",
      updatedAt: "2026-10-26T08:04:00.000Z",
    };

    const plan = buildDosePlan({
      dateKey: "2026-10-26",
      medicines: [makeMedicine(), amlodipine],
      scheduleItems: [
        makeSchedule({
          id: "sch_amlodipine",
          medicineId: "med_amlodipine",
          time: "09:00",
          timeOfDay: "morning",
        }),
        makeSchedule(),
      ],
      doseLogs: [log],
      mealTimes: DEFAULT_MEAL_TIMES,
    });

    expect(plan.map((dose) => dose.medicine.name)).toEqual(["Metformin", "Amlodipine"]);
    expect(plan[0]?.log?.status).toBe("taken");
    expect(plan[0]?.instruction).toBe(
      "Take 1 tablet of Metformin 500 mg after breakfast.",
    );
    expect(plan[0]?.id).toBe("sch_metformin_morning@2026-10-26");
  });

  it("ignores a log from another date", () => {
    const log: DoseLog = {
      id: "log_1",
      medicineId: "med_metformin",
      scheduleItemId: "sch_metformin_morning",
      date: "2026-10-25",
      time: "08:00",
      status: "taken",
      recordedAt: "2026-10-25T08:04:00.000Z",
      updatedAt: "2026-10-25T08:04:00.000Z",
    };

    const plan = buildDosePlan({
      dateKey: "2026-10-26",
      medicines: [makeMedicine()],
      scheduleItems: [makeSchedule()],
      doseLogs: [log],
      mealTimes: DEFAULT_MEAL_TIMES,
    });

    expect(plan[0]?.log).toBeNull();
  });

  it("uses meal times from Settings in the plan", () => {
    const plan = buildDosePlan({
      dateKey: "2026-10-26",
      medicines: [makeMedicine()],
      scheduleItems: [makeSchedule({ time: "09:00" })],
      mealTimes: { ...DEFAULT_MEAL_TIMES, breakfast: "09:00" },
    });

    expect(plan[0]?.instruction).toBe(
      "Take 1 tablet of Metformin 500 mg after breakfast.",
    );
  });
});
