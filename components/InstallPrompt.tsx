"use client";

/**
 * A single, dismissible install prompt. Chrome and Edge can open the browser's
 * install dialog directly; iPhone and iPad get the Share → Add to Home Screen
 * instruction because Safari has no install prompt event.
 */

import { Download, Share, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useInstallPrompt } from "@/lib/hooks/useInstallPrompt";
import { useTranslator } from "@/lib/i18n/useTranslator";
import { Button } from "./Button";

const DISMISSED_KEY = "caredose:install-dismissed";
const DISMISSED_EVENT = "caredose:install-dismissed-changed";

function subscribeDismissed(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(DISMISSED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(DISMISSED_EVENT, onChange);
  };
}

function wasDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const { t } = useTranslator();
  const { canInstall, installed, isIos, install } = useInstallPrompt();
  const storedDismissed = useSyncExternalStore(subscribeDismissed, wasDismissed, () => true);
  const [dismissedNow, setDismissedNow] = useState(false);
  const [busy, setBusy] = useState(false);
  const dismissed = storedDismissed || dismissedNow;

  const dismiss = () => {
    setDismissedNow(true);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
      window.dispatchEvent(new Event(DISMISSED_EVENT));
    } catch {
      // Storage can be unavailable in private mode; this visit stays hidden.
    }
  };

  if (dismissed || installed) return null;
  if (!canInstall && !isIos) return null;

  const installNow = async () => {
    setBusy(true);
    try {
      await install();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-label={t("pwa.install")}
      className="relative flex flex-col gap-3 rounded-2xl border-2 border-accent bg-accent-soft p-4 pr-12"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("pwa.dismiss")}
        className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-lg text-fg hover:bg-surface-3"
      >
        <X size={24} strokeWidth={2.5} aria-hidden="true" />
      </button>

      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-0.5 shrink-0 text-accent">
          {canInstall ? (
            <Download size={28} strokeWidth={2.5} />
          ) : (
            <Share size={28} strokeWidth={2.5} />
          )}
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-[1.1rem] font-bold text-fg">{t("pwa.install")}</h2>
          <p className="text-[0.9rem] leading-relaxed text-fg">
            {canInstall ? t("pwa.installHint") : t("pwa.iosHint")}
          </p>
        </div>
      </div>

      {canInstall ? (
        <Button
          variant="primary"
          size="md"
          fullWidth
          disabled={busy}
          icon={<Download size={24} strokeWidth={2.5} />}
          onClick={() => void installNow()}
        >
          {t("pwa.install")}
        </Button>
      ) : (
        <Button variant="secondary" size="sm" fullWidth onClick={dismiss}>
          {t("pwa.dismiss")}
        </Button>
      )}
    </section>
  );
}
