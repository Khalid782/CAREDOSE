"use client";

/**
 * The only button in the app. Elder-first rules baked in:
 * - at least 64px tall for main actions (48px for small ones, never less)
 * - every icon is paired with a visible text label
 * - all colour pairs meet WCAG AA in both themes
 */

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "soft" | "warn";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-fg border-2 border-transparent hover:brightness-110",
  secondary: "bg-surface text-fg border-2 border-line hover:bg-surface-3",
  soft: "bg-accent-soft text-fg border-2 border-transparent hover:brightness-95",
  warn: "bg-warn-soft text-warn-fg border-2 border-warn-line hover:brightness-95",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  lg: "min-h-[64px] px-5 text-base",
  md: "min-h-[56px] px-4 text-base",
  sm: "min-h-[48px] px-4 text-[0.9rem]",
};

interface SharedProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  children: ReactNode;
  fullWidth?: boolean;
  className?: string;
}

/** Shared class builder so links and buttons look identical. */
export function buttonClass({
  variant = "primary",
  size = "lg",
  fullWidth = false,
  className = "",
}: Omit<SharedProps, "children" | "icon"> = {}): string {
  return [
    "inline-flex items-center justify-center gap-3 rounded-xl font-semibold",
    "transition-colors select-none text-center",
    "disabled:cursor-not-allowed disabled:opacity-60",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export type ButtonProps = SharedProps & Omit<ComponentProps<"button">, "className" | "children">;

export function Button({
  variant = "primary",
  size = "lg",
  icon,
  children,
  fullWidth = false,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, fullWidth, className })}
      {...rest}
    >
      {icon ? (
        <span aria-hidden="true" className="shrink-0">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}

export type LinkButtonProps = SharedProps &
  Omit<ComponentProps<typeof Link>, "className" | "children">;

export function LinkButton({
  variant = "primary",
  size = "lg",
  icon,
  children,
  fullWidth = false,
  className,
  ...rest
}: LinkButtonProps) {
  return (
    <Link className={buttonClass({ variant, size, fullWidth, className })} {...rest}>
      {icon ? (
        <span aria-hidden="true" className="shrink-0">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </Link>
  );
}
