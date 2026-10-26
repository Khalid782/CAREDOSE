"use client";

/**
 * Holds the settings row (text size, language, theme, meal times) and applies
 * the ones that affect the whole document: text size, dark mode and language.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getDataLayer } from "@/lib/data";
import type { Settings, SettingsInput } from "@/lib/data/types";

interface SettingsContextValue {
  /** Null until the stored settings have been read. */
  settings: Settings | null;
  isReady: boolean;
  updateSettings: (patch: Partial<SettingsInput>) => Promise<void>;
  reloadSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isReady, setIsReady] = useState(false);

  const load = useCallback(async () => {
    const next = await getDataLayer().settings.get();
    setSettings(next);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const next = await getDataLayer().settings.get();
        if (!active) return;
        setSettings(next);
      } finally {
        if (active) setIsReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Text size, dark mode and language live on <html> so they apply everywhere.
  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    root.setAttribute("data-font-size", settings.fontSize);
    root.classList.toggle("dark", settings.theme === "dark");
    root.lang = settings.language;
  }, [settings]);

  const updateSettings = useCallback(async (patch: Partial<SettingsInput>) => {
    setSettings((previous) =>
      previous
        ? {
            ...previous,
            ...patch,
            mealTimes: patch.mealTimes
              ? { ...previous.mealTimes, ...patch.mealTimes }
              : previous.mealTimes,
          }
        : previous,
    );
    const saved = await getDataLayer().settings.update(patch);
    setSettings(saved);
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, isReady, updateSettings, reloadSettings: load }),
    [settings, isReady, updateSettings, load],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings must be used inside <AppProviders>.");
  return value;
}
