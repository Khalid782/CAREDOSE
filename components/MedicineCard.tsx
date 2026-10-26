"use client";

/** One medicine in the list: name, times, stock warning and its two actions. */

import { Pencil, Pill, Trash2 } from "lucide-react";
import { useTranslator } from "@/lib/i18n/useTranslator";
import type { Medicine, ScheduleItem } from "@/lib/data/types";
import { Button } from "./Button";
import { Card } from "./Card";

/** Below this many units left, the card asks the patient to refill. */
const LOW_STOCK_THRESHOLD = 10;

export function MedicineCard({
  medicine,
  times,
  onEdit,
  onDelete,
}: {
  medicine: Medicine;
  /** Schedule rows for this medicine, earliest first. */
  times: ScheduleItem[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t, at, form, food } = useTranslator();
  const isLowStock =
    medicine.unitsRemaining !== null && medicine.unitsRemaining <= LOW_STOCK_THRESHOLD;

  return (
    <Card as="li" className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent"
        >
          <Pill size={26} strokeWidth={2.5} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="text-[1.4rem] font-bold leading-tight text-fg">
            {medicine.name}
            {medicine.strength ? (
              <span className="ml-2 text-[1rem] font-semibold text-fg-muted">
                {medicine.strength}
              </span>
            ) : null}
          </h3>
          <p className="text-[0.9rem] text-fg-muted">{form(medicine.form)}</p>
        </div>
      </div>

      {medicine.notes ? (
        <p className="text-[0.9rem] text-fg-muted">{medicine.notes}</p>
      ) : null}

      {times.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {times.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border-2 border-line bg-surface-3 px-3 py-1 text-[0.9rem] font-semibold text-fg"
            >
              {at(item.time)} · {food(item.food)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[0.9rem] text-fg-muted">{t("medicines.noTimes")}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[0.9rem] font-semibold text-fg-muted">
          {times.length === 1
            ? t("medicines.oncePerDay")
            : t("medicines.timesPerDay", { count: times.length })}
        </span>
        {medicine.unitsRemaining !== null ? (
          <span className="rounded-lg bg-surface-3 px-2 py-1 text-[0.85rem] font-semibold text-fg">
            {t("medicines.unitsLeft", { count: medicine.unitsRemaining })}
          </span>
        ) : null}
        {isLowStock ? (
          <span className="rounded-lg border-2 border-warn-line bg-warn-soft px-2 py-1 text-[0.85rem] font-semibold text-warn-fg">
            {t("medicines.lowStock")}
          </span>
        ) : null}
      </div>

      <div className="flex gap-3">
        <Button
          variant="secondary"
          size="md"
          icon={<Pencil size={22} strokeWidth={2.5} />}
          onClick={onEdit}
          className="flex-1"
        >
          {t("common.edit")}
        </Button>
        <Button
          variant="warn"
          size="md"
          icon={<Trash2 size={22} strokeWidth={2.5} />}
          onClick={onDelete}
          className="flex-1"
        >
          {t("common.delete")}
        </Button>
      </div>
    </Card>
  );
}
