"use client";

/**
 * Settings — every preference on one flat screen: text size, language, dark
 * mode, meal times, the caregiver's name and phone, and which data source is in
 * use. Every choice saves immediately, except the caregiver details which have
 * an explicit Save button.
 */

import { BookOpen, Database, Moon, RotateCcw, Sun, UserRound, Utensils } from "lucide-react";
import { useState } from "react";
import { AlarmSettingsCard } from "@/components/AlarmSettingsCard";
import { Button, LinkButton } from "@/components/Button";
import { Card, CardTitle } from "@/components/Card";
import { Field, FieldGroup, inputClass } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Toggle } from "@/components/Toggle";
import { WarningBanner } from "@/components/WarningBanner";
import { useCareData } from "@/lib/context/CareDataProvider";
import { useSettings } from "@/lib/context/SettingsProvider";
import { getDataSource } from "@/lib/data";
import {
  FONT_SIZES,
  LANGUAGES,
  type Caregiver,
  type FontSize,
  type Language,
  type MealTimes,
} from "@/lib/data/types";
import { LANGUAGE_LABELS } from "@/lib/i18n/dictionary";
import { useTranslator } from "@/lib/i18n/useTranslator";

const APP_VERSION = "0.1.0";

const MEAL_ORDER: Array<keyof MealTimes> = ["breakfast", "lunch", "dinner", "bedtime"];

export default function SettingsPage() {
  const { t, meal } = useTranslator();
  const { settings, updateSettings, reloadSettings } = useSettings();
  const { primaryCaregiver, resetSampleData } = useCareData();
  const [busy, setBusy] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  /** Bumped on reset so the caregiver card picks up the sample details again. */
  const [caregiverRevision, setCaregiverRevision] = useState(0);

  const dataSource = getDataSource();

  return (
    <>
      <PageHeader title={t("settings.title")} />

      <Card className="flex flex-col gap-4">
        <FieldGroup legend={t("settings.textSize")} hint={t("settings.textSizeHint")}>
          <SegmentedControl
            name="font-size"
            ariaLabel={t("settings.textSize")}
            value={settings?.fontSize ?? "normal"}
            options={FONT_SIZES.map((size) => ({ value: size, label: t(`fontSize.${size}`) }))}
            onChange={(next: FontSize) => void updateSettings({ fontSize: next })}
          />
          <p className="rounded-xl border-2 border-line bg-surface-2 p-3 text-base text-fg">
            {t("settings.textSizePreview")}
          </p>
        </FieldGroup>
      </Card>

      <Card className="flex flex-col gap-4">
        <FieldGroup legend={t("settings.language")}>
          <SegmentedControl
            name="language"
            ariaLabel={t("settings.language")}
            value={settings?.language ?? "en"}
            options={LANGUAGES.map((language) => ({
              value: language,
              label: LANGUAGE_LABELS[language],
            }))}
            onChange={(next: Language) => void updateSettings({ language: next })}
          />
        </FieldGroup>
      </Card>

      <Toggle
        label={t("settings.darkMode")}
        hint={t("settings.darkModeHint")}
        icon={
          settings?.theme === "dark" ? (
            <Moon size={26} strokeWidth={2.5} />
          ) : (
            <Sun size={26} strokeWidth={2.5} />
          )
        }
        checked={settings?.theme === "dark"}
        onChange={(next) => void updateSettings({ theme: next ? "dark" : "light" })}
      />

      <Card className="flex flex-col gap-4">
        <CardTitle icon={<Utensils size={26} strokeWidth={2.5} />}>
          {t("settings.mealTimes")}
        </CardTitle>
        <p className="text-[0.9rem] text-fg-muted">{t("settings.mealTimesHint")}</p>
        {MEAL_ORDER.map((slot) => (
          <Field key={slot} label={meal(slot)} htmlFor={`meal-${slot}`}>
            <input
              id={`meal-${slot}`}
              type="time"
              className={inputClass}
              value={settings?.mealTimes[slot] ?? ""}
              onChange={(event) => {
                if (!settings) return;
                void updateSettings({
                  mealTimes: { ...settings.mealTimes, [slot]: event.target.value },
                });
              }}
            />
          </Field>
        ))}
      </Card>

      <CaregiverCard
        key={`${primaryCaregiver?.id ?? "none"}-${caregiverRevision}`}
        caregiver={primaryCaregiver}
      />

      <AlarmSettingsCard />

      <Card className="flex flex-col gap-4">
        <CardTitle icon={<Database size={26} strokeWidth={2.5} />}>
          {t("settings.dataTitle")}
        </CardTitle>
        <p className="text-base font-semibold text-fg">
          {dataSource === "supabase" ? t("settings.dataSupabase") : t("settings.dataMock")}
        </p>
        <p className="text-[0.9rem] text-fg-muted">{t("settings.dataHint")}</p>

        {confirmingReset ? (
          <div className="flex flex-col gap-3">
            <WarningBanner title={t("settings.resetTitle")}>
              <p>{t("settings.resetBody")}</p>
            </WarningBanner>
            <Button
              variant="warn"
              size="lg"
              fullWidth
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void resetSampleData()
                  .then(() => reloadSettings())
                  .then(() => {
                    setCaregiverRevision((previous) => previous + 1);
                    setConfirmingReset(false);
                  })
                  .finally(() => setBusy(false));
              }}
            >
              {t("settings.resetConfirm")}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => setConfirmingReset(false)}
            >
              {t("common.cancel")}
            </Button>
          </div>
        ) : (
          <Button
            variant="warn"
            size="md"
            fullWidth
            icon={<RotateCcw size={24} strokeWidth={2.5} />}
            onClick={() => setConfirmingReset(true)}
          >
            {t("settings.reset")}
          </Button>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle icon={<BookOpen size={26} strokeWidth={2.5} />}>
          {t("settings.about")}
        </CardTitle>
        <p className="text-base font-semibold text-fg">
          {t("settings.version", { version: APP_VERSION })}
        </p>
        <p className="text-[0.9rem] text-fg-muted">{t("settings.aboutBody")}</p>
        <LinkButton
          href="/about"
          variant="secondary"
          size="md"
          fullWidth
          icon={<BookOpen size={24} strokeWidth={2.5} />}
        >
          {t("settings.aboutLink")}
        </LinkButton>
      </Card>
    </>
  );
}

/**
 * The caregiver details start from whatever is stored and are kept in local
 * state until Save. The parent gives this card a key, so a new stored caregiver
 * (first load, or after a reset) remounts it with the right starting values.
 */
function CaregiverCard({ caregiver }: { caregiver: Caregiver | null }) {
  const { t } = useTranslator();
  const { saveCaregiver } = useCareData();
  const [name, setName] = useState(caregiver?.name ?? "");
  const [phone, setPhone] = useState(caregiver?.phone ?? "");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <Card className="flex flex-col gap-4">
      <CardTitle icon={<UserRound size={26} strokeWidth={2.5} />}>
        {t("settings.caregiver")}
      </CardTitle>
      <p className="text-[0.9rem] text-fg-muted">{t("settings.caregiverHint")}</p>

      <Field label={t("settings.caregiverName")} htmlFor="caregiver-name">
        <input
          id="caregiver-name"
          className={inputClass}
          value={name}
          placeholder={t("settings.caregiverNamePlaceholder")}
          autoComplete="name"
          onChange={(event) => {
            setName(event.target.value);
            setSaved(false);
          }}
        />
      </Field>

      <Field label={t("settings.caregiverPhone")} htmlFor="caregiver-phone">
        <input
          id="caregiver-phone"
          className={inputClass}
          type="tel"
          inputMode="tel"
          value={phone}
          autoComplete="tel"
          onChange={(event) => {
            setPhone(event.target.value);
            setSaved(false);
          }}
        />
      </Field>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void saveCaregiver({ name: name.trim(), phone: phone.trim() })
            .then(() => setSaved(true))
            .finally(() => setBusy(false));
        }}
      >
        {t("common.save")}
      </Button>

      {saved ? (
        <p className="text-[0.9rem] font-semibold text-ok-fg">{t("settings.caregiverSaved")}</p>
      ) : null}
    </Card>
  );
}
