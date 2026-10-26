/**
 * Local medicine-interaction checker.
 *
 * The data is deliberately kept behind this small interface so the local JSON
 * can later be replaced by a live clinical API without changing any screen.
 * It is general information only: it is not medical advice, and it does not
 * know the patient's full history or every medicine they take.
 */

import rawInteractionData from "@/data/interactions.json";

export const INTERACTION_SEVERITIES = ["severe", "moderate", "minor"] as const;
export type InteractionSeverity = (typeof INTERACTION_SEVERITIES)[number];

export interface InteractionPair {
  drugA: string;
  drugB: string;
  severity: InteractionSeverity;
  explanation: string;
}

export interface InteractionDataset {
  disclaimer: string;
  pairs: InteractionPair[];
  /** Indian brand name (lower-case) to the generic ingredient that matters. */
  brands: Record<string, string>;
}

export interface InteractionMedicine {
  id: string;
  name: string;
}

export interface InteractionWarning {
  id: string;
  severity: InteractionSeverity;
  /** Generic names used to find the pair. */
  drugA: string;
  drugB: string;
  explanation: string;
  medicineAId: string;
  medicineAName: string;
  medicineBId: string;
  medicineBName: string;
}

export interface InteractionChecker {
  disclaimer: string;
  check(medicines: readonly InteractionMedicine[]): InteractionWarning[];
  /** Warnings that involve at least one of the newly added medicines. */
  checkNew(
    existing: readonly InteractionMedicine[],
    added: readonly InteractionMedicine[],
  ): InteractionWarning[];
}

const interactionData = rawInteractionData as unknown as InteractionDataset;

export const INTERACTION_DISCLAIMER = interactionData.disclaimer;

/** Words that never help identify the active ingredient. */
const STOP_WORDS = new Set([
  "tab",
  "tabs",
  "tablet",
  "tablets",
  "cap",
  "caps",
  "capsule",
  "capsules",
  "syp",
  "syrup",
  "suspension",
  "inj",
  "injection",
  "drops",
  "drop",
  "eye",
  "eyes",
  "cream",
  "ointment",
  "inhaler",
  "mg",
  "ml",
  "mcg",
  "gm",
  "iu",
  "unit",
  "units",
  "sr",
  "xr",
  "cr",
  "od",
  "bd",
  "tds",
  "qid",
  "hs",
  "forte",
  "plus",
  "and",
  "with",
  "of",
  "the",
  "for",
  "dose",
  "care",
]);

const SEVERITY_ORDER: Record<InteractionSeverity, number> = {
  severe: 0,
  moderate: 1,
  minor: 2,
};

function normalizeTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((token) => token.trim())
    .filter(
      (token) =>
        Boolean(token) &&
        !STOP_WORDS.has(token) &&
        !/^\d+(?:\.\d+)?$/.test(token),
    );
}

function normalizePhrase(name: string): string {
  return normalizeTokens(name).join(" ");
}

function pairKey(drugA: string, drugB: string): string {
  return [normalizePhrase(drugA), normalizePhrase(drugB)].sort().join("|");
}

function includesPhrase(phrase: string, candidate: string): boolean {
  if (!candidate) return false;
  return ` ${phrase} `.includes(` ${candidate} `);
}

interface BrandEntry {
  alias: string;
  generic: string;
}

function buildBrandEntries(dataset: InteractionDataset): BrandEntry[] {
  return Object.entries(dataset.brands)
    .map(([brand, generic]) => ({
      alias: normalizePhrase(brand),
      generic: generic.trim().toLowerCase(),
    }))
    .filter((entry) => entry.alias && entry.generic)
    .sort((a, b) => b.alias.length - a.alias.length);
}

function buildKnownGenerics(dataset: InteractionDataset): string[] {
  const generics = new Set<string>();
  for (const pair of dataset.pairs) {
    generics.add(pair.drugA.trim().toLowerCase());
    generics.add(pair.drugB.trim().toLowerCase());
  }
  for (const generic of Object.values(dataset.brands)) {
    generics.add(generic.trim().toLowerCase());
  }
  return [...generics].sort((a, b) => b.length - a.length);
}

/**
 * Turns a medicine label into the generic ingredients that can be checked.
 * Brand names are matched as whole words, so "Ecosprin 75" becomes aspirin.
 */
export function resolveGenericNames(
  name: string,
  dataset: InteractionDataset = interactionData,
): string[] {
  const phrase = normalizePhrase(name);
  if (!phrase) return [];

  const found = new Set<string>();
  for (const entry of buildBrandEntries(dataset)) {
    if (includesPhrase(phrase, entry.alias)) found.add(entry.generic);
  }
  for (const generic of buildKnownGenerics(dataset)) {
    if (includesPhrase(phrase, normalizePhrase(generic))) found.add(generic);
  }
  return [...found];
}

/**
 * Builds a checker from any dataset with the same shape. A future API adapter
 * only has to implement `InteractionChecker`.
 */
export function createInteractionChecker(
  dataset: InteractionDataset = interactionData,
): InteractionChecker {
  const brands = buildBrandEntries(dataset);
  const knownGenerics = buildKnownGenerics(dataset);
  const pairIndex = new Map<string, InteractionPair>();

  for (const pair of dataset.pairs) {
    const key = pairKey(pair.drugA, pair.drugB);
    if (!pairIndex.has(key)) pairIndex.set(key, pair);
  }

  const resolve = (name: string): string[] => {
    const phrase = normalizePhrase(name);
    if (!phrase) return [];
    const found = new Set<string>();
    for (const entry of brands) {
      if (includesPhrase(phrase, entry.alias)) found.add(entry.generic);
    }
    for (const generic of knownGenerics) {
      if (includesPhrase(phrase, normalizePhrase(generic))) found.add(generic);
    }
    return [...found];
  };

  const check: InteractionChecker["check"] = (medicines) => {
    const resolved = medicines
      .map((medicine) => ({ medicine, generics: resolve(medicine.name) }))
      .filter((entry) => entry.generics.length > 0);

    const warnings: InteractionWarning[] = [];
    const seen = new Set<string>();

    for (let first = 0; first < resolved.length; first += 1) {
      const a = resolved[first];
      if (!a) continue;
      for (let second = first + 1; second < resolved.length; second += 1) {
        const b = resolved[second];
        if (!b || a.medicine.id === b.medicine.id) continue;

        for (const genericA of a.generics) {
          for (const genericB of b.generics) {
            if (genericA === genericB) continue;
            const pair = pairIndex.get(pairKey(genericA, genericB));
            if (!pair) continue;

            const id = `${pairKey(pair.drugA, pair.drugB)}:${a.medicine.id}:${b.medicine.id}`;
            if (seen.has(id)) continue;
            seen.add(id);

            warnings.push({
              id,
              severity: pair.severity,
              drugA: pair.drugA,
              drugB: pair.drugB,
              explanation: pair.explanation,
              medicineAId: a.medicine.id,
              medicineAName: a.medicine.name,
              medicineBId: b.medicine.id,
              medicineBName: b.medicine.name,
            });
          }
        }
      }
    }

    return warnings.sort((a, b) => {
      const severity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (severity !== 0) return severity;
      return a.medicineAName.localeCompare(b.medicineAName);
    });
  };

  return {
    disclaimer: dataset.disclaimer,
    check,
    checkNew(existing, added) {
      const addedIds = new Set(added.map((medicine) => medicine.id));
      const byId = new Map<string, InteractionMedicine>();
      for (const medicine of [...existing, ...added]) byId.set(medicine.id, medicine);
      return check([...byId.values()]).filter(
        (warning) =>
          addedIds.has(warning.medicineAId) || addedIds.has(warning.medicineBId),
      );
    },
  };
}

/** The checker the app uses today. Replace this export to go live. */
export const interactionChecker: InteractionChecker =
  createInteractionChecker(interactionData);
