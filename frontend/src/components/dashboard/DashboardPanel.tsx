
import type { ReactNode } from "react";

interface DashboardPanelProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}

export function DashboardPanel({
  title,
  subtitle,
  children,
  action,
}: DashboardPanelProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-5 sm:px-6">
        <div>
          <h2 className="text-base font-bold text-ink">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-1 text-xs leading-5 text-muted">
              {subtitle}
            </p>
          )}
        </div>

        {action}
      </div>

      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}
