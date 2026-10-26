import type { ReactNode } from "react";

/** A plain white (or dark) panel. Every screen is built out of these. */
export function Card({
  children,
  className = "",
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "li" | "article";
}) {
  return (
    <Tag className={`rounded-2xl border-2 border-line bg-surface p-4 ${className}`}>
      {children}
    </Tag>
  );
}

/** Heading used inside a card, kept at 28px for easy reading. */
export function CardTitle({
  children,
  icon,
  id,
}: {
  children: ReactNode;
  icon?: ReactNode;
  id?: string;
}) {
  return (
    <h2 id={id} className="flex items-center gap-3 text-[1.4rem] font-bold text-fg">
      {icon ? (
        <span aria-hidden="true" className="shrink-0 text-accent">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </h2>
  );
}
