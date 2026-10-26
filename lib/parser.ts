/**
 * Reads the text Tesseract returns from a prescription photo.
 *
 * This is intentionally a small rule-based parser: prescriptions are written
 * in a narrow vocabulary ("Tab", "BD", "1-0-1", "after meals", "for 5 days"),
 * so a handful of well-tested patterns is easier to reason about than a model.
 * The parser only *suggests* medicines. The Review screen always asks the
 * patient to confirm or correct every field before anything is saved.
 */

import type { FoodRelation, MedicineForm } from "@/lib/data/types";

/** How often a medicine is taken, using the abbreviations found on prescriptions. */
export const FREQUENCY_CODES = ["od", "bd", "tds", "qid", "custom"] as const;
export type FrequencyCode = (typeof FREQUENCY_CODES)[number];

/** A meal the prescription refers to. */
export const MEAL_ANCHORS = ["breakfast", "lunch", "dinner", "bedtime"] as const;
export type MealAnchor = (typeof MEAL_ANCHORS)[number];

/** One medicine as it was read from a single line of the photo. */
export interface ParsedMedicine {
  /** The original line, kept beside the editable fields on the Review screen. */
  rawText: string;
  name: string;
  /** Printed strength including its unit, e.g. "500 mg", "0.004%", "250 mg/5 ml". */
  strength: string;
  form: MedicineForm;
  /** Amount for one dose, e.g. "1 tablet", "5 ml", "1 drop each eye". */
  dosage: string;
  frequency: FrequencyCode;
  /** The words that produced `frequency`, or "" when the line did not say. */
  frequencyText: string;
  /**
   * A "1-0-1" style pattern exactly as written: morning, afternoon, evening,
   * night (two parts mean morning and night). Null when not present.
   */
  dosePattern: number[] | null;
  /** A meal named on the line, or null when the line did not say. */
  meal: MealAnchor | null;
  food: FoodRelation;
  /** Course length in days, or null when no duration was printed. */
  durationDays: number | null;
}

/** Everything one photo produced. */
export interface ParseResult {
  medicines: ParsedMedicine[];
  /** Visible lines the parser could not turn into a medicine. */
  unparsedLines: string[];
  /** The complete OCR text, shown so nothing appears to be hidden. */
  rawText: string;
}

/* -------------------------------------------------------------------------- */
/* Small text helpers                                                          */
/* -------------------------------------------------------------------------- */

const HEADER_PATTERN =
  /^(?:dr\.?\b|doctor\b|clinic\b|hospital\b|address\b|patient\b|name\s*[:\-]|age\s*[:\-]|sex\b|gender\b|date\s*[:\-]|rx\b|r\/\b|prescription\b|diagnosis\b|advice\b|signature\b|reg\.?\s*(?:no|number)|phone\b|mobile\b|follow[-\s]?up|next\s+visit|allergy\b|weight\b|height\b|bp\b|blood\s+pressure\b|temperature\b)/i;

/** Lines that clearly are not medicines, even if they contain a number. */
const NON_MEDICINE_PATTERN =
  /\b(?:thank\s+you|thanks|visit\s+again|not\s+valid|for\s+clinic\s+use|dispense\s+as|substitution|total\s+amount|balance\s+due|amount\s+paid)\b/i;

const FORM_PREFIX =
  /^(tah|tab(?:let)?s?|cap(?:sule)?s?|syp|syr(?:up)?|susp(?:ension)?|inj(?:ection)?|oint(?:ment)?|cream|drops?|inhaler)\.?(?=\s|[A-Z]|\d)/i;

const COMBINED_STRENGTH =
  /\b(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|ug|gm|g|iu|units?|%)\s*(?:\/|per)\s*(\d+(?:[.,]\d+)?)\s*(ml|l)\b/i;

const SIMPLE_STRENGTH = /\b(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|ug|gm|g|iu|units?|%)(?![a-z])/i;

const DOSE_AMOUNT =
  /\b(\d+(?:[.,]\d+)?)\s*(tablets?|tabs?|capsules?|caps?|ml|l|puffs?|drops?|teaspoons?|tsp|sachets?|injections?)\b/i;

const DURATION =
  /(?:\b(?:for|or|x|×|to\s+be\s+taken\s+for)\s*)?\b(\d{1,3})\s*(days?|d|weeks?|wks?|w|months?|mos?|m)\b/i;

const PATTERN = /(?<![\d-])([0-9](?:\s*-\s*[0-9]){1,3})(?![\d-])/;

const BEDTIME_WORDS = /\b(?:bedtime|bed\s*time|at\s+night|night\s*time|night)\b/i;
const BEDTIME_ABBREVIATION = /\bh\.?\s?s\.?(?![a-z])/i;

const TIMING_PHRASES: RegExp[] = [
  /\b(?:before|after|with)\s+(?:food|meals?|breakfast|lunch|dinner)\b/gi,
  /\b(?:empty\s+stomach|on\s+an\s+empty\s+stomach)\b/gi,
  /\b(?:at\s+)?(?:bedtime|bed\s*time|night\s*time|night|morning|afternoon|evening)\b/gi,
  /\b[ap]\.\s?c\.?(?![a-z])/gi,
];

const NOISE_PHRASES: RegExp[] = [
  /\b(?:sos|as\s+needed|if\s+needed|if\s+required)\b/gi,
  /\b(?:take|taken|sig|po|per\s+oral|orally|by\s+mouth)\b/gi,
  /\b(?:x|×)\b/gi,
];

/** Frequency patterns, most specific first. */
const FREQUENCY_RULES: ReadonlyArray<{ code: FrequencyCode; regex: RegExp }> = [
  {
    code: "qid",
    regex:
      /\bq\.?\s?i\.?\s?d\.?(?![a-z])|\bqds\b|\b(?:four|4)\s*(?:times|x)?\s*(?:a|per|\/)?\s*day\b/i,
  },
  {
    code: "tds",
    regex:
      /\bt\.?\s?d\.?\s?s\.?(?![a-z])|\btds\b|\b(?:three|3)\s*(?:times|x)?\s*(?:a|per|\/)?\s*day\b/i,
  },
  {
    code: "bd",
    regex:
      /\bb\.?\s?d\.?(?![a-z])|\bbds\b|\b(?:twice|two|2)\s*(?:times|x)?\s*(?:a|per|\/)?\s*day\b|\bmorning\s+and\s+night\b/i,
  },
  {
    code: "od",
    regex:
      /\bo\.?\s?d\.?(?![a-z])|\bones?\s+(?:a|per|\/)?\s*day\b|\bonce\s+daily\b|\b(?:1|one)\s*(?:time|x)?\s*(?:a|per|\/)?\s*day\b|\bdaily\b/i,
  },
];

const BEFORE_FOOD =
  /\b(?:before|empty\s+stomach|on\s+an\s+empty\s+stomach)\b|\ba\.\s?c\.?(?![a-z])/i;
const AFTER_FOOD =
  /\b(?:after|with)\s+(?:food|meals?|breakfast|lunch|dinner)\b|\bp\.\s?c\.?(?![a-z])/i;

function tidy(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeNumber(value: string): string {
  const number = Number(value.replace(",", "."));
  if (!Number.isFinite(number)) return value;
  return String(number);
}

function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase();
  if (lower === "µg" || lower === "ug") return "mcg";
  if (lower === "gm") return "g";
  if (lower === "unit") return "units";
  return lower;
}

function formatStrength(
  amount: string,
  unit: string,
  perAmount?: string,
  perUnit?: string,
): string {
  const normalizedUnit = normalizeUnit(unit);
  const base =
    normalizedUnit === "%"
      ? `${normalizeNumber(amount)}%`
      : `${normalizeNumber(amount)} ${normalizedUnit}`;
  if (perAmount && perUnit) {
    return `${base}/${normalizeNumber(perAmount)} ${normalizeUnit(perUnit)}`;
  }
  return base;
}

function formFromWord(word: string): MedicineForm {
  const lower = word.toLowerCase();
  if (lower.startsWith("tab") || lower.startsWith("tah")) return "tablet";
  if (lower.startsWith("cap")) return "capsule";
  if (lower.startsWith("syp") || lower.startsWith("syr") || lower.startsWith("susp")) {
    return "syrup";
  }
  if (lower.startsWith("inj")) return "injection";
  if (lower.startsWith("drop")) return "drops";
  if (lower.startsWith("cream") || lower.startsWith("oint")) return "cream";
  if (lower.startsWith("inhal")) return "inhaler";
  return "tablet";
}

function formFromName(name: string): MedicineForm {
  const lower = name.toLowerCase();
  if (/\beye\s+drops?\b/.test(lower) || /\bdrops?$/.test(lower)) return "drops";
  if (/\bcapsules?$/.test(lower)) return "capsule";
  if (/\b(?:syrup|suspension)\b/.test(lower)) return "syrup";
  if (/\binjections?\b/.test(lower)) return "injection";
  if (/\binhaler\b/.test(lower)) return "inhaler";
  if (/\b(?:cream|ointment)\b/.test(lower)) return "cream";
  return "tablet";
}

function defaultDosage(form: MedicineForm): string {
  switch (form) {
    case "capsule":
      return "1 capsule";
    case "syrup":
      return "5 ml";
    case "drops":
      return "1 drop";
    case "injection":
      return "1 injection";
    case "inhaler":
      return "1 puff";
    case "cream":
      return "1 application";
    default:
      return "1 tablet";
  }
}

function formatDoseAmount(amount: string, unit: string): string {
  const count = Number(normalizeNumber(amount));
  const lower = unit.toLowerCase();
  const plural = count === 1 ? "" : "s";

  if (lower.startsWith("tab")) return `${count} tablet${plural}`;
  if (lower.startsWith("cap")) return `${count} capsule${plural}`;
  if (lower === "l") return `${count * 1000} ml`;
  if (lower === "ml") return `${count} ml`;
  if (lower.startsWith("puff")) return `${count} puff${plural}`;
  if (lower.startsWith("drop")) return `${count} drop${plural}`;
  if (lower.startsWith("tsp") || lower.startsWith("teaspoon")) return `${count} teaspoon${plural}`;
  if (lower.startsWith("sachet")) return `${count} sachet${plural}`;
  if (lower.startsWith("injection")) return `${count} injection${plural}`;
  return `${count} ${unit}`;
}

function patternFrequency(pattern: number[]): FrequencyCode {
  const active = pattern.filter((count) => count > 0).length;
  if (active >= 4) return "qid";
  if (active === 3) return "tds";
  if (active === 2) return "bd";
  return "od";
}

function detectMeal(text: string): MealAnchor | null {
  if (/\bbreakfast\b/i.test(text)) return "breakfast";
  if (/\blunch\b/i.test(text)) return "lunch";
  if (/\bdinner\b/i.test(text)) return "dinner";
  if (BEDTIME_WORDS.test(text) || BEDTIME_ABBREVIATION.test(text)) return "bedtime";
  if (/\bmorning\b/i.test(text)) return "breakfast";
  if (/\bafternoon\b/i.test(text)) return "lunch";
  if (/\bevening\b/i.test(text)) return "dinner";
  return null;
}

function detectFood(text: string): FoodRelation {
  if (BEFORE_FOOD.test(text)) return "before";
  if (AFTER_FOOD.test(text)) return "after";
  return "anytime";
}

function durationInDays(amount: string, unit: string): number {
  const value = Number(amount);
  const lower = unit.toLowerCase();
  if (!Number.isFinite(value) || value <= 0) return 0;
  let days = value;
  if (lower.startsWith("w")) days = value * 7;
  else if (lower.startsWith("m")) days = value * 30;
  return Math.min(365, Math.round(days));
}

function smartTitle(text: string): string {
  const letters = text.replace(/[^a-z]/gi, "");
  if (!letters || letters !== letters.toUpperCase()) return text;
  return text
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function removeAll(text: string, patterns: RegExp[]): string {
  return patterns.reduce((current, pattern) => current.replace(pattern, " "), text);
}

/**
 * Repairs the small, predictable mistakes Tesseract makes at line level:
 * joined words, common word misreads, and missed spaces between a medicine
 * form and the name. The original line is still shown on the Review screen.
 */
function normalizeOcrLine(line: string): string {
  return line
    .replace(
      /\b(OD|BD|TDS|QID|HS)(?=(?:after|ater|before|befor|at|for|breakfast|lunch|dinner|meals?|food))/gi,
      "$1 ",
    )
    .replace(/\bbefor(?:s)?\b/gi, "before")
    .replace(/\bater\b/gi, "after")
    .replace(/\bbreakfst\b|\bbreakiast\b/gi, "breakfast")
    .replace(/§\s*(?=mg\b)/gi, "5 ")
    .replace(
      /\b(meals?|breakfast|lunch|dinner|tablet|capsule|drop|puff|ml)(for|at|after|before)\b/gi,
      "$1 $2",
    )
    .replace(/\bml(?=at\b)/gi, "ml ")
    .replace(/\b(\d{1,3})\s*c?ays\b/gi, "$1 days")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanName(text: string): string {
  let name = text
    .replace(/\b(?:mg|mcg|ml|iu|units?)\b/gi, " ")
    .replace(/\s+(?:tablets?|tabs?|capsules?|caps?|syrup|syp|injection|inj|ointment|cream)\s*$/i, "")
    .replace(/^[\s\-–—:;,.]+|[\s\-–—:;,.]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // A stray short number at the end is usually a frequency that lost its
  // pattern, not part of the medicine name.
  name = name.replace(/\s+\d{1,2}$/, "").trim();
  name = smartTitle(name);
  return name.slice(0, 80).trim();
}

/* -------------------------------------------------------------------------- */
/* One line                                                                    */
/* -------------------------------------------------------------------------- */

function parseLine(rawLine: string): ParsedMedicine | null {
  let working = rawLine.replace(/^(?:[•*\-–—]+|\d{1,2}[.)])\s*/, "").trim();
  working = working.replace(/^r[xy]\s*[:.]?\s*/i, "").trim();
  if (!working) return null;

  let form: MedicineForm | null = null;
  const formMatch = working.match(FORM_PREFIX);
  if (formMatch?.[1]) {
    form = formFromWord(formMatch[1]);
    working = working.slice(formMatch[0].length);
  }

  let strength = "";
  const combined = working.match(COMBINED_STRENGTH);
  if (combined) {
    strength = formatStrength(
      combined[1] ?? "",
      combined[2] ?? "",
      combined[3],
      combined[4],
    );
    working = working.replace(combined[0], " ");
  } else {
    const simple = working.match(SIMPLE_STRENGTH);
    if (simple) {
      strength = formatStrength(simple[1] ?? "", simple[2] ?? "");
      working = working.replace(simple[0], " ");
    }
  }

  const amountMatch = working.match(DOSE_AMOUNT);
  const detectedDosage = amountMatch
    ? formatDoseAmount(amountMatch[1] ?? "", amountMatch[2] ?? "")
    : null;
  if (amountMatch) working = working.replace(amountMatch[0], " ");

  let dosePattern: number[] | null = null;
  const patternMatch = working.match(PATTERN);
  if (patternMatch?.[1]) {
    const parts = patternMatch[1].split("-").map((part) => Number(part.trim()));
    const valid =
      parts.length >= 2 &&
      parts.length <= 4 &&
      parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 4) &&
      parts.some((part) => part > 0);
    if (valid) {
      dosePattern = parts;
      working = working.replace(patternMatch[0], " ");
    }
  }

  // OCR often drops the hyphens in "1-0-0", leaving "100" behind.
  if (!dosePattern) {
    const collapsed = working.match(/(?<![\d.-])([0-4]{3,4})(?![\d.])/);
    if (collapsed?.[1]) {
      const parts = [...collapsed[1]].map(Number);
      if (parts.some((part) => part > 0)) {
        dosePattern = parts;
        working = working.replace(collapsed[0], " ");
      }
    }
  }

  let frequencyText = "";
  let frequency: FrequencyCode | null = null;
  for (const rule of FREQUENCY_RULES) {
    const match = working.match(rule.regex);
    if (!match) continue;
    frequency = rule.code;
    frequencyText = tidy(match[0]);
    working = working.replace(match[0], " ");
    break;
  }

  if (dosePattern) {
    frequency = patternFrequency(dosePattern);
    frequencyText = frequencyText || dosePattern.join("-");
  }

  const meal = detectMeal(working);
  const food = detectFood(working);

  let durationDays: number | null = null;
  const durationMatch = working.match(DURATION);
  if (durationMatch?.[1] && durationMatch[2]) {
    const days = durationInDays(durationMatch[1], durationMatch[2]);
    if (days > 0) {
      durationDays = days;
      working = working.replace(durationMatch[0], " ");
    }
  }

  working = removeAll(working, TIMING_PHRASES);
  working = removeAll(working, NOISE_PHRASES);

  // "HS" is a timing instruction rather than one of the four frequency codes.
  working = working.replace(/\bh\.?\s?s\.?(?![a-z])/gi, " ");

  const name = cleanName(working);
  const hasLetter = /[a-z]/i.test(name);
  const hasContext = Boolean(
    strength ||
      dosePattern ||
      frequencyText ||
      durationDays !== null ||
      meal ||
      form ||
      food !== "anytime",
  );

  if (!hasLetter || name.length < 2 || !hasContext) return null;

  const resolvedForm = form ?? formFromName(name);
  let dosage = detectedDosage ?? defaultDosage(resolvedForm);

  if (dosePattern && detectedDosage === null) {
    const largest = Math.max(...dosePattern);
    const unit = defaultDosage(resolvedForm).split(" ").slice(1).join(" ");
    const countable = Boolean(unit) && unit !== "ml" && !unit.startsWith("application");
    if (countable) {
      const plural = largest === 1 || unit.endsWith("s") ? "" : "s";
      dosage = `${largest} ${unit}${plural}`;
    }
  }

  return {
    rawText: rawLine,
    name,
    strength,
    form: resolvedForm,
    dosage,
    frequency: frequency ?? "od",
    frequencyText,
    dosePattern,
    meal,
    food,
    durationDays,
  };
}

/** True for lines that should be kept as "we could not read this". */
function looksLikeContent(line: string): boolean {
  if (HEADER_PATTERN.test(line) || NON_MEDICINE_PATTERN.test(line)) return false;
  const letters = (line.match(/[a-z]/gi) ?? []).length;
  return letters >= 3;
}

/**
 * Parses the whole OCR result. Every line is tried separately; lines that do
 * not look like a medicine are returned untouched for the Review screen.
 */
export function parsePrescription(text: string): ParseResult {
  const rawText = text.replace(/\r\n?/g, "\n").trim();
  const medicines: ParsedMedicine[] = [];
  const unparsedLines: string[] = [];
  const seen = new Set<string>();

  for (const rawLine of rawText.split("\n")) {
    const line = tidy(rawLine);
    if (!line || line.length < 3) continue;
    const normalized = normalizeOcrLine(line);
    const withoutMarker = normalized
      .replace(/^(?:[•*\-–—]+|\d{1,2}[.)])\s*/, "")
      .trim();
    const looksLikeClinicHeader =
      /\b(?:clinic|hospital|pharmacy|medical\s+cent(?:er|re))\b/i.test(withoutMarker) &&
      withoutMarker.split(/\s+/).length <= 8;
    if (
      HEADER_PATTERN.test(withoutMarker) ||
      NON_MEDICINE_PATTERN.test(withoutMarker) ||
      looksLikeClinicHeader
    ) {
      continue;
    }

    const parsed = parseLine(normalized);
    if (parsed) {
      // The Review screen must show what the camera actually read, not the
      // repaired copy used for parsing.
      const medicine = { ...parsed, rawText: line };
      const key = `${medicine.name.toLowerCase()}|${medicine.strength}|${line}`;
      if (!seen.has(key)) {
        seen.add(key);
        medicines.push(medicine);
      }
      continue;
    }

    if (looksLikeContent(line) && !seen.has(line)) {
      seen.add(line);
      unparsedLines.push(line);
    }
  }

  return { medicines, unparsedLines, rawText };
}
