"use client";

/**
 * High-priority interaction warning shown before a medicine is saved.
 * The wording is deliberately cautious: this is general information, not a
 * diagnosis or a replacement for a doctor or pharmacist.
 */

import Link from "next/link";
import { useTranslator } from "@/lib/i18n/useTranslator";
import type { InteractionWarning as InteractionWarningData } from "@/lib/interactions";
import { WarningBanner } from "./WarningBanner";

export function InteractionWarning({
  warnings,
}: {
  warnings: readonly InteractionWarningData[];
}) {
  const { t } = useTranslator();
  if (warnings.length === 0) return null;

  return (
    <WarningBanner urgent title={t("interactions.title")}>
      <ul className="flex flex-col gap-3">
        {warnings.map((warning) => (
          <li key={warning.id} className="rounded-xl border-2 border-warn-line bg-surface p-3">
            <p className="flex flex-wrap items-baseline gap-2 font-bold">
              <span className="text-base">
                {t("interactions.pair", {
                  a: warning.medicineAName,
                  b: warning.medicineBName,
                })}
              </span>
              <span className="rounded-md border border-warn-line bg-warn-soft px-2 py-0.5 text-[0.8rem] font-bold uppercase tracking-wide">
                {t(`interactions.severity.${warning.severity}`)}
              </span>
            </p>
            <p className="mt-1 text-[0.9rem] leading-relaxed">{warning.explanation}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[0.9rem] font-semibold">{t("interactions.disclaimer")}</p>
      <Link
        href="/about"
        className="mt-2 inline-flex min-h-[48px] items-center font-semibold underline underline-offset-2"
      >
        {t("interactions.aboutLink")}
      </Link>
    </WarningBanner>
  );
}
