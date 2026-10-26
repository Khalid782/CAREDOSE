/**
 * Dose alarms.
 *
 * `AlarmService` is the seam for the browser implementation used today and a
 * future Capacitor Local Notifications adapter. The timing rules are pure and
 * testable; the browser service only plays sound, speaks and shows a
 * notification.
 */

import { scheduledAt } from "@/lib/data/time";
import type { Language } from "@/lib/data/types";
import type { PlannedDose } from "@/lib/schedule";

/** The alarm repeats this often while it is unanswered. */
export const ALARM_REPEAT_MS = 5 * 60 * 1000;
/** "Snooze 10 min" on the full-screen alarm. */
export const SNOOZE_MS = 10 * 60 * 1000;
/** A dose older than this is treated as missed rather than alarmed at startup. */
export const ALERT_MAX_LATENESS_MS = 60 * 60 * 1000;

export interface DoseAlert {
  /** Stable dose key from the schedule engine, e.g. "sch_1@2026-10-26". */
  id: string;
  scheduleItemId: string;
  medicineId: string;
  medicineName: string;
  instruction: string;
  date: string;
  time: string;
  dueAt: number;
  language: Language;
}

export type AlarmPermission = NotificationPermission | "unsupported";

/**
 * Everything the UI needs from an alarm provider. A Capacitor adapter can
 * implement this without touching the screens.
 */
export interface AlarmService {
  /** Asks for notification permission and unlocks audio on a user gesture. */
  enable(): Promise<AlarmPermission>;
  /** Unlocks audio on a user gesture without asking for notification permission. */
  unlock(): Promise<void>;
  /** Starts or refreshes the sound, speech and notification for one dose. */
  trigger(alert: DoseAlert): Promise<void>;
  /** Stops sound, speech and the current notification. */
  stop(): void;
  dispose(): void;
}

export function toDoseAlert(dose: PlannedDose, language: Language): DoseAlert {
  return {
    id: dose.id,
    scheduleItemId: dose.schedule.id,
    medicineId: dose.medicine.id,
    medicineName: dose.medicine.name,
    instruction: dose.instruction,
    date: dose.date,
    time: dose.time,
    dueAt: scheduledAt(dose.date, dose.time).getTime(),
    language,
  };
}

/**
 * The first unanswered dose that is due now and not snoozed. Doses more than
 * `maxLatenessMs` old are left to the missed-dose caregiver nudge instead of
 * surprising the patient with an alarm when the app is opened hours later.
 */
export function findDueDose(
  doses: readonly PlannedDose[],
  now: number,
  snoozedUntil: Readonly<Record<string, number>> = {},
  maxLatenessMs: number = ALERT_MAX_LATENESS_MS,
): PlannedDose | null {
  return (
    doses
      .filter((dose) => {
        if (dose.log) return false;
        const snooze = snoozedUntil[dose.id] ?? 0;
        if (snooze > now) return false;
        const dueAt = scheduledAt(dose.date, dose.time).getTime();
        return now >= dueAt && now - dueAt <= maxLatenessMs;
      })
      .sort((a, b) => a.time.localeCompare(b.time))[0] ?? null
  );
}

function notificationPermission(): AlarmPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/**
 * Browser implementation: Web Audio loop + speechSynthesis + Notification.
 * The sound can only start reliably after a user gesture, which is why the
 * Settings screen calls `enable()` from its button.
 */
export function createBrowserAlarmService(): AlarmService {
  let audioContext: AudioContext | null = null;
  let oscillator: OscillatorNode | null = null;
  let soundGain: GainNode | null = null;
  let pulseTimer: number | null = null;
  let currentNotification: Notification | null = null;

  const getAudioContext = async (): Promise<AudioContext | null> => {
    if (typeof window === "undefined") return null;
    if (!audioContext) {
      const AudioContextClass =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;
      try {
        audioContext = new AudioContextClass();
      } catch {
        return null;
      }
    }
    if (audioContext.state === "suspended") {
      try {
        await audioContext.resume();
      } catch {
        // The browser may refuse until the next gesture; the overlay still shows.
      }
    }
    return audioContext;
  };

  const stopSound = () => {
    if (pulseTimer !== null) {
      window.clearInterval(pulseTimer);
      pulseTimer = null;
    }
    if (soundGain && audioContext) {
      soundGain.gain.setTargetAtTime(0.0001, audioContext.currentTime, 0.02);
    }
    if (oscillator) {
      try {
        oscillator.stop();
      } catch {
        // Already stopped.
      }
      oscillator.disconnect();
      oscillator = null;
    }
    if (soundGain) {
      soundGain.disconnect();
      soundGain = null;
    }
  };

  const startSound = async () => {
    const context = await getAudioContext();
    if (!context || oscillator) return;

    const nextOscillator = context.createOscillator();
    const nextGain = context.createGain();
    nextOscillator.type = "sine";
    nextOscillator.frequency.value = 880;
    nextGain.gain.value = 0.0001;
    nextOscillator.connect(nextGain);
    nextGain.connect(context.destination);
    nextOscillator.start();

    oscillator = nextOscillator;
    soundGain = nextGain;

    let loud = false;
    const pulse = () => {
      if (!soundGain || !audioContext) return;
      loud = !loud;
      soundGain.gain.setTargetAtTime(loud ? 0.18 : 0.0001, audioContext.currentTime, 0.02);
    };
    pulse();
    pulseTimer = window.setInterval(pulse, 700);
  };

  const speak = (alert: DoseAlert) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        `${alert.medicineName}. ${alert.instruction}`,
      );
      utterance.lang = alert.language === "hi" ? "hi-IN" : "en-IN";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech is an extra cue; the overlay and sound still work.
    }
  };

  const showNotification = (alert: DoseAlert) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    try {
      currentNotification?.close();
      currentNotification = new Notification("Time for your medicine", {
        body: `${alert.medicineName} — ${alert.instruction}`,
        icon: "/icons/icon-192.png",
        tag: `caredose-alert-${alert.id}`,
        requireInteraction: true,
      });
      currentNotification.onclick = () => {
        window.focus();
        currentNotification?.close();
      };
    } catch {
      // Some Android browsers only allow notifications from a service worker.
    }
  };

  return {
    async enable() {
      await getAudioContext();
      if (typeof window === "undefined" || !("Notification" in window)) {
        return "unsupported";
      }
      if (Notification.permission === "default") {
        try {
          return await Notification.requestPermission();
        } catch {
          return notificationPermission();
        }
      }
      return Notification.permission;
    },

    async unlock() {
      await getAudioContext();
    },

    async trigger(alert) {
      await startSound();
      speak(alert);
      showNotification(alert);
    },

    stop() {
      stopSound();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      currentNotification?.close();
      currentNotification = null;
    },

    dispose() {
      stopSound();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      currentNotification?.close();
      currentNotification = null;
      if (audioContext) {
        void audioContext.close().catch(() => undefined);
        audioContext = null;
      }
    },
  };
}

/** The service the app uses today. Swap this for Capacitor later. */
export const browserAlarmService: AlarmService = createBrowserAlarmService();
