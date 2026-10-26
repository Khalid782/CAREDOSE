import { describe, expect, it } from "vitest";
import { parsePrescription, type ParsedMedicine } from "../parser";

/** Parses text that should contain exactly one medicine. */
function parseOne(text: string): ParsedMedicine {
  const result = parsePrescription(text);
  const medicine = result.medicines[0];
  if (result.medicines.length !== 1 || !medicine) {
    throw new Error(`Expected one medicine, got ${result.medicines.length}: ${text}`);
  }
  return medicine;
}

describe("parsePrescription", () => {
  it("reads a 1-0-1 tablet course with meals and a duration", () => {
    const medicine = parseOne(
      "Tab. Metformin 500 mg 1-0-1 after meals for 30 days",
    );

    expect(medicine).toMatchObject({
      name: "Metformin",
      strength: "500 mg",
      form: "tablet",
      dosage: "1 tablet",
      frequency: "bd",
      dosePattern: [1, 0, 1],
      food: "after",
      durationDays: 30,
    });
    expect(medicine.rawText).toContain("Metformin");
  });

  it("reads OD with an explicit meal", () => {
    const medicine = parseOne("Tab Amlodipine 5mg OD after breakfast x 30 days");

    expect(medicine.name).toBe("Amlodipine");
    expect(medicine.strength).toBe("5 mg");
    expect(medicine.frequency).toBe("od");
    expect(medicine.meal).toBe("breakfast");
    expect(medicine.food).toBe("after");
    expect(medicine.durationDays).toBe(30);
  });

  it("reads a morning-only pattern before food", () => {
    const medicine = parseOne(
      "Cap. Omeprazole 20 mg 1-0-0 before breakfast for 14 days",
    );

    expect(medicine).toMatchObject({
      name: "Omeprazole",
      form: "capsule",
      dosage: "1 capsule",
      frequency: "od",
      dosePattern: [1, 0, 0],
      meal: "breakfast",
      food: "before",
      durationDays: 14,
    });
  });

  it("keeps millilitres as the dose for a syrup", () => {
    const medicine = parseOne("Syp Cetirizine 5 ml at bedtime for 5 days");

    expect(medicine).toMatchObject({
      name: "Cetirizine",
      form: "syrup",
      dosage: "5 ml",
      meal: "bedtime",
      food: "anytime",
      durationDays: 5,
    });
    expect(medicine.strength).toBe("");
  });

  it("treats HS as a bedtime instruction", () => {
    const medicine = parseOne("Tab Atorvastatin 10 mg HS");

    expect(medicine.name).toBe("Atorvastatin");
    expect(medicine.strength).toBe("10 mg");
    expect(medicine.meal).toBe("bedtime");
    expect(medicine.frequency).toBe("od");
  });

  it("reads 'twice a day' and 'after food' in words", () => {
    const medicine = parseOne("Metformin 500 mg twice a day after food");

    expect(medicine.frequency).toBe("bd");
    expect(medicine.food).toBe("after");
    expect(medicine.dosePattern).toBeNull();
  });

  it("reads 'once daily'", () => {
    const medicine = parseOne("Amlodipine 5 mg once daily");

    expect(medicine.frequency).toBe("od");
    expect(medicine.frequencyText.toLowerCase()).toBe("once daily");
    expect(medicine.meal).toBeNull();
  });

  it("reads a three-day antibiotic course", () => {
    const medicine = parseOne("Azithromycin 250 mg 1-0-0 for 3 days");

    expect(medicine.name).toBe("Azithromycin");
    expect(medicine.strength).toBe("250 mg");
    expect(medicine.dosePattern).toEqual([1, 0, 0]);
    expect(medicine.frequency).toBe("od");
    expect(medicine.durationDays).toBe(3);
  });

  it("reads TDS before meals", () => {
    const medicine = parseOne("Pantoprazole 40 mg TDS before meals for 7 days");

    expect(medicine.frequency).toBe("tds");
    expect(medicine.food).toBe("before");
    expect(medicine.durationDays).toBe(7);
  });

  it("keeps a multi-word name and converts months to days", () => {
    const medicine = parseOne(
      "Calcium + Vitamin D3 500 mg 1-0-1 after dinner for 1 month",
    );

    expect(medicine.name).toBe("Calcium + Vitamin D3");
    expect(medicine.meal).toBe("dinner");
    expect(medicine.food).toBe("after");
    expect(medicine.durationDays).toBe(30);
  });

  it("recognises a combined strength and a liquid dose", () => {
    const medicine = parseOne("Tab. Amoxicillin 250 mg/5 ml 5 ml TDS");

    expect(medicine.name).toBe("Amoxicillin");
    expect(medicine.strength).toBe("250 mg/5 ml");
    expect(medicine.dosage).toBe("5 ml");
    expect(medicine.frequency).toBe("tds");
  });

  it("infers drops from the medicine name", () => {
    const medicine = parseOne("Travoprost eye drops 0.004% 1 drop at bedtime");

    expect(medicine.name).toBe("Travoprost eye drops");
    expect(medicine.strength).toBe("0.004%");
    expect(medicine.form).toBe("drops");
    expect(medicine.dosage).toBe("1 drop");
    expect(medicine.meal).toBe("bedtime");
  });

  it("reads QID", () => {
    const medicine = parseOne("Tab Cefixime 200 mg QID after meals for 5 days");

    expect(medicine.frequency).toBe("qid");
    expect(medicine.food).toBe("after");
    expect(medicine.durationDays).toBe(5);
  });

  it("cleans an all-caps line into a readable name", () => {
    const medicine = parseOne("METFORMIN 500 MG 1-0-1");

    expect(medicine.name).toBe("Metformin");
    expect(medicine.strength).toBe("500 mg");
    expect(medicine.dosePattern).toEqual([1, 0, 1]);
  });

  it("parses a medicine line with no frequency or duration", () => {
    const medicine = parseOne("Metformin 500 mg");

    expect(medicine.name).toBe("Metformin");
    expect(medicine.strength).toBe("500 mg");
    expect(medicine.frequency).toBe("od");
    expect(medicine.frequencyText).toBe("");
    expect(medicine.durationDays).toBeNull();
  });

  it("drops PO and SOS noise from the name", () => {
    const medicine = parseOne("Tab. Metformin 500 mg PO 1-0-1 SOS");

    expect(medicine.name).toBe("Metformin");
    expect(medicine.dosePattern).toEqual([1, 0, 1]);
  });

  it("parses several medicines from a full report", () => {
    const result = parsePrescription(`
      City Care Clinic
      Dr. R. Mehta
      Patient: Sunita Sharma
      Age: 68 / Female
      Date: 26/10/2026
      Rx
      Tab. Metformin 500 mg 1-0-1 after meals for 30 days
      Tab. Amlodipine 5 mg OD after breakfast for 30 days
      Advice: walk daily
    `);

    expect(result.medicines.map((medicine) => medicine.name)).toEqual([
      "Metformin",
      "Amlodipine",
    ]);
  });

  it("keeps lines it cannot understand for the review screen", () => {
    const result = parsePrescription(
      "Take plenty of rest\nTab. Metformin 500 mg OD",
    );

    expect(result.medicines).toHaveLength(1);
    expect(result.unparsedLines).toContain("Take plenty of rest");
  });

  it("repairs common OCR joins and misreads", () => {
    const result = parsePrescription(`
      Tah Witiormin 500 mg 1-0-1 after mealsfor 30 days
      Tah Amlodipine § mg ODater breakiast for 30 days
      Cap Omeprazole 20 mg 100 befors breakfast or 14ays
      SypCeinizing 5 mlat bedtime for 5 days
    `);

    expect(result.medicines).toHaveLength(4);

    expect(result.medicines[0]).toMatchObject({
      name: "Witiormin",
      strength: "500 mg",
      dosePattern: [1, 0, 1],
      durationDays: 30,
    });
    expect(result.medicines[1]).toMatchObject({
      name: "Amlodipine",
      strength: "5 mg",
      frequency: "od",
      meal: "breakfast",
      food: "after",
      durationDays: 30,
    });
    expect(result.medicines[2]).toMatchObject({
      name: "Omeprazole",
      strength: "20 mg",
      dosePattern: [1, 0, 0],
      meal: "breakfast",
      food: "before",
      durationDays: 14,
    });
    expect(result.medicines[3]).toMatchObject({
      form: "syrup",
      dosage: "5 ml",
      meal: "bedtime",
      durationDays: 5,
    });
    // The original line is preserved beside the corrected fields.
    expect(result.medicines[3]?.rawText).toContain("mlat");
  });

  it("returns an empty result for empty text", () => {
    expect(parsePrescription("")).toEqual({
      medicines: [],
      unparsedLines: [],
      rawText: "",
    });
  });
});
