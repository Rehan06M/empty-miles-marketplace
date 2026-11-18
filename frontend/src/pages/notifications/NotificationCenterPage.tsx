
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { DashboardPanel } from "../../components/dashboard/DashboardPanel";
import { Button } from "../../components/ui/Button";

import {
  getNotifications,
  markNotificationRead,
} from "../../services/notificationApi";

import type {
  NotificationPage,
} from "../../types/notification";

type Props = {
  role: "shipper" | "carrier";
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function messageOf(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Could not load notifications";
}

export function NotificationCenterPage({
  role,
}: Props) {
  const [page, setPage] = useState(1);
  const [refreshNumber, setRefreshNumber] = useState(0);

  const [data, setData] =
    useState<NotificationPage | null>(null);

  const [loading, setLoading] = useState(true);

  const [busyId, setBusyId] =
    useState<string | null>(null);

  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    getNotifications(page)
      .then((result) => {
        if (active) {
          setData(result);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setData(null);
          setError(messageOf(err));
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
  }, [page, refreshNumber]);

  async function markRead(eventId: string) {
    if (busyId !== null) return;

    setBusyId(eventId);
    setError("");

    try {
      await markNotificationRead(eventId);
      setRefreshNumber(
        (number) => number + 1
      );
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusyId(null);
    }
  }

  const bookingPath =
    role === "shipper"
      ? "/app/shipper/bookings"
      : "/app/carrier/requests";

  return (
    <DashboardLayout
      role={role}
      title="BOOKING NOTIFICATIONS."
      description="Read booking updates from your real shipment activity history."
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-white p-5">
            <p className="text-xs text-muted">
              Unread notifications
            </p>

            <p className="mt-2 text-3xl font-semibold text-ink">
              {data?.unreadCount ?? "—"}
            </p>
          </div>

          <div className="rounded-xl border border-line bg-white p-5">
            <p className="text-xs text-muted">
              Delivery method
            </p>

            <p className="mt-2 text-sm font-semibold text-ink">
              In-app updates
            </p>

            <p className="mt-1 text-xs text-muted">
              Refresh this page to check for newly
              recorded booking events.
            </p>
          </div>
        </div>

        <DashboardPanel
          title="Notification Inbox"
          subtitle="Only booking activity relevant to your authenticated account"
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {data
                ? `Page ${data.page} · ${data.pageSize} per page`
                : "Booking notifications"}
            </p>

            <Button
              variant="outline"
              type="button"
              disabled={loading}
              onClick={() =>
                setRefreshNumber(
                  (number) => number + 1
                )
              }
            >
              <RefreshCw size={16} />
              Refresh
            </Button>
          </div>

          {error && (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-red-200 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {loading ? (
            <p
              role="status"
              className="text-sm text-muted"
            >
              Loading notifications...
            </p>
          ) : data?.items.length === 0 ? (
            <div className="py-8 text-center">
              <Bell
                size={30}
                className="mx-auto text-brand"
              />

              <p className="mt-3 text-sm text-muted">
                {page === 1
                  ? "No booking notifications yet. New booking events will appear here."
                  : "No notifications on this page."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.items.map((item) => (
                <article
                  key={item.id}
                  className={[
                    "rounded-xl border p-4",
                    item.readAt === null
                      ? "border-brand bg-canvas"
                      : "border-line bg-white",
                  ].join(" ")}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <Bell
                        size={18}
                        className="mt-0.5 shrink-0 text-brand"
                      />

                      <div>
                        <h3 className="text-sm font-semibold text-ink">
                          {item.title}
                        </h3>

                        <p className="mt-1 text-xs text-muted">
                          {item.pickupName} →{" "}
                          {item.deliveryName} ·{" "}
                          {item.truckRegistration}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-semibold text-muted">
                      {item.readAt ? "Read" : "Unread"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-ink">
                    {item.description}
                  </p>

                  <p className="mt-2 text-xs text-muted">
                    {formatDate(item.occurredAt)}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line pt-3">
                    {item.readAt === null && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busyId !== null}
                        onClick={() =>
                          void markRead(item.id)
                        }
                      >
                        <CheckCheck size={16} />

                        {busyId === item.id
                          ? "Updating..."
                          : "Mark as Read"}
                      </Button>
                    )}

                    <Link
                      to={bookingPath}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-brand"
                    >
                      Open booking list
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={loading || page === 1}
              onClick={() =>
                setPage(
                  (current) =>
                    Math.max(1, current - 1)
                )
              }
            >
              Previous Page
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={
                loading || !data?.hasMore
              }
              onClick={() =>
                setPage(
                  (current) => current + 1
                )
              }
            >
              Next Page
            </Button>
          </div>
        </DashboardPanel>
      </div>
    </DashboardLayout>
  );
}
