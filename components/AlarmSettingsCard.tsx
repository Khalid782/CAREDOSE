"use client";

/**
 * Turns on the browser alarm from a real tap: Web Audio and Notification
 * permissions both need a user gesture. The card is honest that browser alarms
 * only run while CareDose is open.
 */

import { BellRing, BellOff, TriangleAlert } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { browserAlarmService, type AlarmPermission } from "@/lib/alerts";
import { useTranslator } from "@/lib/i18n/useTranslator";
import { Button } from "./Button";
import { Card, CardTitle } from "./Card";

function notificationPermission(): AlarmPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Re-read permission when the tab regains focus, e.g. after browser settings. */
function subscribePermission(onChange: () => void) {
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

export function AlarmSettingsCard() {
  const { t } = useTranslator();
  const permission = useSyncExternalStore(
    subscribePermission,
    notificationPermission,
    () => "default" as const,
  );
  const [busy, setBusy] = useState(false);

  const enable = async () => {
    setBusy(true);
    try {
      await browserAlarmService.enable();
    } finally {
      // Re-rendering reads Notification.permission through the store above.
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col gap-4">
      <CardTitle icon={<BellRing size={26} strokeWidth={2.5} />}>{t("settings.alarms")}</CardTitle>
      <p className="text-[0.9rem] leading-relaxed text-fg-muted">{t("settings.alarmsHint")}</p>

      {permission === "granted" ? (
        <p className="flex items-center gap-2 text-base font-semibold text-ok-fg">
          <BellRing size={22} strokeWidth={2.5} aria-hidden="true" />
          {t("settings.alarmsReady")} · {t("settings.alarmsGranted")}
        </p>
      ) : permission === "denied" ? (
        <p className="flex items-start gap-2 text-[0.9rem] font-semibold text-warn-fg">
          <TriangleAlert size={22} strokeWidth={2.5} aria-hidden="true" className="shrink-0" />
          {t("settings.alarmsBlocked")}
        </p>
      ) : permission === "unsupported" ? (
        <p className="flex items-start gap-2 text-[0.9rem] font-semibold text-fg">
          <BellOff size={22} strokeWidth={2.5} aria-hidden="true" className="shrink-0" />
          {t("settings.alarmsUnsupported")}
        </p>
      ) : (
        <Button
          variant="primary"
          size="md"
          fullWidth
          disabled={busy}
          icon={<BellRing size={24} strokeWidth={2.5} />}
          onClick={() => void enable()}
        >
          {t("settings.alarmsEnable")}
        </Button>
      )}
    </Card>
  );
}
