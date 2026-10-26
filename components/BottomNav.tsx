"use client";

/**
 * Four flat tabs, always visible at the bottom: Today, Scan, Medicines,
 * Settings. No nested menus, no hidden drawers. Every tab shows an icon and a
 * written label, and the active tab is marked by background plus bold text, not
 * by colour alone.
 */

import { House, Pill, ScanLine, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslator } from "@/lib/i18n/useTranslator";
import type { TranslationKey } from "@/lib/i18n/dictionary";

interface NavTab {
  href: string;
  labelKey: TranslationKey;
  icon: typeof House;
}

const TABS: NavTab[] = [
  { href: "/", labelKey: "nav.today", icon: House },
  { href: "/scan", labelKey: "nav.scan", icon: ScanLine },
  { href: "/medicines", labelKey: "nav.medicines", icon: Pill },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslator();

  return (
    <nav
      aria-label={t("nav.today")}
      className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-line bg-surface pb-safe"
    >
      <ul className="mx-auto flex w-full max-w-[440px] items-stretch">
        {TABS.map((tab) => {
          const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 ${
                  isActive ? "bg-accent-soft font-bold text-fg" : "font-semibold text-fg-muted"
                }`}
              >
                <Icon
                  size={28}
                  strokeWidth={2.5}
                  aria-hidden="true"
                  className={isActive ? "text-accent" : ""}
                />
                <span className="text-center text-[0.8rem] leading-tight">{t(tab.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
