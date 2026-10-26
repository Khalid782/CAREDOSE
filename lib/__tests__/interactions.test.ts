import { describe, expect, it } from "vitest";
import rawData from "@/data/interactions.json";
import {
  createInteractionChecker,
  interactionChecker,
  resolveGenericNames,
  type InteractionDataset,
  type InteractionSeverity,
} from "@/lib/interactions";

const data = rawData as unknown as InteractionDataset;

describe("interaction dataset", () => {
  it("contains at least 40 well-known pairs", () => {
    expect(data.pairs.length).toBeGreaterThanOrEqual(40);
  });

  it("uses only supported severities", () => {
    const allowed: InteractionSeverity[] = ["severe", "moderate", "minor"];
    for (const pair of data.pairs) {
      expect(allowed).toContain(pair.severity);
      expect(pair.drugA.trim()).not.toBe("");
      expect(pair.drugB.trim()).not.toBe("");
      expect(pair.explanation.trim().length).toBeGreaterThan(10);
    }
  });

  it("has no duplicate unordered pairs", () => {
    const keys = data.pairs.map((pair) =>
      [pair.drugA.toLowerCase(), pair.drugB.toLowerCase()].sort().join("|"),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("maps common Indian brands to their generic ingredient", () => {
    expect(resolveGenericNames("Dolo 650")).toContain("paracetamol");
    expect(resolveGenericNames("Crocin Advance")).toContain("paracetamol");
    expect(resolveGenericNames("Ecosprin 75")).toContain("aspirin");
    expect(resolveGenericNames("Glycomet 500")).toContain("metformin");
    expect(resolveGenericNames("Thyronorm 50 mcg")).toContain("levothyroxine");
  });

  it("does not match a brand inside an unrelated word", () => {
    expect(resolveGenericNames("Doxycycline")).toContain("doxycycline");
    expect(resolveGenericNames("Doxycycline")).not.toContain("paracetamol");
  });
});

describe("interactionChecker", () => {
  it("finds a severe brand-name pair", () => {
    const warnings = interactionChecker.check([
      { id: "1", name: "Ecosprin 75" },
      { id: "2", name: "Clopilet 75" },
    ]);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      severity: "severe",
      drugA: "aspirin",
      drugB: "clopidogrel",
      medicineAName: "Ecosprin 75",
      medicineBName: "Clopilet 75",
    });
  });

  it("finds a moderate pair through an Indian brand", () => {
    const warnings = interactionChecker.check([
      { id: "1", name: "Warf 5 mg" },
      { id: "2", name: "Dolo 650" },
    ]);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.severity).toBe("moderate");
    expect(warnings[0]?.explanation).toContain("paracetamol");
  });

  it("is independent of medicine order", () => {
    const first = interactionChecker.check([
      { id: "1", name: "Warfarin" },
      { id: "2", name: "Aspirin" },
    ]);
    const second = interactionChecker.check([
      { id: "2", name: "Aspirin" },
      { id: "1", name: "Warfarin" },
    ]);

    expect(first[0]).toMatchObject({
      severity: second[0]?.severity,
      drugA: second[0]?.drugA,
      drugB: second[0]?.drugB,
      explanation: second[0]?.explanation,
    });
  });

  it("does not warn when two brands are the same generic", () => {
    expect(
      interactionChecker.check([
        { id: "1", name: "Dolo 650" },
        { id: "2", name: "Crocin" },
      ]),
    ).toEqual([]);
  });

  it("does not warn for an unlisted pair", () => {
    expect(
      interactionChecker.check([
        { id: "1", name: "Metformin 500 mg" },
        { id: "2", name: "Amlodipine 5 mg" },
      ]),
    ).toEqual([]);
  });

  it("sorts severe warnings before moderate ones", () => {
    const warnings = interactionChecker.check([
      { id: "1", name: "Warf 5 mg" },
      { id: "2", name: "Dolo 650" },
      { id: "3", name: "Ecosprin 75" },
    ]);

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]?.severity).toBe("severe");
    expect(warnings.some((warning) => warning.severity === "moderate")).toBe(true);
  });

  it("only returns warnings involving a newly added medicine", () => {
    const existing = [
      { id: "warf", name: "Warfarin" },
      { id: "aspirin", name: "Aspirin" },
    ];

    expect(interactionChecker.checkNew(existing, [{ id: "met", name: "Metformin" }])).toEqual(
      [],
    );

    const withParacetamol = interactionChecker.checkNew(existing, [
      { id: "para", name: "Dolo 650" },
    ]);
    expect(withParacetamol).toHaveLength(1);
    expect(withParacetamol[0]?.medicineBId).toBe("para");
  });

  it("can be replaced with another dataset through the same interface", () => {
    const custom = createInteractionChecker({
      disclaimer: "Custom data for a test.",
      brands: { brandy: "drugb" },
      pairs: [
        {
          drugA: "druga",
          drugB: "drugb",
          severity: "minor",
          explanation: "A made-up interaction used only in this test.",
        },
      ],
    });

    const warnings = custom.check([
      { id: "a", name: "Druga" },
      { id: "b", name: "Brandy 10" },
    ]);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.severity).toBe("minor");
    expect(custom.disclaimer).toBe("Custom data for a test.");
  });
});
