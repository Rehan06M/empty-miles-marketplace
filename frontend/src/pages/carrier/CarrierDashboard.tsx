
import {
  CalendarCheck,
  IndianRupee,
  Package,
  Truck,
} from "lucide-react";

import { Badge } from "../../components/ui/Badge";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { DashboardStat } from "../../components/dashboard/DashboardStat";
import { DashboardPanel } from "../../components/dashboard/DashboardPanel";

const emptyLegs = [
  {
    id: "LEG-001",
    route: "Mumbai → Pune",
    truck: "MH-12-AB-1234",
    capacity: "4,000 kg",
    status: "Available",
    variant: "success" as const,
  },
  {
    id: "LEG-002",
    route: "Pune → Nashik",
    truck: "MH-14-CD-5678",
    capacity: "2,500 kg",
    status: "Partially Reserved",
    variant: "warning" as const,
  },
  {
    id: "LEG-003",
    route: "Bhiwandi → Chakan",
    truck: "MH-04-EF-9012",
    capacity: "3,000 kg",
    status: "Available",
    variant: "success" as const,
  },
];

export function CarrierDashboard() {
  return (
    <DashboardLayout
      role="carrier"
      title="TURN CAPACITY INTO OPPORTUNITY."
      description="Manage available truck space, publish empty journeys, and review upcoming freight opportunities."
    >
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
        Demonstration data only. No trucks, capacity
        reservations or carrier earnings are being managed yet.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStat
          label="Registered Trucks"
          value="06"
          description="Illustrative fleet size"
          icon={Truck}
          accent
        />

        <DashboardStat
          label="Active Empty Legs"
          value="04"
          description="Illustrative available journeys"
          icon={Package}
        />

        <DashboardStat
          label="Booking Requests"
          value="03"
          description="Example requests awaiting approval"
          icon={CalendarCheck}
        />

        <DashboardStat
          label="Potential Earnings"
          value="₹28K"
          description="Illustrative amount, not actual earnings"
          icon={IndianRupee}
        />
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <DashboardPanel
          title="My Empty Legs"
          subtitle="Example journeys with available capacity"
        >
          <div className="space-y-5">
            {emptyLegs.map((leg) => (
              <div
                key={leg.id}
                className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-mono text-[10px] text-muted">
                    {leg.id} · {leg.truck}
                  </p>

                  <h3 className="mt-1 font-semibold text-ink">
                    {leg.route}
                  </h3>

                  <p className="mt-1 text-xs text-muted">
                    Illustrative free capacity: {leg.capacity}
                  </p>
                </div>

                <Badge variant={leg.variant}>
                  {leg.status}
                </Badge>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Booking Approval Workflow"
          subtitle="Planned marketplace booking behavior"
        >
          <div className="space-y-5">
            {[
              "Receive a booking request",
              "Requested capacity is reserved temporarily",
              "Review shipment details",
              "Approve or reject before expiration",
            ].map((step, index) => (
              <div key={step} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 font-mono text-xs font-bold text-brand">
                  {index + 1}
                </span>

                <p className="pt-1 text-sm leading-6 text-ink">
                  {step}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-6 border-t border-line pt-4 text-xs leading-5 text-muted">
            In the implemented booking system,
            pending requests will immediately reserve
            capacity and expire after 24 hours or
            before departure, whichever is earlier.
          </p>
        </DashboardPanel>
      </div>
    </DashboardLayout>
  );
}
