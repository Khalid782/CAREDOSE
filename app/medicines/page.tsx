"use client";

/**
 * Medicines — the list of medicines with add, edit and delete.
 *
 * Both the form and the delete confirmation replace the list in place, so the
 * patient never loses the bottom navigation or ends up in a stacked menu.
 */

import { Pill, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { MedicineCard } from "@/components/MedicineCard";
import { EMPTY_MEDICINE_DRAFT, MedicineForm } from "@/components/MedicineForm";
import { PageHeader } from "@/components/PageHeader";
import { WarningBanner } from "@/components/WarningBanner";
import { useCareData } from "@/lib/context/CareDataProvider";
import { compareTimes } from "@/lib/data/time";
import type { MedicineDraft, ScheduleItem } from "@/lib/data/types";
import { useTranslator } from "@/lib/i18n/useTranslator";

type View =
  | { mode: "list" }
  | { mode: "form"; medicineId: string | null }
  | { mode: "confirmDelete"; medicineId: string };

export default function MedicinesPage() {
  const { t } = useTranslator();
  const { medicines, scheduleItems, saveMedicine, deleteMedicine } = useCareData();
  const [view, setView] = useState<View>({ mode: "list" });
  const [busy, setBusy] = useState(false);

  const timesByMedicine = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const item of scheduleItems) {
      const list = map.get(item.medicineId) ?? [];
      list.push(item);
      map.set(item.medicineId, list);
    }
    for (const list of map.values()) list.sort((a, b) => compareTimes(a.time, b.time));
    return map;
  }, [scheduleItems]);

  if (view.mode === "form") {
    const editing = view.medicineId
      ? medicines.find((medicine) => medicine.id === view.medicineId)
      : undefined;
    const initial: MedicineDraft | undefined = editing
      ? {
          name: editing.name,
          strength: editing.strength,
          form: editing.form,
          dosage: timesByMedicine.get(editing.id)?.[0]?.dosage ?? "1",
          food: timesByMedicine.get(editing.id)?.[0]?.food ?? "after",
          notes: editing.notes,
          unitsRemaining: editing.unitsRemaining,
          times: (timesByMedicine.get(editing.id) ?? []).map((item) => item.time),
        }
      : EMPTY_MEDICINE_DRAFT;

    return (
      <MedicineForm
        initial={initial}
        medicineId={editing?.id}
        title={editing ? t("medicines.formTitleEdit") : t("medicines.formTitleNew")}
        submitLabel={t("common.save")}
        busy={busy}
        onCancel={() => setView({ mode: "list" })}
        onSubmit={(draft) => {
          setBusy(true);
          void saveMedicine(draft, editing?.id)
            .then(() => setView({ mode: "list" }))
            .finally(() => setBusy(false));
        }}
      />
    );
  }

  if (view.mode === "confirmDelete") {
    const target = medicines.find((medicine) => medicine.id === view.medicineId);
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-[1.6rem] font-bold text-fg">{t("medicines.deleteTitle")}</h1>
        <WarningBanner title={t("medicines.deleteTitle")}>
          <p>{t("medicines.deleteBody", { name: target?.name ?? "" })}</p>
        </WarningBanner>
        <Button
          variant="warn"
          size="lg"
          fullWidth
          disabled={busy}
          onClick={() => {
            if (!target) {
              setView({ mode: "list" });
              return;
            }
            setBusy(true);
            void deleteMedicine(target.id)
              .then(() => setView({ mode: "list" }))
              .finally(() => setBusy(false));
          }}
        >
          {t("medicines.deleteConfirm")}
        </Button>
        <Button variant="secondary" size="lg" fullWidth onClick={() => setView({ mode: "list" })}>
          {t("common.cancel")}
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={t("medicines.title")}
        subtitle={
          medicines.length === 1
            ? t("medicines.subtitleOne")
            : t("medicines.subtitle", { count: medicines.length })
        }
      />

      {medicines.length === 0 ? (
        <EmptyState
          icon={<Pill size={36} strokeWidth={2.5} />}
          title={t("medicines.emptyTitle")}
          message={t("medicines.emptyBody")}
          action={
            <Button
              size="lg"
              fullWidth
              icon={<Plus size={28} strokeWidth={3} />}
              onClick={() => setView({ mode: "form", medicineId: null })}
            >
              {t("medicines.emptyAction")}
            </Button>
          }
        />
      ) : (
        <>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<Plus size={28} strokeWidth={3} />}
            onClick={() => setView({ mode: "form", medicineId: null })}
          >
            {t("medicines.add")}
          </Button>

          <ul className="flex flex-col gap-4">
            {medicines.map((medicine) => (
              <MedicineCard
                key={medicine.id}
                medicine={medicine}
                times={timesByMedicine.get(medicine.id) ?? []}
                onEdit={() => setView({ mode: "form", medicineId: medicine.id })}
                onDelete={() => setView({ mode: "confirmDelete", medicineId: medicine.id })}
              />
            ))}
          </ul>
        </>
      )}
    </>
  );
}
