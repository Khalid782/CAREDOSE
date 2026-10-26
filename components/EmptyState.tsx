import type { ReactNode } from "react";

/** Shown instead of a list when there is nothing to show yet. Always tells the
 *  patient what to do next. */
export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-line bg-surface p-6 text-center">
      <span
        aria-hidden="true"
        className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-accent-soft text-accent"
      >
        {icon}
      </span>
      <h2 className="text-[1.4rem] font-bold text-fg">{title}</h2>
      <p className="text-[0.95rem] leading-relaxed text-fg-muted">{message}</p>
      {action ? <div className="w-full pt-1">{action}</div> : null}
    </div>
  );
}
