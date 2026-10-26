"use client";

/**
 * A banner for things the patient must notice: late doses, placeholders, and
 * deletions. Icon plus text, never colour alone.
 */

import { Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

export type BannerTone = "warning" | "info";

export function WarningBanner({
  title,
  children,
  tone = "warning",
  urgent = false,
}: {
  title?: string;
  children?: ReactNode;
  tone?: BannerTone;
  /** High-priority alerts use an assertive live region and a stronger border. */
  urgent?: boolean;
}) {
  const isWarning = tone === "warning";
  const Icon = isWarning ? TriangleAlert : Info;

  return (
    <div
      role={urgent ? "alert" : "note"}
      aria-live={urgent ? "assertive" : undefined}
      className={`flex gap-3 rounded-2xl ${urgent ? "border-[3px]" : "border-2"} p-4 ${
        isWarning ? "border-warn-line bg-warn-soft" : "border-accent bg-accent-soft"
      }`}
    >
      <span aria-hidden="true" className={isWarning ? "text-warn-fg" : "text-accent"}>
        <Icon size={28} strokeWidth={2.5} />
      </span>
      <div className="flex flex-col gap-1">
        {title ? (
          <p
            className={`text-[1.1rem] font-bold ${isWarning ? "text-warn-fg" : "text-fg"}`}
          >
            {title}
          </p>
        ) : null}
        {children ? (
          <div
            className={`text-[0.95rem] leading-relaxed ${isWarning ? "text-warn-fg" : "text-fg"}`}
          >
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
