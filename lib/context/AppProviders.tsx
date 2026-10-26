"use client";

/**
 * One wrapper for every React context the app needs. Used by the root layout,
 * so the Android wrapper and the web build share the same setup.
 */

import type { ReactNode } from "react";
import { AlarmProvider } from "./AlarmProvider";
import { CareDataProvider } from "./CareDataProvider";
import { SettingsProvider } from "./SettingsProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <CareDataProvider>
        <AlarmProvider>{children}</AlarmProvider>
      </CareDataProvider>
    </SettingsProvider>
  );
}
