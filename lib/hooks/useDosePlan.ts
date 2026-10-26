"use client";

/**
 * The Today screen's data: saved medicines + meal times from Settings, turned
 * into this date's doses with plain-language instructions.
 */

import { useMemo } from "react";
import { useCareData } from "@/lib/context/CareDataProvider";
import { useSettings } from "@/lib/context/SettingsProvider";
import { DEFAULT_MEAL_TIMES } from "@/lib/data/types";
import { useTranslator } from "@/lib/i18n/useTranslator";
import { buildDosePlan, type PlannedDose } from "@/lib/schedule";

export function useDosePlan(dateKey: string): PlannedDose[] {
  const { medicines, scheduleItems, doseLogs } = useCareData();
  const { settings } = useSettings();
  const { language } = useTranslator();

  return useMemo(
    () =>
      buildDosePlan({
        dateKey,
        medicines,
        scheduleItems,
        doseLogs,
        mealTimes: settings?.mealTimes ?? DEFAULT_MEAL_TIMES,
        language,
      }),
    [dateKey, medicines, scheduleItems, doseLogs, settings?.mealTimes, language],
  );
}
