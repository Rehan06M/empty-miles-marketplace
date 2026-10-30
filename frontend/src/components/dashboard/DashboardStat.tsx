
import type { LucideIcon } from "lucide-react";

interface DashboardStatProps {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  accent?: boolean;
}

export function DashboardStat({
  label,
  value,
  description,
  icon: Icon,
  accent = false,
}: DashboardStatProps) {
  return (
    <div className="rounded-xl border border-line bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">
          {label}
        </p>

        <span
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            accent
              ? "bg-blue-50 text-brand"
              : "bg-neutral-100 text-ink",
          ].join(" ")}
        >
          <Icon size={20} strokeWidth={1.8} />
        </span>
      </div>

      <p className="mt-4 font-display text-4xl text-ink sm:text-5xl">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-muted">
        {description}
      </p>
    </div>
  );
}
