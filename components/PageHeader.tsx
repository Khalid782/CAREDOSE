"use client";

/** Screen title block: one big heading, an optional line under it, and an
 *  optional back link that is a real button-sized target. */

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  action,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 pb-2">
      {backHref ? (
        <Link
          href={backHref}
          className="inline-flex min-h-[48px] w-fit items-center gap-2 rounded-xl border-2 border-line bg-surface px-3 text-[0.95rem] font-semibold text-fg"
        >
          <ArrowLeft size={24} aria-hidden="true" />
          <span>{backLabel}</span>
        </Link>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col">
          <h1 className="text-[1.6rem] font-bold text-fg">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-[0.95rem] text-fg-muted">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
    </header>
  );
}
