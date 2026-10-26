"use client";

/**
 * Watches today's doses and opens the full-screen alarm when one is due.
 * Every action is written through the existing data layer, so Today, History
 * and the alarm always agree.
 *
 * CareDose checks for due doses on a short timer rather than synchronously in
 * an effect. While this provider is mounted, the alarm repeats every five
 * minutes until Take, Snooze or Skip answers it.
 */

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { DoseAlarm } from "@/components/DoseAlarm";
import {
  ALARM_REPEAT_MS,
  SNOOZE_MS,
  browserAlarmService,
  findDueDose,
  toDoseAlert,
  type DoseAlert,
} from "@/lib/alerts";
import { toDateKey } from "@/lib/data/time";
import { useDosePlan } from "@/lib/hooks/useDosePlan";
import { useNow } from "@/lib/hooks/useNow";
import { useTranslator } from "@/lib/i18n/useTranslator";
import { useCareData } from "./CareDataProvider";

const DUE_CHECK_MS = 5000;

/** Never changes; used only to tell the server render apart from the client. */
function subscribeNever() {
  return () => undefined;
}

export function AlarmProvider({ children }: { children: ReactNode }) {
  // The alarm needs the current time, which Next.js cannot prerender. Render
  // only the app on the server and during hydration; mount the clock after.
  const isClient = useSyncExternalStore(subscribeNever, () => true, () => false);
  if (!isClient) return <>{children}</>;
  return <AlarmRuntime>{children}</AlarmRuntime>;
}

function AlarmRuntime({ children }: { children: ReactNode }) {
  const { status, setDoseStatus } = useCareData();
  const { language } = useTranslator();
  const now = useNow(15000);
  const dateKey = toDateKey(now);
  const doses = useDosePlan(dateKey);

  const [activeAlert, setActiveAlert] = useState<DoseAlert | null>(null);
  const [snoozedUntil, setSnoozedUntil] = useState<Record<string, number>>({});

  // Poll for the next due dose while no alarm is already open.
  useEffect(() => {
    if (status !== "ready") return;

    const check = () => {
      setActiveAlert((current) => {
        if (current) return current;
        const due = findDueDose(doses, Date.now(), snoozedUntil);
        return due ? toDoseAlert(due, language) : current;
      });
    };

    const initialCheck = window.setTimeout(check, 0);
    const poll = window.setInterval(check, DUE_CHECK_MS);
    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(poll);
    };
  }, [status, doses, snoozedUntil, language]);

  // Start the sound, speech and notification for a newly opened alarm. The
  // service itself is idempotent, so re-renders do not stack sounds.
  useEffect(() => {
    if (!activeAlert) return;
    void browserAlarmService.trigger(activeAlert);
  }, [activeAlert]);

  // Keep the alarm alive until it is answered, repeating every five minutes.
  useEffect(() => {
    if (!activeAlert) return;
    const timer = window.setInterval(() => {
      void browserAlarmService.trigger(activeAlert);
    }, ALARM_REPEAT_MS);
    return () => window.clearInterval(timer);
  }, [activeAlert]);

  // Browsers only allow audio after a real gesture. Unlock on the first tap or
  // key press so a later alarm can actually make a sound.
  useEffect(() => {
    const unlock = () => {
      void browserAlarmService.unlock();
    };
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    return () => browserAlarmService.stop();
  }, []);

  const close = () => {
    browserAlarmService.stop();
    setActiveAlert(null);
  };

  const take = async () => {
    const alert = activeAlert;
    if (!alert) return;
    close();
    await setDoseStatus(alert.scheduleItemId, alert.date, "taken");
  };

  const skip = async () => {
    const alert = activeAlert;
    if (!alert) return;
    close();
    await setDoseStatus(alert.scheduleItemId, alert.date, "skipped");
  };

  const snooze = () => {
    const alert = activeAlert;
    if (!alert) return;
    browserAlarmService.stop();
    setSnoozedUntil((previous) => ({
      ...previous,
      [alert.id]: Date.now() + SNOOZE_MS,
    }));
    setActiveAlert(null);
  };

  return (
    <>
      {children}
      {activeAlert ? (
        <DoseAlarm
          alert={activeAlert}
          onTake={() => void take()}
          onSnooze={snooze}
          onSkip={() => void skip()}
        />
      ) : null}
    </>
  );
}
