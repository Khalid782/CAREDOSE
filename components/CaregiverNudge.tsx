"use client";

/**
 * The missed-dose caregiver nudge. It appears once a pending dose is 30
 * minutes late and opens WhatsApp or SMS with the message already written.
 * Sending is always the patient's choice; CareDose never sends anything itself.
 */

import { MessageCircle, MessageSquare, UserRound } from "lucide-react";
import Link from "next/link";
import type { Caregiver } from "@/lib/data/types";
import { useTranslator } from "@/lib/i18n/useTranslator";
import { buttonClass } from "./Button";

/** A dose has to be this late before the caregiver nudge appears. */
export const NUDGE_AFTER_MS = 30 * 60 * 1000;

/**
 * WhatsApp needs a number with country code and no punctuation. A bare
 * 10-digit Indian number is assumed to be +91; a leading 0 is dropped.
 */
export function caregiverPhoneDigits(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = `91${digits.slice(1)}`;
  if (digits.length === 10) digits = `91${digits}`;
  return digits;
}

export function caregiverLinks(phone: string, message: string) {
  const digits = caregiverPhoneDigits(phone);
  const text = encodeURIComponent(message);
  return {
    whatsapp: `https://wa.me/${digits}?text=${text}`,
    sms: `sms:+${digits}?body=${text}`,
  };
}

export function CaregiverNudge({
  caregiver,
  medicineName,
  time,
}: {
  caregiver: Caregiver | null;
  medicineName: string;
  /** 24h wall-clock time, formatted for the current language here. */
  time: string;
}) {
  const { t, at } = useTranslator();
  const phone = caregiver?.phone.trim() ?? "";

  if (!phone) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border-2 border-line bg-surface-2 p-3">
        <p className="flex items-start gap-2 text-[0.9rem] font-semibold text-fg">
          <UserRound size={20} strokeWidth={2.5} aria-hidden="true" className="mt-0.5 shrink-0" />
          {t("nudge.noCaregiver")}
        </p>
        <Link
          href="/settings"
          className={buttonClass({ variant: "secondary", size: "sm", fullWidth: true })}
        >
          {t("nudge.settings")}
        </Link>
      </div>
    );
  }

  const message = t("nudge.message", { name: medicineName, time: at(time) });
  const links = caregiverLinks(phone, message);

  return (
    <div className="flex flex-col gap-3 rounded-xl border-2 border-warn-line bg-warn-soft p-3">
      <div className="flex flex-col gap-1">
        <p className="text-base font-bold text-warn-fg">{t("nudge.title")}</p>
        <p className="text-[0.9rem] leading-relaxed text-warn-fg">
          {t("nudge.body", { name: medicineName, time: at(time) })}
        </p>
        {caregiver?.name ? (
          <p className="text-[0.85rem] font-semibold text-warn-fg">
            {t("nudge.caregiver", { name: caregiver.name, phone })}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <a
          href={links.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass({ variant: "primary", size: "md", fullWidth: true })}
        >
          <span aria-hidden="true" className="shrink-0">
            <MessageCircle size={24} strokeWidth={2.5} />
          </span>
          <span>{t("nudge.whatsapp")}</span>
        </a>
        <a
          href={links.sms}
          className={buttonClass({ variant: "secondary", size: "md", fullWidth: true })}
        >
          <span aria-hidden="true" className="shrink-0">
            <MessageSquare size={24} strokeWidth={2.5} />
          </span>
          <span>{t("nudge.sms")}</span>
        </a>
      </div>
    </div>
  );
}
