
import {
  ArrowRight,
  CalendarCheck,
  IndianRupee,
  Package,
  Route,
} from "lucide-react";

import { Badge } from "../../components/ui/Badge";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { DashboardStat } from "../../components/dashboard/DashboardStat";
import { DashboardPanel } from "../../components/dashboard/DashboardPanel";

const shipments = [
  {
    id: "LOAD-001",
    route: "Mumbai → Lonavala",
    cargo: "Industrial Components",
    weight: "2,000 kg",
    status: "Matched",
    variant: "success" as const,
  },
  {
    id: "LOAD-002",
    route: "Bhiwandi → Chakan",
    cargo: "Packaging Material",
    weight: "1,500 kg",
    status: "Searching",
    variant: "info" as const,
  },
  {
    id: "LOAD-003",
    route: "Pune → Nashik",
    cargo: "Consumer Goods",
    weight: "3,200 kg",
    status: "Pending Approval",
    variant: "warning" as const,
  },
];

export function ShipperDashboard() {
  return (
    <DashboardLayout
      role="shipper"
      title="YOUR FREIGHT. UNDER CONTROL."
      description="Monitor your shipment activity, discover compatible routes, and manage your freight workflow."
    >
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
        Demonstration data only. No shipment has been
        posted and no booking has been created.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStat
          label="Active Loads"
          value="12"
          description="Illustrative active shipment count"
          icon={Package}
          accent
        />

        <DashboardStat
          label="Available Matches"
          value="08"
          description="Illustrative compatible truck options"
          icon={Route}
        />

        <DashboardStat
          label="Booking Requests"
          value="03"
          description="Illustrative requests awaiting review"
          icon={CalendarCheck}
        />

        <DashboardStat
          label="Estimated Savings"
          value="₹42K"
          description="Example savings, not calculated from real shipments"
          icon={IndianRupee}
        />
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <DashboardPanel
          title="Recent Shipments"
          subtitle="Sample shipment activity"
          action={
            <span className="text-xs font-semibold text-muted">
              Demo
            </span>
          }
        >
          <div className="space-y-5">
            {shipments.map((shipment) => (
              <div
                key={shipment.id}
                className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[10px] text-muted">
                    {shipment.id}
                  </p>

                  <h3 className="mt-1 font-semibold text-ink">
                    {shipment.route}
                  </h3>

                  <p className="mt-1 text-xs text-muted">
                    {shipment.cargo} · {shipment.weight}
                  </p>
                </div>

                <Badge variant={shipment.variant}>
                  {shipment.status}
                </Badge>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="How Shipper Matching Works"
          subtitle="The workflow we'll implement in later steps"
        >
          <div className="space-y-6">
            {[
              "Post your shipment",
              "Find compatible empty legs",
              "Compare price and route fit",
              "Request carrier approval",
            ].map((step, index) => (
              <div key={step} className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 font-mono text-xs font-bold text-brand">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="flex-1 border-b border-line pb-4 text-sm font-medium text-ink last:border-0">
                  {step}
                </div>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </div>

      <div className="mt-7">
        <DashboardPanel
          title="Partial-Route Matching"
          subtitle="A core capability of Empty Miles Marketplace"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg bg-canvas px-4 py-3">
              <p className="text-xs text-muted">
                Carrier journey
              </p>
              <p className="mt-1 font-semibold text-ink">
                Mumbai → Pune
              </p>
            </div>

            <ArrowRight className="text-brand" size={20} />

            <div className="rounded-lg bg-blue-50 px-4 py-3">
              <p className="text-xs text-blue-700">
                Shipper requirement
              </p>
              <p className="mt-1 font-semibold text-ink">
                Mumbai → Lonavala
              </p>
            </div>
          </div>

          <p className="mt-5 max-w-3xl text-sm leading-6 text-muted">
            A shipment ending at Lonavala can be
            eligible for a truck traveling from Mumbai
            to Pune, provided its pickup, delivery,
            timing, cargo, detour and capacity
            constraints are compatible.
          </p>

          <p className="mt-3 text-xs font-semibold text-brand">
            Matching logic will be implemented in Steps 16–18.
          </p>
        </DashboardPanel>
      </div>
    </DashboardLayout>
  );
}
