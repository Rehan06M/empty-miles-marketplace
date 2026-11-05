
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  MapPinned,
  RefreshCw,
} from "lucide-react";

import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { DashboardPanel } from "../../components/dashboard/DashboardPanel";
import { JourneyMap } from "../../components/maps/JourneyMap";

import { getLoads } from "../../services/loadApi";
import { getEmptyLegs } from "../../services/emptyLegApi";

import type { ShipmentLoad } from "../../types/load";
import type { EmptyLeg } from "../../types/carrier";

import {
  resolveMapPoint,
} from "../../utils/mapLocations";

import type {
  MapJourney,
} from "../../utils/mapLocations";

type MapRole = "shipper" | "carrier";

type RouteMapPageProps = {
  role: MapRole;
};

function fromLoad(load: ShipmentLoad): MapJourney {
  return {
    id: load.id,
    title: `${load.pickupName} → ${load.deliveryName}`,
    description: `${load.cargoDescription} · ${Number(
      load.weightKg
    ).toLocaleString("en-IN")} kg`,
    status: load.status,

    from: resolveMapPoint(
      load.pickupName,
      load.pickupLat,
      load.pickupLng
    ),

    to: resolveMapPoint(
      load.deliveryName,
      load.deliveryLat,
      load.deliveryLng
    ),
  };
}

function fromEmptyLeg(leg: EmptyLeg): MapJourney {
  return {
    id: leg.id,
    title: `${leg.originName} → ${leg.destinationName}`,
    description: `${
      leg.truck?.registrationNumber ?? "Truck"
    } · ${Number(
      leg.availableWeightKg
    ).toLocaleString("en-IN")} kg available`,
    status: leg.status,

    from: resolveMapPoint(
      leg.originName,
      leg.originLat,
      leg.originLng
    ),

    to: resolveMapPoint(
      leg.destinationName,
      leg.destinationLat,
      leg.destinationLng
    ),
  };
}

export function RouteMapPage({
  role,
}: RouteMapPageProps) {
  const [journeys, setJourneys] = useState<MapJourney[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isShipper = role === "shipper";

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setJourneys([]);
    setSelectedId(null);

    async function fetchJourneys() {
      try {
        const records: MapJourney[] = isShipper
          ? (await getLoads()).map(fromLoad)
          : (await getEmptyLegs()).map(fromEmptyLeg);

        if (!active) return;

        setJourneys(records);
        setSelectedId(records[0]?.id ?? null);
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load map records."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void fetchJourneys();

    return () => {
      active = false;
    };
  }, [isShipper]);

  const selected =
    journeys.find((journey) => journey.id === selectedId) ??
    null;

  const mappedCount = journeys.filter(
    (journey) => journey.from && journey.to
  ).length;

  const destinationPath = isShipper
    ? "/app/shipper/loads"
    : "/app/carrier/empty-legs";

  return (
    <DashboardLayout
      role={role}
      title="ROUTE VISUALIZATION."
      description={
        isShipper
          ? "Explore the pickup and delivery locations of your saved shipments."
          : "Explore the origin and destination locations of your published truck journeys."
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-[#6B6B6B]">
              Saved Records
            </p>
            <p className="mt-2 text-3xl font-semibold text-[#111111]">
              {journeys.length}
            </p>
          </div>

          <div className="rounded-xl border border-[#E5E5E5] bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-[#6B6B6B]">
              Fully Plottable
            </p>
            <p className="mt-2 text-3xl font-semibold text-[#2F63FF]">
              {mappedCount}
            </p>
          </div>

          <div className="rounded-xl border border-[#E5E5E5] bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-[#6B6B6B]">
              Map Mode
            </p>
            <p className="mt-2 text-sm font-semibold text-[#111111]">
              Endpoint Visualization
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-white p-4 text-sm text-red-700"
          >
            {error}

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="ml-3 inline-flex items-center gap-1 font-semibold underline"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div
            role="status"
            className="rounded-xl border border-[#E5E5E5] bg-white p-8 text-sm text-[#6B6B6B]"
          >
            Loading saved locations...
          </div>
        ) : journeys.length === 0 && !error ? (
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-8">
            <MapPinned
              size={32}
              className="text-[#2F63FF]"
            />

            <h2 className="mt-4 text-xl font-semibold text-[#111111]">
              No saved journeys to display
            </h2>

            <p className="mt-2 text-sm text-[#6B6B6B]">
              {isShipper
                ? "Create a shipment first to view its pickup and delivery locations."
                : "Publish an empty-leg journey first to view its origin and destination locations."}
            </p>

            <Link
              to={destinationPath}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#2F63FF] px-5 py-3 text-sm font-semibold text-white"
            >
              {isShipper
                ? "Go to My Loads"
                : "Go to Empty Legs"}
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : journeys.length > 0 ? (
          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <DashboardPanel
              title={
                isShipper
                  ? "My Shipment Routes"
                  : "My Truck Journeys"
              }
              subtitle="Select a record to visualize"
            >
              <div className="max-h-[560px] space-y-3 overflow-y-auto">
                {journeys.map((journey) => {
                  const selectedRow =
                    journey.id === selectedId;

                  const canMap =
                    Boolean(journey.from && journey.to);

                  return (
                    <button
                      key={journey.id}
                      type="button"
                      onClick={() =>
                        setSelectedId(journey.id)
                      }
                      aria-pressed={selectedRow}
                      className={[
                        "w-full rounded-lg border p-4 text-left transition-colors",
                        selectedRow
                          ? "border-[#2F63FF] bg-[#2F63FF]/5"
                          : "border-[#E5E5E5] bg-white hover:border-[#2F63FF]/50",
                      ].join(" ")}
                    >
                      <p className="text-sm font-semibold text-[#111111]">
                        {journey.title}
                      </p>

                      <p className="mt-2 text-xs leading-5 text-[#6B6B6B]">
                        {journey.description}
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-[#6B6B6B]">
                          {journey.status}
                        </span>

                        <span
                          className={
                            canMap
                              ? "text-[11px] font-semibold text-[#2F63FF]"
                              : "text-[11px] font-semibold text-amber-700"
                          }
                        >
                          {canMap
                            ? "Both points available"
                            : "Location data incomplete"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </DashboardPanel>

            <div className="min-w-0 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-[#111111]">
                  {selected?.title ?? "Map"}
                </h2>

                <p className="mt-1 text-sm text-[#6B6B6B]">
                  {selected?.description}
                </p>
              </div>

              <JourneyMap journey={selected} />

              <p className="text-xs leading-5 text-[#6B6B6B]">
                This is a geographic endpoint preview,
                not a verified driving route or match.
                Road geometry and detour analysis
                will be implemented in Step 16.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
