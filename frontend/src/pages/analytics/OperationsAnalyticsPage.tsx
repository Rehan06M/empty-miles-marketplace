
import {
  useEffect,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  Activity,
  BarChart3,
  RefreshCw,
  IndianRupee,
  Leaf,
  ArrowRight,
} from "lucide-react";

import {
  DashboardLayout,
} from "../../components/layout/DashboardLayout";

import {
  DashboardPanel,
} from "../../components/dashboard/DashboardPanel";

import {
  Button,
} from "../../components/ui/Button";

import {
  getOperationalAnalytics,
} from "../../services/analyticsApi";

import type {
  AnalyticsOverview,
} from "../../types/analytics";

type Props = {
  role: "shipper" | "carrier";
};

const currency = new Intl.NumberFormat(
  "en-IN",
  {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }
);

function money(value: number): string {
  return currency.format(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unable to load operational analytics";
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <p className="text-xs font-semibold text-muted">
        {label}
      </p>

      <p className="mt-3 break-words text-2xl font-semibold text-ink">
        {value}
      </p>

      {note && (
        <p className="mt-2 text-xs leading-5 text-muted">
          {note}
        </p>
      )}
    </div>
  );
}

function BookingPipeline({
  data,
}: {
  data: AnalyticsOverview;
}) {
  const statuses = [
    {
      label: "Pending Approval",
      value: data.bookings.PENDING_APPROVAL,
    },
    {
      label: "Confirmed",
      value: data.bookings.CONFIRMED,
    },
    {
      label: "In Transit",
      value: data.bookings.IN_TRANSIT,
    },
    {
      label: "Completed",
      value: data.bookings.COMPLETED,
    },
    {
      label: "Rejected",
      value: data.bookings.REJECTED,
    },
    {
      label: "Cancelled",
      value: data.bookings.CANCELLED,
    },
    {
      label: "Expired",
      value: data.bookings.EXPIRED,
    },
  ];

  return (
    <DashboardPanel
      title="Booking Pipeline"
      subtitle="Current effective booking status counts"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statuses.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-line bg-canvas p-4"
          >
            <p className="text-xs text-muted">
              {item.label}
            </p>

            <p className="mt-2 text-2xl font-semibold text-ink">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs leading-5 text-muted">
        Pending requests past their approval deadline
        are counted as expired, even before their stored
        status is synchronized. Active reservations
        include unexpired pending, confirmed and
        in-transit bookings.
      </p>
    </DashboardPanel>
  );
}

function BookingActivityChart({
  data,
}: {
  data: AnalyticsOverview;
}) {
  const maximum = Math.max(
    1,
    ...data.monthlyRequests.map(
      (item) => item.requests
    )
  );

  const total = data.monthlyRequests.reduce(
    (sum, item) => sum + item.requests,
    0
  );

  return (
    <DashboardPanel
      title="Booking Request Activity"
      subtitle="Last six calendar months, by request date (UTC)"
    >
      {total === 0 && (
        <p className="mb-4 text-sm text-muted">
          No booking requests were created during
          these six months.
        </p>
      )}

      <div
        className="grid grid-cols-6 gap-2 sm:gap-4"
        role="img"
        aria-label="Monthly booking request counts"
      >
        {data.monthlyRequests.map((item) => {
          const height =
            item.requests === 0
              ? 0
              : Math.max(
                  6,
                  (item.requests / maximum) * 100
                );

          const label = new Date(
            `${item.month}-01T00:00:00Z`
          ).toLocaleDateString("en-IN", {
            month: "short",
            year: "2-digit",
            timeZone: "UTC",
          });

          return (
            <div
              key={item.month}
              className="min-w-0 text-center"
            >
              <p className="mb-2 text-xs font-semibold text-ink">
                {item.requests}
              </p>

              <div className="flex h-40 items-end overflow-hidden rounded-lg bg-canvas p-1">
                <div
                  className="w-full rounded-t-md bg-[#2F63FF]"
                  style={{
                    height: `${height}%`,
                  }}
                  title={`${item.month}: ${item.requests} booking requests`}
                />
              </div>

              <p className="mt-2 text-[10px] font-medium text-muted sm:text-xs">
                {label}
              </p>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs leading-5 text-muted">
        The chart counts booking requests created,
        including requests later rejected, cancelled
        or expired. It is not a revenue chart.
      </p>
    </DashboardPanel>
  );
}

function EstimateSummary({
  data,
  role,
}: {
  data: AnalyticsOverview;
  role: Props["role"];
}) {
  const completed = data.bookings.COMPLETED;
  const finance = data.financials;
  const environment = data.environmental;

  const isShipper = role === "shipper";

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <DashboardPanel
        title={
          isShipper
            ? "Modeled Freight Spending"
            : "Modeled Carrier Earnings"
        }
        subtitle="Illustrative quote snapshots from completed bookings only"
      >
        <div className="flex items-center gap-2 text-muted">
          <IndianRupee size={18} />
          <span className="text-xs font-semibold">
            Not settled payments
          </span>
        </div>

        {isShipper ? (
          <>
            <p className="mt-4 text-xs text-muted">
              Total estimated marketplace freight
              value for completed bookings
            </p>

            <p className="mt-2 text-3xl font-semibold text-ink">
              {finance.completedQuotedCount > 0
                ? money(
                    finance.completedQuotedValueInr
                  )
                : "—"}
            </p>

            <div className="mt-5 rounded-lg bg-canvas p-4">
              <p className="text-xs text-muted">
                Estimated difference from dedicated
                freight alternatives
              </p>

              <p className="mt-2 text-xl font-semibold text-ink">
                {finance.completedComparisonCount > 0
                  ? money(
                      finance.completedModeledSavingsInr
                    )
                  : "—"}
              </p>

              <p className="mt-2 text-xs leading-5 text-muted">
                Positive means estimated savings;
                negative means estimated additional
                cost versus the modeled baseline.
              </p>
            </div>

            <p className="mt-4 text-xs text-muted">
              Price snapshots:{" "}
              {finance.completedQuotedCount}
              {" of "}
              {completed}
              {" completed bookings. Comparable baselines: "}
              {finance.completedComparisonCount}
              {" of "}
              {completed}.
            </p>
          </>
        ) : (
          <>
            <p className="mt-4 text-xs text-muted">
              Estimated carrier earnings on
              completed bookings
            </p>

            <p className="mt-2 text-3xl font-semibold text-ink">
              {finance.completedCarrierEarningsCount > 0
                ? money(
                    finance.completedCarrierEarningsInr
                  )
                : "—"}
            </p>

            <p className="mt-4 text-xs leading-5 text-muted">
              Calculated as stored marketplace quote
              minus stored platform fee. This is a
              model-based amount, not money received.
            </p>

            <p className="mt-4 text-xs text-muted">
              Complete price and fee snapshots:{" "}
              {finance.completedCarrierEarningsCount}
              {" of "}
              {completed}
              {" completed bookings."}
            </p>
          </>
        )}
      </DashboardPanel>

      <DashboardPanel
        title="Environmental Impact Estimates"
        subtitle="Potential tailpipe CO₂ avoided on completed bookings"
      >
        <div className="flex items-center gap-2 text-emerald-700">
          <Leaf size={18} />
          <span className="text-xs font-semibold">
            Illustrative model
          </span>
        </div>

        <p className="mt-4 text-xs text-muted">
          Summed saved estimates
        </p>

        <p className="mt-2 text-3xl font-semibold text-ink">
          {environment.completedEstimateCount > 0
            ? `${environment.completedEstimatedAvoidedCo2Kg.toFixed(2)} kg`
            : "—"}
        </p>

        <p className="mt-2 text-xs text-muted">
          CO₂, not certified carbon credits.
        </p>

        <p className="mt-5 text-xs leading-5 text-muted">
          Available emissions snapshots:{" "}
          {environment.completedEstimateCount}
          {" of "}
          {completed}
          {" completed bookings."}
        </p>

        <p className="mt-3 text-xs leading-5 text-muted">
          These values were estimated when the
          bookings were created. No actual vehicle
          fuel use or delivery emissions were
          measured.
        </p>
      </DashboardPanel>
    </div>
  );
}

export function OperationsAnalyticsPage({
  role,
}: Props) {
  const [data, setData] =
    useState<AnalyticsOverview | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    getOperationalAnalytics()
      .then((overview) => {
        if (active) {
          setData(overview);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setData(null);
          setError(errorMessage(err));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const bookingPath =
    role === "shipper"
      ? "/app/shipper/bookings"
      : "/app/carrier/requests";

  const inventoryCards =
    role === "shipper"
      ? [
          {
            label: "Total Loads",
            value: data?.inventory.loads?.total ?? 0,
          },
          {
            label: "Active Loads",
            value: data?.inventory.loads?.active ?? 0,
          },
        ]
      : [
          {
            label: "Total Trucks",
            value: data?.inventory.trucks?.total ?? 0,
          },
          {
            label: "Active Trucks",
            value: data?.inventory.trucks?.active ?? 0,
          },
          {
            label: "Total Empty Legs",
            value: data?.inventory.journeys?.total ?? 0,
          },
          {
            label: "Active Empty Legs",
            value: data?.inventory.journeys?.active ?? 0,
          },
        ];

  return (
    <DashboardLayout
      role={role}
      title="OPERATIONS ANALYTICS."
      description={
        role === "shipper"
          ? "Understand your shipments, bookings, modeled freight spending and environmental estimates."
          : "Monitor your trucks, journeys, incoming bookings and modeled carrier earnings."
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            {data
              ? `Last calculated: ${new Date(data.asOf).toLocaleString("en-IN")}`
              : "Authenticated operational data"}
          </p>

          <Button
            variant="outline"
            disabled={loading}
            onClick={() =>
              setRefreshKey((current) => current + 1)
            }
          >
            <RefreshCw size={16} />
            Refresh Analytics
          </Button>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-white p-4 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {loading ? (
          <div
            role="status"
            className="rounded-xl border border-line bg-white p-6 text-sm text-muted"
          >
            Loading your analytics...
          </div>
        ) : data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {inventoryCards.map((item) => (
                <MetricCard
                  key={item.label}
                  label={item.label}
                  value={item.value}
                />
              ))}

              <MetricCard
                label="Total Booking Requests"
                value={data.bookings.total}
              />

              <MetricCard
                label="Active Reservations"
                value={data.bookings.activeReservations}
                note="Pending (not expired), confirmed and in transit"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-4">
              <div className="flex items-center gap-3">
                <Activity
                  size={20}
                  className="text-brand"
                />
                <div>
                  <p className="text-sm font-semibold text-ink">
                    Booking activity
                  </p>
                  <p className="text-xs text-muted">
                    Review individual bookings for
                    current status and event history.
                  </p>
                </div>
              </div>

              <Link
                to={bookingPath}
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand"
              >
                Open Bookings
                <ArrowRight size={16} />
              </Link>
            </div>

            <BookingPipeline data={data} />

            <div className="flex items-center gap-2 text-xs text-muted">
              <BarChart3 size={16} />
              Request activity and snapshots below
              come from your saved booking records.
            </div>

            <BookingActivityChart data={data} />

            <EstimateSummary
              data={data}
              role={role}
            />

            <DashboardPanel
              title="Data Sources and Limitations"
              subtitle="How to interpret these operational metrics"
            >
              <ul className="list-disc space-y-2 pl-5 text-xs leading-6 text-muted">
                {data.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </DashboardPanel>
          </>
        ) : (
          <div className="rounded-xl border border-line bg-white p-6">
            <p className="text-sm text-muted">
              Analytics are currently unavailable.
              Check the backend connection and retry.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
