"use client";

/**
 * The medical disclaimer, in one plain-language page linked from Settings and
 * from every medicine-interaction warning.
 */

import {
  BellRing,
  CircleHelp,
  Database,
  Phone,
  Pill,
  ScanLine,
  ShieldAlert,
} from "lucide-react";
import { LinkButton } from "@/components/Button";
import { Card, CardTitle } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { WarningBanner } from "@/components/WarningBanner";
import { getDataSource } from "@/lib/data";
import { useTranslator } from "@/lib/i18n/useTranslator";

const APP_VERSION = "0.1.0";

export default function AboutPage() {
  const { t } = useTranslator();
  const dataSource = getDataSource();

  return (
    <>
      <PageHeader title={t("about.title")} subtitle="CareDose" />

      <WarningBanner urgent title={t("about.notAdviceTitle")}>
        <p>{t("about.notAdviceBody")}</p>
      </WarningBanner>

      <Card className="flex flex-col gap-3">
        <CardTitle icon={<CircleHelp size={26} strokeWidth={2.5} />}>
          {t("about.whatTitle")}
        </CardTitle>
        <p className="text-base leading-relaxed text-fg">{t("about.intro")}</p>
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle icon={<ShieldAlert size={26} strokeWidth={2.5} />}>
          {t("about.interactionsTitle")}
        </CardTitle>
        <p className="text-[0.95rem] leading-relaxed text-fg">{t("about.interactionsBody")}</p>
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle icon={<ScanLine size={26} strokeWidth={2.5} />}>
          {t("about.scanTitle")}
        </CardTitle>
        <p className="text-[0.95rem] leading-relaxed text-fg">{t("about.scanBody")}</p>
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle icon={<BellRing size={26} strokeWidth={2.5} />}>
          {t("about.alarmsTitle")}
        </CardTitle>
        <p className="text-[0.95rem] leading-relaxed text-fg">{t("about.alarmsBody")}</p>
      </Card>

      <WarningBanner title={t("about.emergencyTitle")}>
        <p className="flex items-start gap-2">
          <Phone size={22} strokeWidth={2.5} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>{t("about.emergencyBody")}</span>
        </p>
      </WarningBanner>

      <Card className="flex flex-col gap-3">
        <CardTitle icon={<Database size={26} strokeWidth={2.5} />}>
          {t("about.dataTitle")}
        </CardTitle>
        <p className="text-[0.95rem] leading-relaxed text-fg">
          {dataSource === "supabase" ? t("about.dataSupabase") : t("about.dataLocal")}
        </p>
      </Card>

      <Card className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-base font-semibold text-fg">
          <Pill size={22} strokeWidth={2.5} aria-hidden="true" />
          {t("about.version", { version: APP_VERSION })}
        </p>
      </Card>

      <LinkButton href="/settings" variant="secondary" size="lg" fullWidth>
        {t("about.back")}
      </LinkButton>
    </>
  );
}
