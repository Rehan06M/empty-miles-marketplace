
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  PackageCheck,
  Truck,
  ArrowRight,
  Clock3,
  CheckCircle2,
} from "lucide-react";

import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { DashboardPanel } from "../../components/dashboard/DashboardPanel";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

import {
  getMyBookings,
  getIncomingBookings,
  changeBookingStatus,
} from "../../services/bookingApi";

import type {
  BookingAction,
} from "../../services/bookingApi";
import type {
  MarketplaceBooking,
} from "../../types/booking";

type Props = {
  role: "shipper" | "carrier";
};

const money = (value: string | null) =>
  value === null
    ? "Not available"
    : new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(value));

function dateText(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function messageFrom(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to complete the request";
}

function statusVariant(status: string) {
  if (
    status === "CONFIRMED" ||
    status === "COMPLETED"
  ) {
    return "success" as const;
  }

  if (
    status === "PENDING_APPROVAL" ||
    status === "IN_TRANSIT"
  ) {
    return "info" as const;
  }

  return "neutral" as const;
}

function actionsFor(
  booking: MarketplaceBooking,
  role: Props["role"]
): BookingAction[] {
  if (role === "shipper") {
    return booking.status === "PENDING_APPROVAL" ||
      booking.status === "CONFIRMED"
      ? ["cancel"]
      : [];
  }

  switch (booking.status) {
    case "PENDING_APPROVAL":
      return ["approve", "reject"];
    case "CONFIRMED":
      return ["start"];
    case "IN_TRANSIT":
      return ["complete"];
    default:
      return [];
  }
}


function BookingProgress({
  booking,
}: {
  booking: MarketplaceBooking;
}) {
  const milestones = [
    {
      key: "requested",
      label: "Requested",
      timestamp: booking.requestedAt,
    },
    {
      key: "confirmed",
      label: "Confirmed",
      timestamp: booking.approvedAt,
    },
    {
      key: "transit",
      label: "In Transit",
      timestamp: booking.pickedUpAt,
    },
    {
      key: "completed",
      label: "Completed",
      timestamp: booking.completedAt,
    },
  ];

  const terminalStatus = [
    "REJECTED",
    "CANCELLED",
    "EXPIRED",
  ].includes(booking.status);

  return (
    <section className="mt-5 rounded-xl border border-line bg-canvas p-4">
      <h3 className="text-sm font-semibold text-ink">
        Shipment Progress
      </h3>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {milestones.map((milestone, index) => {
          const reached = milestone.timestamp !== null;

          return (
            <div key={milestone.key}>
              <div className="flex items-center gap-2">
                <span
                  className={[
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    reached
                      ? "border-[#2F63FF] bg-[#2F63FF] text-white"
                      : "border-[#DADADA] bg-white text-muted",
                  ].join(" ")}
                >
                  {reached ? (
                    <CheckCircle2 size={17} />
                  ) : (
                    index + 1
                  )}
                </span>

                <span
                  className={[
                    "text-xs font-semibold",
                    reached
                      ? "text-ink"
                      : "text-muted",
                  ].join(" ")}
                >
                  {milestone.label}
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-muted">
                {milestone.timestamp
                  ? dateText(milestone.timestamp)
                  : "Not reached"}
              </p>
            </div>
          );
        })}
      </div>

      {booking.status === "PENDING_APPROVAL" && (
        <p className="mt-4 text-xs leading-5 text-amber-700">
          Waiting for carrier approval. The request
          expires on {dateText(booking.expiresAt)}.
        </p>
      )}

      {booking.status === "CONFIRMED" && (
        <p className="mt-4 text-xs leading-5 text-brand">
          The carrier has confirmed this booking.
          Transport has not been marked as started.
        </p>
      )}

      {booking.status === "IN_TRANSIT" && (
        <p className="mt-4 text-xs leading-5 text-brand">
          The carrier has marked the shipment
          as in transit. Delivery completion is
          still pending.
        </p>
      )}

      {terminalStatus && (
        <p className="mt-4 text-xs leading-5 text-amber-700">
          This booking ended with status{" "}
          {booking.status.replaceAll("_", " ")}.
          The remaining milestones are not expected
          for this booking.
        </p>
      )}

      {booking.status === "COMPLETED" && (
        <p className="mt-4 text-xs leading-5 text-emerald-700">
          The carrier has marked this shipment as
          completed. This is a recorded status,
          not independently verified delivery proof.
        </p>
      )}
    </section>
  );
}


function BookingActivity({
  booking,
}: {
  booking: MarketplaceBooking;
}) {
  const events = [...booking.events].sort(
    (a, b) =>
      new Date(a.occurredAt).getTime() -
      new Date(b.occurredAt).getTime() ||
      a.id.localeCompare(b.id)
  );

  return (
    <section className="mt-5 rounded-xl border border-line bg-white p-4">
      <h3 className="text-sm font-semibold text-ink">
        Booking Activity History
      </h3>

      <p className="mt-1 text-xs leading-5 text-muted">
        Timestamped status changes recorded by the
        backend.
      </p>

      {events.length === 0 ? (
        <div className="mt-4 rounded-lg bg-canvas p-3">
          <p className="text-xs leading-5 text-muted">
            No audit events are stored for this
            booking. It may have been created before
            activity-history tracking was introduced.
            Its current status and milestone timestamps
            are shown above, but missing historical
            events have not been reconstructed.
          </p>
        </div>
      ) : (
        <ol className="mt-5 space-y-5">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-start gap-3"
            >
              <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2F63FF]/10 text-[#2F63FF]">
                <CheckCircle2 size={16} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold text-ink">
                    {event.toStatus.replaceAll(
                      "_",
                      " "
                    )}
                  </p>

                  <span className="rounded-full bg-canvas px-2 py-1 text-[10px] font-medium text-muted">
                    {event.actorType}
                  </span>
                </div>

                <p className="mt-2 text-xs leading-5 text-muted">
                  {event.description}
                </p>

                <p className="mt-1 text-xs text-muted">
                  {dateText(event.occurredAt)}
                </p>

                {event.fromStatus && (
                  <p className="mt-1 text-[11px] text-muted">
                    {event.fromStatus.replaceAll(
                      "_",
                      " "
                    )}
                    {" → "}
                    {event.toStatus.replaceAll(
                      "_",
                      " "
                    )}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function BookingManagementPage({
  role,
}: Props) {
  const isShipper = role === "shipper";

  const [bookings, setBookings] =
    useState<MarketplaceBooking[]>([]);

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(
    null
  );

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const data = isShipper
      ? await getMyBookings()
      : await getIncomingBookings();

    setBookings(data);
  }, [isShipper]);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    const request = isShipper
      ? getMyBookings()
      : getIncomingBookings();

    request
      .then((data) => {
        if (active) setBookings(data);
      })
      .catch((err: unknown) => {
        if (active) setError(messageFrom(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isShipper]);

  async function act(
    booking: MarketplaceBooking,
    action: BookingAction
  ) {
    if (busyId !== null) return;

    const text: Record<BookingAction, string> = {
      approve: "Approve this booking request?",
      reject: "Reject this booking request?",
      start: "Mark this shipment as in transit?",
      complete: "Mark this shipment as completed?",
      cancel: "Cancel this booking?",
    };

    if (!window.confirm(text[action])) return;

    setBusyId(booking.id);
    setError("");
    setNotice("");

    try {
      await changeBookingStatus(booking.id, action);

      setNotice(
        `Booking action "${action}" completed.`
      );

      try {
        await refresh();
      } catch (err) {
        setError(
          "Action succeeded, but refresh failed: " +
          messageFrom(err)
        );
      }
    } catch (err) {
      setError(messageFrom(err));

      // Refresh to show current status when
      // another action or expiration won the race.
      try {
        await refresh();
      } catch {
        // Keep the original action error.
      }
    } finally {
      setBusyId(null);
    }
  }

  const pendingCount = bookings.filter(
    (booking) =>
      booking.status === "PENDING_APPROVAL"
  ).length;

  const confirmedCount = bookings.filter(
    (booking) =>
      booking.status === "CONFIRMED"
  ).length;

  return (
    <DashboardLayout
      role={role}
      title={
        isShipper
          ? "MY FREIGHT BOOKINGS."
          : "INCOMING BOOKING REQUESTS."
      }
      description={
        isShipper
          ? "Track carrier approvals, booking status and shipment progress."
          : "Review freight requests, manage reservations and update shipment progress."
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-white p-5">
            <p className="text-xs text-muted">
              Total Bookings
            </p>
            <p className="mt-2 text-3xl font-semibold text-ink">
              {bookings.length}
            </p>
          </div>

          <div className="rounded-xl border border-line bg-white p-5">
            <p className="text-xs text-muted">
              Pending Approval
            </p>
            <p className="mt-2 text-3xl font-semibold text-brand">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-xl border border-line bg-white p-5">
            <p className="text-xs text-muted">
              Confirmed
            </p>
            <p className="mt-2 text-3xl font-semibold text-ink">
              {confirmedCount}
            </p>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-white p-4 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {notice && (
          <p
            role="status"
            className="rounded-lg border border-line bg-white p-4 text-sm text-emerald-700"
          >
            {notice}
          </p>
        )}

        <DashboardPanel
          title={
            isShipper
              ? "My Booking Requests"
              : "Carrier Booking Inbox"
          }
          subtitle="Real booking records saved in PostgreSQL"
        >
          {loading ? (
            <p className="text-sm text-muted">
              Loading bookings...
            </p>
          ) : bookings.length === 0 ? (
            <div className="py-8 text-center">
              <PackageCheck
                size={32}
                className="mx-auto text-brand"
              />

              <p className="mt-4 text-sm text-muted">
                {isShipper
                  ? "You have not requested any bookings yet."
                  : "No booking requests have arrived yet."}
              </p>

              {isShipper && (
                <Link
                  to="/app/shipper/matches"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand"
                >
                  Find eligible trucks
                  <ArrowRight size={16} />
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-xl border border-line p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-mono text-xs text-muted">
                      Booking {booking.id.slice(0, 8)}
                    </span>

                    <Badge
                      variant={statusVariant(
                        booking.status
                      )}
                    >
                      {booking.status.replaceAll(
                        "_",
                        " "
                      )}
                    </Badge>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3 font-semibold text-ink">
                    <span>{booking.pickupName}</span>
                    <ArrowRight
                      size={17}
                      className="text-brand"
                    />
                    <span>{booking.deliveryName}</span>
                  </div>

                  <p className="mt-3 text-sm text-muted">
                    {booking.load.cargoDescription}
                  </p>

                  <div className="mt-4 grid gap-4 rounded-lg bg-canvas p-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted">
                        Truck
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-ink">
                        <Truck size={15} />
                        {
                          booking.emptyLeg.truck
                            .registrationNumber
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted">
                        Reserved weight
                      </p>
                      <p className="mt-1 font-semibold text-ink">
                        {Number(
                          booking.requestedWeightKg
                        ).toLocaleString("en-IN")} kg
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted">
                        Reserved volume
                      </p>
                      <p className="mt-1 font-semibold text-ink">
                        {booking.requestedVolumeM3 === null
                          ? "Not specified"
                          : `${Number(
                            booking.requestedVolumeM3
                          )} m³`}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted">
                        Estimated price snapshot
                      </p>
                      <p className="mt-1 font-semibold text-ink">
                        {money(booking.quotedPriceInr)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted">
                        Platform fee included
                      </p>
                      <p className="mt-1 font-semibold text-ink">
                        {money(booking.platformFeeInr)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted">
                        Estimated CO₂ avoided
                      </p>
                      <p className="mt-1 font-semibold text-ink">
                        {booking.estimatedCo2SavedKg === null
                          ? "Not available"
                          : `${Number(
                            booking.estimatedCo2SavedKg
                          ).toFixed(2)} kg`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-xs text-muted">
                    <Clock3 size={15} />
                    Requested: {dateText(
                      booking.requestedAt
                    )}
                  </div>

                  {booking.status === "PENDING_APPROVAL" && (
                    <p className="mt-2 text-xs text-amber-700">
                      Approval deadline:{" "}
                      {dateText(booking.expiresAt)}
                    </p>
                  )}

                  <p className="mt-3 text-xs leading-5 text-muted">
                    The price and CO₂ figures are
                    illustrative snapshots, not an
                    invoice, payment confirmation or
                    measured emissions.
                  </p>

                  <BookingProgress booking={booking} />

                  <BookingActivity booking={booking} />
                  {actionsFor(booking, role).length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-4">
                      {actionsFor(booking, role).map(
                        (action) => (
                          <Button
                            key={action}
                            type="button"
                            variant={
                              action === "approve" ||
                                action === "start" ||
                                action === "complete"
                                ? "primary"
                                : "outline"
                            }
                            disabled={busyId !== null}
                            onClick={() =>
                              void act(booking, action)
                            }
                          >
                            {busyId === booking.id
                              ? "Updating..."
                              : action === "approve"
                                ? "Approve"
                                : action === "reject"
                                  ? "Reject"
                                  : action === "start"
                                    ? "Start Transit"
                                    : action === "complete"
                                      ? "Complete"
                                      : "Cancel Booking"}
                          </Button>
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>
      </div>
    </DashboardLayout>
  );
}
