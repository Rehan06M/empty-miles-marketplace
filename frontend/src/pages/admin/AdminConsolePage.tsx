import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  RefreshCw,
  ShieldCheck,
  Users,
  Package,
  CalendarCheck,
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

import { useAuth } from "../../contexts/AuthContext";

import {
  getAdminOverview,
  getAdminUsers,
  getAdminActions,
  changeAdminUserStatus,
} from "../../services/adminApi";

import type {
  AdminOverview,
  AdminUser,
  AdminUserRole,
  AdminUserStatus,
  AdminPage,
  AdminModerationAction,
} from "../../types/admin";

type AdminView = "users" | "marketplace" | "bookings";

function showDate(value: string): string {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function messageOf(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The request failed";
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-xs text-muted">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold text-ink">
        {value.toLocaleString("en-IN")}
      </p>
    </div>
  );
}

export function AdminConsolePage({
  view,
}: {
  view: AdminView;
}) {
  const { user: currentUser } = useAuth();

  const [overview, setOverview] =
    useState<AdminOverview | null>(null);

  const [users, setUsers] =
    useState<AdminPage<AdminUser> | null>(null);

  const [actions, setActions] =
    useState<
      AdminPage<AdminModerationAction> | null
    >(null);

  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");

  const [role, setRole] =
    useState<AdminUserRole | "">("");

  const [status, setStatus] =
    useState<AdminUserStatus | "">("");

  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);

  const [loading, setLoading] = useState(true);

  const [usersLoading, setUsersLoading] =
    useState(false);

  const [busyId, setBusyId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    getAdminOverview()
      .then((data) => {
        if (active) {
          setOverview(data);
        }
      })
      .catch((e: unknown) => {
        if (active) {
          setOverview(null);
          setError(messageOf(e));
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
  }, [refresh]);

  useEffect(() => {
    if (view !== "users") return;

    let active = true;
    setUsersLoading(true);

    getAdminUsers({
      page,
      search,
      role,
      status,
    })
      .then((data) => {
        if (active) {
          setUsers(data);
        }
      })
      .catch((e: unknown) => {
        if (active) {
          setUsers(null);
          setError(messageOf(e));
        }
      })
      .finally(() => {
        if (active) {
          setUsersLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    view,
    page,
    search,
    role,
    status,
    refresh,
  ]);

  useEffect(() => {
    if (view !== "users") return;

    let active = true;

    getAdminActions()
      .then((data) => {
        if (active) {
          setActions(data);
        }
      })
      .catch((e: unknown) => {
        if (active) {
          setError(messageOf(e));
        }
      });

    return () => {
      active = false;
    };
  }, [view, refresh]);

  async function moderate(target: AdminUser) {
    if (busyId) return;

    const next: AdminUserStatus =
      target.status === "ACTIVE"
        ? "SUSPENDED"
        : "ACTIVE";

    const reason = window.prompt(
      `Reason for ${
        next === "SUSPENDED"
          ? "suspending"
          : "reactivating"
      } ${target.email} (10–500 characters):`
    );

    if (reason === null) return;

    const cleaned = reason.trim();

    if (
      cleaned.length < 10 ||
      cleaned.length > 500
    ) {
      setError(
        "Please enter a reason between 10 and 500 characters."
      );
      return;
    }

    if (
      !window.confirm(
        `Confirm status change to ${next} for ${target.email}?`
      )
    ) {
      return;
    }

    setBusyId(target.id);
    setError("");
    setNotice("");

    try {
      await changeAdminUserStatus(
        target.id,
        next,
        cleaned
      );

      setNotice(
        `Account ${target.email} is now ${next}.`
      );

      setRefresh((n) => n + 1);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusyId(null);
    }
  }

  const tabs = [
    {
      id: "users",
      label: "Users",
      path: "/app/admin/users",
      icon: Users,
    },
    {
      id: "marketplace",
      label: "Marketplace",
      path: "/app/admin/marketplace",
      icon: Package,
    },
    {
      id: "bookings",
      label: "Bookings",
      path: "/app/admin/bookings",
      icon: CalendarCheck,
    },
  ] as const;

  const title =
    view === "users"
      ? "USER MODERATION."
      : view === "marketplace"
        ? "MARKETPLACE OVERSIGHT."
        : "BOOKING OVERSIGHT.";

  return (
    <DashboardLayout
      role="admin"
      title={title}
      description="Authenticated admin review of real marketplace records, with guarded and audited account moderation."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            {overview
              ? `Updated ${showDate(overview.asOf)}`
              : "Admin-only operational data"}
          </p>

          <Button
            variant="outline"
            disabled={
              loading || busyId !== null
            }
            onClick={() =>
              setRefresh((n) => n + 1)
            }
          >
            <RefreshCw size={16} />
            Refresh
          </Button>
        </div>

        <nav
          aria-label="Admin sections"
          className="flex flex-wrap gap-2"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <Link
                key={tab.id}
                to={tab.path}
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold",
                  view === tab.id
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-white text-ink",
                ].join(" ")}
              >
                <Icon size={16} />
                {tab.label}
              </Link>
            );
          })}
        </nav>

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

        {loading ? (
          <p
            role="status"
            className="text-sm text-muted"
          >
            Loading admin overview...
          </p>
        ) : overview && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Shippers"
              value={overview.totals.shippers}
            />
            <Metric
              label="Carriers"
              value={overview.totals.carriers}
            />
            <Metric
              label="Suspended accounts"
              value={overview.totals.suspended}
            />
            <Metric
              label="Total bookings"
              value={overview.totals.bookings}
            />
            <Metric
              label="Active loads"
              value={overview.totals.activeLoads}
            />
            <Metric
              label="Active journeys"
              value={overview.totals.activeJourneys}
            />
            <Metric
              label="Live booking reservations"
              value={
                overview.totals.liveReservations
              }
            />
            <Metric
              label="All journeys"
              value={overview.totals.journeys}
            />
          </div>
        )}

        {view === "users" && (
          <>
            <DashboardPanel
              title="User Accounts"
              subtitle="Search, review and moderate shipper/carrier accounts. Admin roles cannot be changed here."
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setPage(1);
                  setSearch(searchText.trim());
                }}
                className="mb-5 flex flex-wrap items-end gap-3"
              >
                <label className="min-w-48 flex-1 text-xs font-semibold text-ink">
                  Search name, email or company

                  <input
                    value={searchText}
                    onChange={(e) =>
                      setSearchText(e.target.value)
                    }
                    maxLength={80}
                    className="mt-2 w-full rounded-lg border border-line px-3 py-3 text-sm"
                    placeholder="Search accounts"
                  />
                </label>

                <label className="text-xs font-semibold text-ink">
                  Role

                  <select
                    value={role}
                    onChange={(e) => {
                      setPage(1);
                      setRole(
                        e.target.value as
                          | AdminUserRole
                          | ""
                      );
                    }}
                    className="mt-2 block rounded-lg border border-line px-3 py-3 text-sm"
                  >
                    <option value="">All</option>
                    <option value="SHIPPER">
                      Shipper
                    </option>
                    <option value="CARRIER">
                      Carrier
                    </option>
                    <option value="ADMIN">
                      Admin
                    </option>
                  </select>
                </label>

                <label className="text-xs font-semibold text-ink">
                  Status

                  <select
                    value={status}
                    onChange={(e) => {
                      setPage(1);
                      setStatus(
                        e.target.value as
                          | AdminUserStatus
                          | ""
                      );
                    }}
                    className="mt-2 block rounded-lg border border-line px-3 py-3 text-sm"
                  >
                    <option value="">All</option>
                    <option value="ACTIVE">
                      Active
                    </option>
                    <option value="SUSPENDED">
                      Suspended
                    </option>
                  </select>
                </label>

                <Button type="submit">
                  Search
                </Button>
              </form>

              {usersLoading ? (
                <p className="text-sm text-muted">
                  Loading users...
                </p>
              ) : users && (
                <>
                  <p className="mb-3 text-xs text-muted">
                    {users.total}
                    {" matching accounts · Page "}
                    {users.page}
                  </p>

                  {users.items.length === 0 ? (
                    <p className="text-sm text-muted">
                      No accounts match these filters.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {users.items.map((account) => (
                        <div
                          key={account.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-4"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-ink">
                              {account.name}
                              {" · "}
                              {account.role}
                            </p>

                            <p className="break-all text-xs text-muted">
                              {account.email}
                            </p>

                            <p className="mt-1 text-xs text-muted">
                              {account.companyName ||
                                "No company"}
                              {" · "}
                              {account.status}
                              {" · Joined "}
                              {showDate(
                                account.createdAt
                              )}
                            </p>
                          </div>

                          {account.role === "ADMIN" ||
                          account.id ===
                            currentUser?.id ? (
                            <span className="text-xs text-muted">
                              Protected account
                            </span>
                          ) : (
                            <Button
                              variant="outline"
                              disabled={busyId !== null}
                              onClick={() =>
                                void moderate(account)
                              }
                            >
                              {busyId === account.id
                                ? "Updating..."
                                : account.status ===
                                    "ACTIVE"
                                  ? "Suspend"
                                  : "Reactivate"}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 flex gap-3">
                    <Button
                      variant="outline"
                      disabled={
                        usersLoading || page <= 1
                      }
                      onClick={() =>
                        setPage((p) => p - 1)
                      }
                    >
                      Previous
                    </Button>

                    <Button
                      variant="outline"
                      disabled={
                        usersLoading ||
                        !users.hasMore
                      }
                      onClick={() =>
                        setPage((p) => p + 1)
                      }
                    >
                      Next
                    </Button>
                  </div>
                </>
              )}

              <p className="mt-4 text-xs leading-5 text-muted">
                Suspension blocks future authenticated
                requests. An account with live pending,
                confirmed or in-transit bookings cannot
                be suspended through this MVP control.
              </p>
            </DashboardPanel>

            <DashboardPanel
              title="Recent Moderation Audit"
              subtitle="Append-only entries recorded alongside each successful status change."
            >
              {!actions ? (
                <p className="text-sm text-muted">
                  No audit data loaded.
                </p>
              ) : actions.items.length === 0 ? (
                <p className="text-sm text-muted">
                  No moderation actions recorded yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {actions.items.map((action) => (
                    <div
                      key={action.id}
                      className="rounded-lg border border-line p-4"
                    >
                      <p className="text-sm font-semibold text-ink">
                        {action.targetEmailSnapshot}
                        {": "}
                        {action.previousStatus}
                        {" → "}
                        {action.nextStatus}
                      </p>

                      <p className="mt-1 text-xs text-muted">
                        {showDate(
                          action.createdAt
                        )}
                        {" · Admin "}
                        {action.adminId.slice(0, 8)}
                      </p>

                      <p className="mt-2 text-sm text-muted">
                        Reason: {action.reason}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </DashboardPanel>
          </>
        )}

        {view === "marketplace" && overview && (
          <>
            <DashboardPanel
              title="Latest Shipper Loads"
              subtitle="Ten most recent saved loads; review only (no automatic cancellations)."
            >
              {overview.recentLoads.length === 0 ? (
                <p className="text-sm text-muted">
                  No loads found.
                </p>
              ) : (
                <div className="space-y-3">
                  {overview.recentLoads.map(
                    (load) => (
                      <div
                        key={load.id}
                        className="rounded-lg border border-line p-4"
                      >
                        <p className="text-sm font-semibold text-ink">
                          {load.pickupName}
                          {" → "}
                          {load.deliveryName}
                        </p>

                        <p className="mt-1 text-xs text-muted">
                          {load.shipper.name}
                          {" · "}
                          {load.status}
                          {" · "}
                          {load.cargoType}
                          {" · "}
                          {Number(
                            load.weightKg
                          ).toLocaleString("en-IN")}
                          {" kg"}
                        </p>

                        <p className="mt-1 text-xs text-muted">
                          Created{" "}
                          {showDate(load.createdAt)}
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}
            </DashboardPanel>

            <DashboardPanel
              title="Latest Carrier Journeys"
              subtitle="Ten most recent advertised empty-leg journeys."
            >
              {overview.recentJourneys.length ===
              0 ? (
                <p className="text-sm text-muted">
                  No journeys found.
                </p>
              ) : (
                <div className="space-y-3">
                  {overview.recentJourneys.map(
                    (leg) => (
                      <div
                        key={leg.id}
                        className="rounded-lg border border-line p-4"
                      >
                        <p className="text-sm font-semibold text-ink">
                          {leg.originName}
                          {" → "}
                          {leg.destinationName}
                        </p>

                        <p className="mt-1 text-xs text-muted">
                          {
                            leg.truck
                              .registrationNumber
                          }
                          {" · "}
                          {
                            leg.truck.carrier
                              .name
                          }
                          {" · "}
                          {leg.status}
                          {" · "}
                          {Number(
                            leg.availableWeightKg
                          ).toLocaleString("en-IN")}
                          {" kg"}
                        </p>

                        <p className="mt-1 text-xs text-muted">
                          Departure{" "}
                          {showDate(leg.departureAt)}
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}
            </DashboardPanel>
          </>
        )}

        {view === "bookings" && overview && (
          <DashboardPanel
            title="Recent Marketplace Bookings"
            subtitle="Ten most recent booking requests across the marketplace. Read-only oversight."
          >
            {overview.recentBookings.length ===
            0 ? (
              <p className="text-sm text-muted">
                No bookings found.
              </p>
            ) : (
              <div className="space-y-3">
                {overview.recentBookings.map(
                  (booking) => (
                    <div
                      key={booking.id}
                      className="rounded-lg border border-line p-4"
                    >
                      <p className="text-sm font-semibold text-ink">
                        {booking.pickupName}
                        {" → "}
                        {booking.deliveryName}
                      </p>

                      <p className="mt-1 text-xs text-muted">
                        {booking.shipper.name}
                        {" · "}
                        {
                          booking.emptyLeg.truck
                            .registrationNumber
                        }
                        {" · "}
                        {booking.status}
                      </p>

                      <p className="mt-1 text-xs text-muted">
                        Requested{" "}
                        {showDate(
                          booking.requestedAt
                        )}
                        {" · Illustrative quote: "}
                        {booking.quotedPriceInr ==
                        null
                          ? "Unavailable"
                          : inr.format(
                              Number(
                                booking.quotedPriceInr
                              )
                            )}
                      </p>
                    </div>
                  )
                )}
              </div>
            )}

            <p className="mt-4 text-xs text-muted">
              Admins cannot approve, reject,
              complete or cancel a booking from
              this screen.
            </p>
          </DashboardPanel>
        )}

        <p className="flex items-center gap-2 text-xs leading-5 text-muted">
          <ShieldCheck size={16} />

          Admin-only data. Moderation status is
          distinct from booking and listing status;
          all booking changes remain on their
          original role-owned workflows.
        </p>
      </div>
    </DashboardLayout>
  );
}