
import {
  AlertTriangle,
  CalendarCheck,
  Route,
  Users,
} from "lucide-react";

import { Badge } from "../../components/ui/Badge";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { DashboardStat } from "../../components/dashboard/DashboardStat";
import { DashboardPanel } from "../../components/dashboard/DashboardPanel";

const activities = [
  {
    label: "New shipper registration",
    detail: "Example company account",
    status: "New",
    variant: "info" as const,
  },
  {
    label: "Carrier empty leg published",
    detail: "Mumbai → Pune",
    status: "Active",
    variant: "success" as const,
  },
  {
    label: "Booking approval pending",
    detail: "Example booking request",
    status: "Pending",
    variant: "warning" as const,
  },
];

export function AdminDashboard() {
  return (
    <DashboardLayout
      role="admin"
      title="MARKETPLACE OVERVIEW."
      description="A unified view of platform activity, marketplace participants, bookings, and operational events."
    >
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
        Admin interface preview only. This route
        is not protected and exposes no real platform
        records or administrative controls.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStat
          label="Total Users"
          value="128"
          description="Illustrative marketplace participants"
          icon={Users}
          accent
        />

        <DashboardStat
          label="Active Empty Legs"
          value="34"
          description="Illustrative carrier journeys"
          icon={Route}
        />

        <DashboardStat
          label="Total Bookings"
          value="56"
          description="Illustrative booking volume"
          icon={CalendarCheck}
        />

        <DashboardStat
          label="Attention Needed"
          value="04"
          description="Illustrative operational issues"
          icon={AlertTriangle}
        />
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <DashboardPanel
          title="Recent Marketplace Activity"
          subtitle="Illustrative platform events"
        >
          <div className="space-y-5">
            {activities.map((activity) => (
              <div
                key={activity.label}
                className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5 last:border-0 last:pb-0"
              >
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    {activity.label}
                  </h3>

                  <p className="mt-1 text-xs text-muted">
                    {activity.detail}
                  </p>
                </div>

                <Badge variant={activity.variant}>
                  {activity.status}
                </Badge>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Operations Roadmap"
          subtitle="Features planned for later steps"
        >
          <div className="space-y-4">
            {[
              "User and role oversight",
              "Truck and load activity",
              "Booking lifecycle monitoring",
              "Marketplace performance reporting",
              "Issue and exception tracking",
            ].map((item, index) => (
              <div
                key={item}
                className="flex items-start gap-3"
              >
                <span className="font-mono text-xs text-brand">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <p className="text-sm leading-6 text-ink">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </div>
    </DashboardLayout>
  );
}
