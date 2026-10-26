"use client";

/**
 * The frame every screen sits in: a phone-width column (works from 360px up),
 * a bottom navigation bar that always stays reachable, and the two states the
 * app can be in before the data is ready.
 */

import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useCareData } from "@/lib/context/CareDataProvider";
import { useTranslator } from "@/lib/i18n/useTranslator";
import { BottomNav } from "./BottomNav";
import { Button } from "./Button";
import { WarningBanner } from "./WarningBanner";

/** Leaves room for the fixed bottom navigation at every text size. */
const CONTENT_BOTTOM_PADDING = "pb-[124px]";

export function AppShell({ children }: { children: ReactNode }) {
  const { status, error, retry } = useCareData();
  const { t } = useTranslator();

  return (
    <div className="flex min-h-dvh flex-col pt-safe">
      <main
        className={`mx-auto flex w-full max-w-[440px] flex-1 flex-col gap-5 px-4 pt-6 ${CONTENT_BOTTOM_PADDING}`}
      >
        {status === "ready" ? (
          children
        ) : status === "loading" ? (
          <div className="mt-10 flex flex-col items-center gap-4 text-center">
            <LoaderCircle
              size={44}
              strokeWidth={2.5}
              aria-hidden="true"
              className="animate-spin text-accent"
            />
            <p className="text-base font-semibold text-fg">{t("common.loading")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <WarningBanner title={t("common.errorTitle")}>
              <p>{error}</p>
            </WarningBanner>
            <Button variant="secondary" onClick={() => void retry()}>
              {t("common.tryAgain")}
            </Button>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
