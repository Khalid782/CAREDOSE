"use client";

/**
 * The manual Add / Edit Medicine form: one flat column of big labelled fields,
 * with the times list handled as repeatable rows. No nested menus, no modals.
 */

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useCareData } from "@/lib/context/CareDataProvider";
import { timeOfDayFromTime, timeToMinutes, minutesToTime } from "@/lib/data/time";
import { interactionChecker } from "@/lib/interactions";
import {
  FOOD_RELATIONS,
  MEDICINE_FORMS,
  type FoodRelation,
  type MedicineDraft,
  type MedicineForm as MedicineFormValue,
} from "@/lib/data/types";
import { useTranslator } from "@/lib/i18n/useTranslator";
import { Button } from "./Button";
import { Card } from "./Card";
import { Field, FieldGroup, inputClass, selectClass } from "./Field";
import { InteractionWarning } from "./InteractionWarning";
import { SegmentedControl } from "./SegmentedControl";
import { WarningBanner } from "./WarningBanner";

/** A morning dose is the most common starting point. */
const FIRST_TIME = "08:00";

export const EMPTY_MEDICINE_DRAFT: MedicineDraft = {
  name: "",
  strength: "",
  form: "tablet",
  dosage: "1 tablet",
  food: "after",
  notes: "",
  unitsRemaining: null,
  times: [FIRST_TIME],
};

export function MedicineForm({
  initial,
  title,
  submitLabel,
  onSubmit,
  onCancel,
  busy = false,
  medicineId,
}: {
  initial?: MedicineDraft;
  title: string;
  submitLabel: string;
  onSubmit: (draft: MedicineDraft) => void;
  onCancel: () => void;
  busy?: boolean;
  /** Set when editing, so the medicine is not compared with itself. */
  medicineId?: string;
}) {
  const { t, timeOfDay } = useTranslator();
  const { medicines } = useCareData();
  const [draft, setDraft] = useState<MedicineDraft>(initial ?? EMPTY_MEDICINE_DRAFT);
  const [error, setError] = useState<string | null>(null);

  const interactionWarnings = useMemo(() => {
    const name = draft.name.trim();
    if (!name) return [];
    return interactionChecker.checkNew(
      medicines.filter((medicine) => medicine.id !== medicineId),
      [{ id: "medicine-draft", name }],
    );
  }, [draft.name, medicines, medicineId]);

  const update = <TKey extends keyof MedicineDraft>(key: TKey, value: MedicineDraft[TKey]) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
  };

  const setTime = (index: number, value: string) => {
    setDraft((previous) => ({
      ...previous,
      times: previous.times.map((time, position) => (position === index ? value : time)),
    }));
  };

  const addTime = () => {
    setDraft((previous) => {
      const last = previous.times[previous.times.length - 1] ?? FIRST_TIME;
      return { ...previous, times: [...previous.times, minutesToTime(timeToMinutes(last) + 720)] };
    });
  };

  const removeTime = (index: number) => {
    setDraft((previous) => ({
      ...previous,
      times: previous.times.filter((_, position) => position !== index),
    }));
  };

  const submit = () => {
    const name = draft.name.trim();
    const times = draft.times.map((time) => time.trim()).filter(Boolean);
    if (!name) {
      setError(t("medicines.errorName"));
      return;
    }
    if (times.length === 0) {
      setError(t("medicines.errorTime"));
      return;
    }
    setError(null);
    onSubmit({ ...draft, name, times });
  };

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      noValidate
    >
      <h1 className="text-[1.6rem] font-bold text-fg">{title}</h1>

      {error ? <WarningBanner title={error} /> : null}

      <InteractionWarning warnings={interactionWarnings} />
      {interactionWarnings.length === 0 ? (
        <p className="text-[0.85rem] leading-relaxed text-fg-muted">
          {t("interactions.shortDisclaimer")}
        </p>
      ) : null}

      <Card className="flex flex-col gap-5">
        <Field label={t("medicines.fieldName")} htmlFor="medicine-name">
          <input
            id="medicine-name"
            className={inputClass}
            value={draft.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder={t("medicines.fieldNamePlaceholder")}
            autoComplete="off"
          />
        </Field>

        <Field label={`${t("medicines.fieldStrength")} (${t("common.optional")})`} htmlFor="medicine-strength">
          <input
            id="medicine-strength"
            className={inputClass}
            value={draft.strength}
            onChange={(event) => update("strength", event.target.value)}
            placeholder={t("medicines.fieldStrengthPlaceholder")}
            autoComplete="off"
          />
        </Field>

        <Field label={t("medicines.fieldForm")} htmlFor="medicine-form">
          <select
            id="medicine-form"
            className={selectClass}
            value={draft.form}
            onChange={(event) => update("form", event.target.value as MedicineFormValue)}
          >
            {MEDICINE_FORMS.map((form) => (
              <option key={form} value={form}>
                {t(`form.${form}`)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t("medicines.fieldDosage")} htmlFor="medicine-dosage">
          <input
            id="medicine-dosage"
            className={inputClass}
            value={draft.dosage}
            onChange={(event) => update("dosage", event.target.value)}
            placeholder={t("medicines.fieldDosagePlaceholder")}
            autoComplete="off"
          />
        </Field>

        <Field label={t("medicines.fieldUnits")} hint={t("medicines.fieldUnitsHint")} htmlFor="medicine-units">
          <input
            id="medicine-units"
            className={inputClass}
            type="number"
            inputMode="numeric"
            min={0}
            value={draft.unitsRemaining ?? ""}
            onChange={(event) =>
              update(
                "unitsRemaining",
                event.target.value === "" ? null : Math.max(0, Number(event.target.value)),
              )
            }
          />
        </Field>
      </Card>

      <Card className="flex flex-col gap-4">
        <FieldGroup legend={t("medicines.fieldFood")}>
          <SegmentedControl
            name="medicine-food"
            ariaLabel={t("medicines.fieldFood")}
            value={draft.food}
            options={FOOD_RELATIONS.map((relation) => ({
              value: relation,
              label: t(`food.${relation}`),
            }))}
            onChange={(next: FoodRelation) => update("food", next)}
          />
        </FieldGroup>
      </Card>

      <Card className="flex flex-col gap-4">
        <FieldGroup legend={t("medicines.fieldTimes")}>
          <ul className="flex flex-col gap-3">
            {draft.times.map((time, index) => (
              <li key={`time-${index}`} className="flex flex-wrap items-end gap-3">
                <div className="flex min-w-[160px] flex-1 flex-col gap-2">
                  <label
                    htmlFor={`medicine-time-${index}`}
                    className="text-[0.9rem] font-semibold text-fg-muted"
                  >
                    {`${t("medicines.fieldTimes")} ${index + 1}`}
                  </label>
                  <input
                    id={`medicine-time-${index}`}
                    type="time"
                    className={inputClass}
                    value={time}
                    onChange={(event) => setTime(index, event.target.value)}
                  />
                </div>
                <p className="min-w-[110px] flex-1 pb-3 text-[0.9rem] font-semibold text-fg">
                  {time ? timeOfDay(timeOfDayFromTime(time)) : "-"}
                </p>
                {draft.times.length > 1 ? (
                  <Button
                    variant="warn"
                    size="sm"
                    icon={<Trash2 size={22} strokeWidth={2.5} />}
                    onClick={() => removeTime(index)}
                    aria-label={`${t("medicines.removeTime")} ${index + 1}`}
                    className="mb-1"
                  >
                    {t("medicines.removeTime")}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          <Button
            variant="secondary"
            size="md"
            fullWidth
            icon={<Plus size={24} strokeWidth={2.5} />}
            onClick={addTime}
          >
            {t("medicines.addTime")}
          </Button>
        </FieldGroup>
      </Card>

      <Card>
        <Field
          label={`${t("medicines.fieldNotes")} (${t("common.optional")})`}
          htmlFor="medicine-notes"
        >
          <textarea
            id="medicine-notes"
            className={`${inputClass} min-h-[112px] py-3`}
            value={draft.notes}
            onChange={(event) => update("notes", event.target.value)}
            placeholder={t("medicines.fieldNotesPlaceholder")}
          />
        </Field>
      </Card>

      <div className="flex flex-col gap-3">
        <Button variant="primary" size="lg" fullWidth type="submit" disabled={busy}>
          {submitLabel}
        </Button>
        <Button variant="secondary" size="lg" fullWidth onClick={onCancel} disabled={busy}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
