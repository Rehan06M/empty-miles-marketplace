
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Route } from "lucide-react";

import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { DashboardPanel } from "../../components/dashboard/DashboardPanel";

import {
  RoadRouteMap,
} from "../../components/maps/RoadRouteMap";
import type {
  RoadMapMarker,
} from "../../components/maps/RoadRouteMap";

import { getLoads } from "../../services/loadApi";
import { getEmptyLegs } from "../../services/emptyLegApi";
import {
  previewRoadRoute,
} from "../../services/routingApi";
import type {
  RoutePreview,
  RoutingPoint,
} from "../../services/routingApi";

import { resolveMapPoint } from "../../utils/mapLocations";
import type { MapPoint } from "../../utils/mapLocations";

import type { ShipmentLoad } from "../../types/load";
import type { EmptyLeg } from "../../types/carrier";

type Role = "shipper" | "carrier";

type RecordItem = {
  id: string;
  label: string;
  origin: MapPoint | null;
  destination: MapPoint | null;
  maxDetourKm: number | null;
};

const cities = [
  "Mumbai",
  "Panvel",
  "Lonavala",
  "Pune",
  "Bhiwandi",
  "Chakan",
  "Nashik",
];

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-3 text-sm text-[#111111]";

function convertPoint(point: MapPoint): RoutingPoint {
  return [point.position[1], point.position[0]];
}

function fromLoad(load: ShipmentLoad): RecordItem {
  return {
    id: load.id,
    label: `${load.pickupName} → ${load.deliveryName}`,
    origin: resolveMapPoint(
      load.pickupName,
      load.pickupLat,
      load.pickupLng
    ),
    destination: resolveMapPoint(
      load.deliveryName,
      load.deliveryLat,
      load.deliveryLng
    ),
    maxDetourKm: null,
  };
}

function fromLeg(leg: EmptyLeg): RecordItem {
  return {
    id: leg.id,
    label: `${leg.originName} → ${leg.destinationName}`,
    origin: resolveMapPoint(
      leg.originName,
      leg.originLat,
      leg.originLng
    ),
    destination: resolveMapPoint(
      leg.destinationName,
      leg.destinationLat,
      leg.destinationLng
    ),
    maxDetourKm: Number(leg.maxDetourKm),
  };
}

function errorText(err: unknown): string {
  return err instanceof Error
    ? err.message
    : "Unexpected routing error";
}

export function RoadAnalysisPage({
  role,
}: {
  role: Role;
}) {
  const isCarrier = role === "carrier";

  const [records, setRecords] = useState<RecordItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  const [includeDetour, setIncludeDetour] = useState(false);
  const [pickupCity, setPickupCity] = useState("Panvel");
  const [deliveryCity, setDeliveryCity] =
    useState("Lonavala");

  const [result, setResult] = useState<RoutePreview | null>(
    null
  );

  const [markers, setMarkers] = useState<RoadMapMarker[]>([]);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    async function loadRecords() {
      try {
        const list = isCarrier
          ? (await getEmptyLegs()).map(fromLeg)
          : (await getLoads()).map(fromLoad);

        if (!active) return;

        setRecords(list);
        setSelectedId(list[0]?.id ?? "");
      } catch (err) {
        if (active) setError(errorText(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadRecords();

    return () => {
      active = false;
    };
  }, [isCarrier]);

  const selected =
    records.find((item) => item.id === selectedId) ??
    null;

  async function calculate() {
    setError("");
    setWarning("");
    setResult(null);
    setMarkers([]);

    if (!selected?.origin || !selected.destination) {
      setError(
        "This record requires valid coordinates or a supported city name."
      );
      return;
    }

    const origin = selected.origin;
    const destination = selected.destination;

    const newMarkers: RoadMapMarker[] = [
      {
        label: `Origin: ${origin.name}`,
        position: origin.position,
        kind: "origin",
      },
      {
        label: `Destination: ${destination.name}`,
        position: destination.position,
        kind: "destination",
      },
    ];

    const input = {
      origin: convertPoint(origin),
      destination: convertPoint(destination),
    } as {
      origin: RoutingPoint;
      destination: RoutingPoint;
      pickup?: RoutingPoint;
      delivery?: RoutingPoint;
      maxDetourKm?: number;
    };

    let approximate =
      origin.approximate || destination.approximate;

    if (isCarrier && includeDetour) {
      const pickup = resolveMapPoint(pickupCity);
      const delivery = resolveMapPoint(deliveryCity);

      if (!pickup || !delivery) {
        setError("Invalid pickup or delivery location");
        return;
      }

      input.pickup = convertPoint(pickup);
      input.delivery = convertPoint(delivery);

      if (selected.maxDetourKm !== null) {
        input.maxDetourKm = selected.maxDetourKm;
      }

      newMarkers.push(
        {
          label: `Pickup: ${pickupCity}`,
          position: pickup.position,
          kind: "waypoint",
        },
        {
          label: `Delivery: ${deliveryCity}`,
          position: delivery.position,
          kind: "waypoint",
        }
      );

      approximate = true;
    }

    if (approximate) {
      setWarning(
        "Approximate city-center coordinates are being used. Results are not based on exact loading addresses."
      );
    }

    setCalculating(true);

    try {
      const calculated = await previewRoadRoute(input);
      setResult(calculated);
      setMarkers(newMarkers);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setCalculating(false);
    }
  }

  const mapPath = isCarrier
    ? "/app/carrier/map"
    : "/app/shipper/map";

  return (
    <DashboardLayout
      role={role}
      title="ROAD ROUTE ANALYSIS."
      description="Calculate road geometry and evaluate additional detour distance."
    >
      <div className="space-y-6">
        <Link
          to={mapPath}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#2F63FF]"
        >
          <ArrowLeft size={16} />
          Back to Route Map
        </Link>

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <DashboardPanel
            title="Route Calculator"
            subtitle="Road network calculations"
          >
            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold">
                  {isCarrier
                    ? "Select your truck journey"
                    : "Select your shipment"}
                </span>

                <select
                  className={inputClass}
                  value={selectedId}
                  disabled={loading || calculating}
                  onChange={(event) => {
                    setSelectedId(event.target.value);
                    setResult(null);
                    setWarning("");
                  }}
                >
                  {records.length === 0 && (
                    <option value="">No saved records</option>
                  )}

                  {records.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              {isCarrier && (
                <>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={includeDetour}
                      disabled={calculating}
                      onChange={(event) => {
                        setIncludeDetour(event.target.checked);
                        setResult(null);
                      }}
                    />
                    Calculate pickup and delivery detour
                  </label>

                  {includeDetour && (
                    <>
                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold">
                          Test Pickup
                        </span>
                        <select
                          className={inputClass}
                          value={pickupCity}
                          disabled={calculating}
                          onChange={(event) => {
                            setPickupCity(event.target.value);
                            setResult(null);
                          }}
                        >
                          {cities.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold">
                          Test Delivery
                        </span>
                        <select
                          className={inputClass}
                          value={deliveryCity}
                          disabled={calculating}
                          onChange={(event) => {
                            setDeliveryCity(event.target.value);
                            setResult(null);
                          }}
                        >
                          {cities.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={() => void calculate()}
                disabled={
                  loading ||
                  calculating ||
                  !selected ||
                  !selected.origin ||
                  !selected.destination
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2F63FF] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Route size={18} />
                {calculating
                  ? "Calculating road route..."
                  : "Calculate Road Route"}
              </button>

              {loading && (
                <p className="text-sm text-[#6B6B6B]">
                  Loading your records...
                </p>
              )}

              {error && (
                <p role="alert" className="text-sm text-red-700">
                  {error}
                </p>
              )}

              {warning && (
                <p className="text-xs leading-5 text-amber-700">
                  {warning}
                </p>
              )}
            </div>
          </DashboardPanel>

          <div className="min-w-0 space-y-5">
            {result ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
                    <p className="text-xs text-[#6B6B6B]">
                      Original Road Distance
                    </p>
                    <p className="mt-2 text-2xl font-semibold">
                      {result.baseline.distanceKm.toFixed(2)} km
                    </p>
                    <p className="mt-1 text-xs text-[#6B6B6B]">
                      Estimated driving time:{" "}
                      {result.baseline.durationMinutes.toFixed(1)} min
                    </p>
                  </div>

                  {result.via ? (
                    <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
                      <p className="text-xs text-[#6B6B6B]">
                        Via Pickup & Delivery
                      </p>
                      <p className="mt-2 text-2xl font-semibold">
                        {result.via.distanceKm.toFixed(2)} km
                      </p>
                      <p className="mt-1 text-xs text-[#6B6B6B]">
                        Additional distance:{" "}
                        {result.additionalDistanceKm?.toFixed(2)} km
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
                      <p className="text-xs text-[#6B6B6B]">
                        Routing Profile
                      </p>
                      <p className="mt-2 font-semibold">
                        General heavy goods vehicle
                      </p>
                    </div>
                  )}
                </div>

                {result.via && (
                  <div className="rounded-xl border border-[#E5E5E5] bg-white p-4 text-sm">
                    <p>
                      Additional driving time:{" "}
                      <strong>
                        {result.additionalDurationMinutes?.toFixed(1)} min
                      </strong>
                    </p>

                    <p className="mt-2">
                      Configured maximum detour:{" "}
                      <strong>
                        {result.maxDetourKm ?? "Not specified"} km
                      </strong>
                    </p>

                    <p className="mt-2">
                      Distance threshold:{" "}
                      <strong>
                        {result.withinMaxDetour === null
                          ? "Not evaluated"
                          : result.withinMaxDetour
                            ? "Within limit"
                            : "Exceeds limit"}
                      </strong>
                    </p>

                    <p className="mt-2 text-xs text-[#6B6B6B]">
                      This is a distance comparison only,
                      not a shipment eligibility decision.
                    </p>
                  </div>
                )}

                <RoadRouteMap
                  result={result}
                  markers={markers}
                />

                <p className="text-xs leading-5 text-[#6B6B6B]">
                  Road geometry and estimates are from
                  openrouteservice using a generic HGV profile.
                  Actual truck restrictions, live traffic and
                  legal vehicle clearance are not verified.
                </p>
              </>
            ) : (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-[#E5E5E5] bg-white p-8 text-center">
                <Route
                  size={32}
                  className="text-[#2F63FF]"
                />
                <h2 className="mt-4 font-semibold">
                  Road-route preview
                </h2>
                <p className="mt-2 max-w-sm text-sm text-[#6B6B6B]">
                  Choose a saved record and click Calculate
                  Road Route to obtain real road geometry.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
