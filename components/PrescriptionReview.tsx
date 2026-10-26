"use client";

/**
 * The Review screen between OCR and the saved plan.
 *
 * Every medicine gets an editable card with the exact line the camera read
 * beside it. Nothing is written to the data layer here: the patient has to
 * press Save, and only then does Scan hand the drafts to `saveMedicines`.
 */

import { Clock, FileText, Pill, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Card, CardTitle } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Field, inputClass, selectClass } from "@/components/Field";
import { WarningBanner } from "@/components/WarningBanner";
import { minutesToTime, timeToMinutes, todayKey } from "@/lib/data/time";
import {
  FOOD_RELATIONS,
  MEDICINE_FORMS,
  type FoodRelation,
  type MealTimes,
  type MedicineDraft,
  type MedicineForm,
} from "@/lib/data/types";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { useTranslator } from "@/lib/i18n/useTranslator";
import { dateRangeForDuration, timesForPrescription } from "@/lib/schedule";
import type { FrequencyCode, ParseResult, ParsedMedicine } from "@/lib/parser";

/** One editable card in the review. */
interface ReviewItem {
  id: string;
  rawText: string;
  name: string;
  strength: string;
  form: MedicineForm;
  dosage: string;
  food: FoodRelation;
  frequency: FrequencyCode;
  frequencyText: string;
  meal: ParsedMedicine["meal"];
  durationDays: number | null;
  times: string[];
}

const FREQUENCY_KEYS: Record<FrequencyCode, TranslationKey> = {
  od: "frequency.od",
  bd: "frequency.bd",
  tds: "frequency.tds",
  qid: "frequency.qid",
  custom: "frequency.custom",
};

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `review-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function fromParsed(parsed: ParsedMedicine, mealTimes: MealTimes): ReviewItem {
  return {
    id: newId(),
    rawText: parsed.rawText,
    name: parsed.name,
    strength: parsed.strength,
    form: parsed.form,
    dosage: parsed.dosage,
    food: parsed.food,
    frequency: parsed.frequency,
    frequencyText: parsed.frequencyText,
    meal: parsed.meal,
    durationDays: parsed.durationDays,
    times: timesForPrescription(parsed, mealTimes),
  };
}

function emptyItem(mealTimes: MealTimes): ReviewItem {
  return {
    id: newId(),
    rawText: "",
    name: "",
    strength: "",
    form: "tablet",
    dosage: "1 tablet",
    food: "after",
    frequency: "od",
    frequencyText: "",
    meal: null,
    durationDays: null,
    times: [mealTimes.breakfast],
  };
}

export function PrescriptionReview({
  result,
  mealTimes,
  onCancel,
  onSave,
}: {
  result: ParseResult;
  mealTimes: MealTimes;
  onCancel: () => void;
  /** Called only after the patient presses Save. */
  onSave: (drafts: MedicineDraft[]) => Promise<void>;
}) {
  const { t } = useTranslator();
  const [items, setItems] = useState<ReviewItem[]>(() =>
    result.medicines.map((medicine) => fromParsed(medicine, mealTimes)),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (id: string, patch: Partial<ReviewItem>) => {
    setItems((previous) =>
      previous.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
    setError(null);
  };

  const updateTime = (id: string, index: number, value: string) => {
    setItems((previous) =>
      previous.map((item) =>
        item.id === id
          ? {
              ...item,
              times: item.times.map((time, position) => (position === index ? value : time)),
            }
          : item,
      ),
    );
    setError(null);
  };

  const addTime = (id: string) => {
    setItems((previous) =>
      previous.map((item) => {
        if (item.id !== id) return item;
        const last = item.times[item.times.length - 1] ?? mealTimes.breakfast;
        return {
          ...item,
          times: [...item.times, minutesToTime(timeToMinutes(last) + 720)],
        };
      }),
    );
  };

  const removeTime = (id: string, index: number) => {
    setItems((previous) =>
      previous.map((item) =>
        item.id === id
          ? { ...item, times: item.times.filter((_, position) => position !== index) }
          : item,
      ),
    );
  };

  const removeItem = (id: string) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
    setError(null);
  };

  const save = async () => {
    if (items.length === 0) {
      setError(t("review.errorEmpty"));
      return;
    }
    if (items.some((item) => !item.name.trim())) {
      setError(t("review.errorName"));
      return;
    }
    if (items.some((item) => item.times.filter((time) => time.trim()).length === 0)) {
      setError(t("review.errorTime"));
      return;
    }

    const today = todayKey();
    const drafts: MedicineDraft[] = items.map((item) => {
      const range = dateRangeForDuration(item.durationDays, today);
      return {
        name: item.name.trim(),
        strength: item.strength.trim(),
        form: item.form,
        dosage: item.dosage.trim() || "1",
        food: item.food,
        notes: "",
        unitsRemaining: null,
        times: [...new Set(item.times.map((time) => time.trim()).filter(Boolean))].sort(
          (a, b) => timeToMinutes(a) - timeToMinutes(b),
        ),
        startDate: range.startDate,
        endDate: range.endDate,
      };
    });

    setSaving(true);
    setError(null);
    try {
      await onSave(drafts);
    } catch {
      setError(t("review.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <WarningBanner tone="info" title={t("review.noticeTitle")}>
        <p>{t("review.notice")}</p>
      </WarningBanner>

      {error ? <WarningBanner title={error} /> : null}

      {result.unparsedLines.length > 0 ? (
        <WarningBanner tone="info" title={t("review.unreadTitle")}>
          <p>{t("review.unreadBody")}</p>
        </WarningBanner>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          icon={<Pill size={36} strokeWidth={2.5} />}
          title={t("review.emptyTitle")}
          message={t("review.emptyBody")}
          action={
            <Button
              size="lg"
              fullWidth
              icon={<Plus size={26} strokeWidth={3} />}
              onClick={() => setItems([emptyItem(mealTimes)])}
            >
              {t("review.addMedicine")}
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-5">
          {items.map((item, index) => {
            const frequencyLabel = t(FREQUENCY_KEYS[item.frequency]);
            return (
              <Card as="li" key={item.id} className="flex flex-col gap-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <CardTitle icon={<Pill size={26} strokeWidth={2.5} />}>
                    {t("review.medicineLabel", { index: index + 1 })}
                  </CardTitle>
                  <span className="rounded-lg border-2 border-line bg-surface-3 px-3 py-1 text-[0.85rem] font-semibold text-fg">
                    {item.frequencyText
                      ? t("review.detected", { frequency: frequencyLabel })
                      : t("review.frequencyUnknown")}
                  </span>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="flex flex-col gap-4">
                    <Field
                      label={t("medicines.fieldName")}
                      htmlFor={`review-name-${item.id}`}
                    >
                      <input
                        id={`review-name-${item.id}`}
                        className={inputClass}
                        value={item.name}
                        placeholder={t("medicines.fieldNamePlaceholder")}
                        autoComplete="off"
                        onChange={(event) => update(item.id, { name: event.target.value })}
                      />
                    </Field>

                    <Field
                      label={t("medicines.fieldStrength")}
                      htmlFor={`review-strength-${item.id}`}
                    >
                      <input
                        id={`review-strength-${item.id}`}
                        className={inputClass}
                        value={item.strength}
                        placeholder={t("medicines.fieldStrengthPlaceholder")}
                        autoComplete="off"
                        onChange={(event) =>
                          update(item.id, { strength: event.target.value })
                        }
                      />
                    </Field>

                    <Field label={t("medicines.fieldForm")} htmlFor={`review-form-${item.id}`}>
                      <select
                        id={`review-form-${item.id}`}
                        className={selectClass}
                        value={item.form}
                        onChange={(event) =>
                          update(item.id, { form: event.target.value as MedicineForm })
                        }
                      >
                        {MEDICINE_FORMS.map((form) => (
                          <option key={form} value={form}>
                            {t(`form.${form}`)}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field
                      label={t("medicines.fieldDosage")}
                      htmlFor={`review-dosage-${item.id}`}
                    >
                      <input
                        id={`review-dosage-${item.id}`}
                        className={inputClass}
                        value={item.dosage}
                        placeholder={t("medicines.fieldDosagePlaceholder")}
                        autoComplete="off"
                        onChange={(event) =>
                          update(item.id, { dosage: event.target.value })
                        }
                      />
                    </Field>

                    <Field label={t("medicines.fieldFood")} htmlFor={`review-food-${item.id}`}>
                      <select
                        id={`review-food-${item.id}`}
                        className={selectClass}
                        value={item.food}
                        onChange={(event) =>
                          update(item.id, { food: event.target.value as FoodRelation })
                        }
                      >
                        {FOOD_RELATIONS.map((relation) => (
                          <option key={relation} value={relation}>
                            {t(`food.${relation}`)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <aside className="flex flex-col gap-2 rounded-xl border-2 border-line bg-surface-2 p-3">
                    <p className="flex items-center gap-2 text-[0.9rem] font-semibold text-fg-muted">
                      <FileText size={20} strokeWidth={2.5} aria-hidden="true" />
                      {item.rawText ? t("review.ocrLabel") : t("review.manualLabel")}
                    </p>
                    <blockquote className="whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed text-fg">
                      {item.rawText || t("review.manualPlaceholder")}
                    </blockquote>
                  </aside>
                </div>

                <div className="flex flex-col gap-3 rounded-xl border-2 border-line bg-surface-2 p-3">
                  <p className="flex items-center gap-2 text-base font-semibold text-fg">
                    <Clock size={22} strokeWidth={2.5} aria-hidden="true" />
                    {t("medicines.fieldTimes")}
                  </p>
                  <ul className="flex flex-col gap-3">
                    {item.times.map((time, position) => (
                      <li key={`${item.id}-time-${position}`} className="flex flex-wrap items-end gap-3">
                        <div className="flex min-w-[150px] flex-1 flex-col gap-1">
                          <label
                            htmlFor={`review-time-${item.id}-${position}`}
                            className="text-[0.9rem] font-semibold text-fg-muted"
                          >
                            {t("review.timeLabel", { index: position + 1 })}
                          </label>
                          <input
                            id={`review-time-${item.id}-${position}`}
                            type="time"
                            className={inputClass}
                            value={time}
                            onChange={(event) =>
                              updateTime(item.id, position, event.target.value)
                            }
                          />
                        </div>
                        {item.times.length > 1 ? (
                          <Button
                            variant="warn"
                            size="sm"
                            icon={<Trash2 size={20} strokeWidth={2.5} />}
                            className="mb-1"
                            onClick={() => removeTime(item.id, position)}
                          >
                            {t("review.removeTime")}
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="secondary"
                    size="md"
                    fullWidth
                    icon={<Plus size={22} strokeWidth={2.5} />}
                    onClick={() => addTime(item.id)}
                  >
                    {t("medicines.addTime")}
                  </Button>
                </div>

                <Field
                  label={t("review.duration")}
                  hint={t("review.durationHint")}
                  htmlFor={`review-duration-${item.id}`}
                >
                  <input
                    id={`review-duration-${item.id}`}
                    className={inputClass}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={365}
                    value={item.durationDays ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      const days = Number(value);
                      update(item.id, {
                        durationDays:
                          value === "" || !Number.isFinite(days)
                            ? null
                            : Math.max(0, Math.round(days)),
                      });
                    }}
                  />
                </Field>

                <Button
                  variant="warn"
                  size="md"
                  fullWidth
                  icon={<Trash2 size={22} strokeWidth={2.5} />}
                  onClick={() => removeItem(item.id)}
                >
                  {t("review.deleteMedicine")}
                </Button>
              </Card>
            );
          })}
        </ul>
      )}

      <details className="rounded-2xl border-2 border-line bg-surface p-4">
        <summary className="flex min-h-[48px] cursor-pointer items-center gap-2 text-base font-semibold text-fg">
          <FileText size={22} strokeWidth={2.5} aria-hidden="true" />
          {t("review.fullText")}
        </summary>
        <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-[0.9rem] leading-relaxed text-fg-muted">
          {result.rawText || t("review.noText")}
        </pre>
      </details>

      <div className="flex flex-col gap-3">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={saving || items.length === 0}
          icon={<ShieldCheck size={26} strokeWidth={2.5} />}
          onClick={() => void save()}
        >
          {items.length === 1
            ? t("review.saveOne")
            : t("review.save", { count: items.length })}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          icon={<Plus size={24} strokeWidth={2.5} />}
          onClick={() => setItems((previous) => [...previous, emptyItem(mealTimes)])}
        >
          {t("review.addMedicine")}
        </Button>
        <Button variant="secondary" size="lg" fullWidth disabled={saving} onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}
