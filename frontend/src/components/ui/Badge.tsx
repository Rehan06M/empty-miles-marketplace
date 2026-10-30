
import type { ReactNode } from "react";

type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
}

const styles: Record<BadgeVariant, string> = {
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-800",
  danger: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
  neutral: "bg-neutral-100 text-neutral-700",
};

export function Badge({
  variant = "neutral",
  children,
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full",
        "px-3 py-1 text-[11px] font-semibold",
        "uppercase tracking-[0.06em]",
        styles[variant],
      ].join(" ")}
    >
      {children}
    </span>
  );
}
