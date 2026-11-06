
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Search,
  Truck,
  MapPin,
  Clock3,
  AlertTriangle,
} from "lucide-react";

import { Link } from "react-router-dom";

import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { DashboardPanel } from "../../components/dashboard/DashboardPanel";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

import { getLoads } from "../../services/loadApi";
import { findEligibleTrucks } from "../../services/matchingApi";

import type { ShipmentLoad } from "../../types/load";
import type {
  MatchingResponse,
  EligibleMatch,
} from "../../types/matching";

function showDate(value: string): string {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unexpected error while searching for trucks";
}

function MatchCard({
  match,
}: {
  match: EligibleMatch;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Truck size={20} className="text-brand" />

            <h3 className="text-base font-bold text-ink">
              {match.truckRegistration}
            </h3>
          </div>

          <p className="mt-2 text-sm text-muted">
            {match.equipmentType.replaceAll("_", " ")}
          </p>
        </div>

        <Badge
          variant={
            match.approximateLocations
              ? "warning"
              : "success"
          }
        >
          {match.approximateLocations
            ? "Provisional location fit"
            : "Coordinates available"}
        </Badge>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
        <MapPin size={16} className="text-brand" />

        <span>{match.originName}</span>

        <ArrowRight
          size={16}
          className="text-brand"
        />

        <span>{match.destinationName}</span>
      </div>

      <div className="mt-5 grid gap-4 rounded-lg bg-canvas p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted">
            Available weight
          </p>
          <p className="mt-1 font-semibold text-ink">
            {match.availableWeightKg.toLocaleString(
              "en-IN"
            )} kg
          </p>
        </div>

        <div>
          <p className="text-xs text-muted">
            Available volume
          </p>
          <p className="mt-1 font-semibold text-ink">
            {match.availableVolumeM3.toLocaleString(
              "en-IN"
            )} m³
          </p>
        </div>

        <div>
          <p className="text-xs text-muted">
            Additional road distance
          </p>
          <p className="mt-1 font-semibold text-ink">
            {match.additionalDistanceKm.toFixed(2)} km
          </p>
        </div>

        <div>
          <p className="text-xs text-muted">
            Maximum permitted detour
          </p>
          <p className="mt-1 font-semibold text-ink">
            {match.maxDetourKm.toFixed(2)} km
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-2 text-sm text-muted">
        <p className="flex items-start gap-2">
          <Clock3
            size={16}
            className="mt-0.5 shrink-0 text-brand"
          />
          <span>
            Truck departure:{" "}
            {showDate(match.departureAt)}
          </span>
        </p>

        <p>
          Estimated pickup:{" "}
          <strong className="text-ink">
            {showDate(match.estimatedPickupAt)}
          </strong>
        </p>

        <p>
          Estimated delivery:{" "}
          <strong className="text-ink">
            {showDate(match.estimatedDeliveryAt)}
          </strong>
        </p>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink">
          Why this candidate passed
        </p>

        <ul className="mt-3 space-y-2">
          {match.explanations.map((explanation) => (
            <li
              key={explanation}
              className="flex gap-2 text-xs leading-5 text-muted"
            >
              <span className="font-bold text-brand">
                ✓
              </span>
              <span>{explanation}</span>
            </li>
          ))}
        </ul>
      </div>

      {match.approximateLocations && (
        <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle
            size={16}
            className="mt-0.5 shrink-0 text-amber-700"
          />
          <p className="text-xs leading-5 text-amber-900">
            One or more locations use approximate
            city-center coordinates. Exact freight
            addresses must be verified before treating
            this as a confirmed geographic fit.
          </p>
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        Hard-filter candidate only. No price, score,
        booking, or capacity reservation is implied.
      </p>
    </div>
  );
}

export function ShipperMatchesPage() {
  const [loads, setLoads] = useState<ShipmentLoad[]>([]);
  const [selectedId, setSelectedId] = useState("");

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const [result, setResult] =
    useState<MatchingResponse | null>(null);

  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getLoads()
      .then((records) => {
        if (!active) return;

        setLoads(records);

        const firstActive = records.find(
          (load) => load.status === "ACTIVE"
        );

        setSelectedId(firstActive?.id ?? "");
      })
      .catch((err: unknown) => {
        if (active) {
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
  }, []);

  const activeLoads = loads.filter(
    (load) => load.status === "ACTIVE"
  );

  async function searchMatches() {
    if (!selectedId || searching) return;

    setSearching(true);
    setError("");
    setResult(null);

    try {
      const response =
        await findEligibleTrucks(selectedId);

      setResult(response);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSearching(false);
    }
  }

  return (
    <DashboardLayout
      role="shipper"
      title="FIND COMPATIBLE TRUCKS."
      description="Check your shipment against available carrier journeys, capacity, equipment, timing, and road detour requirements."
    >
      <div className="space-y-6">
        <DashboardPanel
          title="Shipment Matching"
          subtitle="Select a published shipment to evaluate"
        >
          {loading ? (
            <p
              role="status"
              className="text-sm text-muted"
            >
              Loading your shipments...
            </p>
          ) : activeLoads.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                You have no active shipments available
                for matching.
              </p>

              <Link
                to="/app/shipper/loads"
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand"
              >
                Create or publish a shipment
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-ink">
                  Choose Shipment
                </span>

                <select
                  value={selectedId}
                  disabled={searching}
                  onChange={(event) => {
                    setSelectedId(event.target.value);
                    setResult(null);
                    setError("");
                  }}
                  className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink"
                >
                  {activeLoads.map((load) => (
                    <option
                      key={load.id}
                      value={load.id}
                    >
                      {load.pickupName} →{" "}
                      {load.deliveryName} —{" "}
                      {Number(
                        load.weightKg
                      ).toLocaleString("en-IN")} kg
                    </option>
                  ))}
                </select>
              </label>

              <Button
                type="button"
                disabled={searching || !selectedId}
                onClick={() => void searchMatches()}
              >
                <Search size={17} />

                {searching
                  ? "Checking road and capacity compatibility..."
                  : "Find Eligible Trucks"}
              </Button>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="mt-4 text-sm text-red-700"
            >
              {error}
            </p>
          )}
        </DashboardPanel>

        {result && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-line bg-white p-5">
                <p className="text-xs text-muted">
                  Candidates passing filters
                </p>

                <p className="mt-2 text-3xl font-semibold text-ink">
                  {result.matches.length}
                </p>
              </div>

              <div className="rounded-xl border border-line bg-white p-5">
                <p className="text-xs text-muted">
                  Road checks completed
                </p>

                <p className="mt-2 text-3xl font-semibold text-brand">
                  {result.checks.routingChecks}
                </p>
              </div>

              <div className="rounded-xl border border-line bg-white p-5">
                <p className="text-xs text-muted">
                  Search completeness
                </p>

                <p className="mt-2 text-sm font-semibold text-ink">
                  {result.checks.partialResults
                    ? "Partial search"
                    : "Checked retrieved candidates"}
                </p>
              </div>
            </div>

            {result.checks.partialResults && (
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <AlertTriangle
                  size={20}
                  className="shrink-0 text-amber-700"
                />

                <p className="text-sm text-amber-900">
                  This search is incomplete. Some
                  candidates were not evaluated because
                  of the routing limit, unavailable
                  coordinates, or routing failures.
                  More compatible trucks may exist.
                </p>
              </div>
            )}

            <DashboardPanel
              title="Eligibility Results"
              subtitle="Unranked candidates passing the implemented hard filters"
            >
              {result.matches.length === 0 ? (
                <div className="py-8 text-center">
                  <Truck
                    size={32}
                    className="mx-auto text-brand"
                  />

                  <h3 className="mt-4 font-semibold text-ink">
                    No eligible candidates in this search
                  </h3>

                  <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">
                    No evaluated truck passed all the
                    eligibility checks. Check the cargo
                    volume, equipment requirement,
                    pickup windows, and carrier journey
                    availability.
                  </p>

                  {result.checks.partialResults && (
                    <p className="mt-2 text-xs text-amber-700">
                      This is not proof that no matching
                      truck exists in the marketplace.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {result.matches.map((match) => (
                    <MatchCard
                      key={match.emptyLegId}
                      match={match}
                    />
                  ))}
                </div>
              )}
            </DashboardPanel>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
