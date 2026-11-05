
import { useEffect } from "react";

import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import { latLngBounds } from "leaflet";
import type { LatLngTuple } from "leaflet";

import "leaflet/dist/leaflet.css";

import type {
  MapJourney,
  MapPoint,
} from "../../utils/mapLocations";

type JourneyMapProps = {
  journey: MapJourney | null;
};

const defaultCenter: LatLngTuple = [
  19.2,
  73.55,
];

const originColor = "#2F63FF";
const destinationColor = "#111111";

function FitMapToJourney({
  journey,
}: JourneyMapProps) {
  const map = useMap();

  const from = journey?.from?.position;
  const to = journey?.to?.position;

  useEffect(() => {
    if (from && to) {
      const bounds = latLngBounds([from, to]);

      if (from[0] === to[0] && from[1] === to[1]) {
        map.setView(from, 11);
      } else {
        map.fitBounds(bounds, {
          padding: [55, 55],
          maxZoom: 11,
        });
      }
    } else if (from || to) {
      map.setView((from ?? to)!, 11);
    } else {
      map.setView(defaultCenter, 7);
    }
  }, [
    map,
    from?.[0],
    from?.[1],
    to?.[0],
    to?.[1],
  ]);

  return null;
}

function LocationMarker({
  point,
  color,
  label,
}: {
  point: MapPoint;
  color: string;
  label: string;
}) {
  return (
    <CircleMarker
      center={point.position}
      radius={9}
      pathOptions={{
        color: "#FFFFFF",
        weight: 3,
        fillColor: color,
        fillOpacity: 1,
      }}
    >
      <Popup>
        <div>
          <strong>{label}: {point.name}</strong>
          <p>
            {point.approximate
              ? "Approximate city-center reference."
              : "Coordinates saved in the database."}
          </p>
        </div>
      </Popup>
    </CircleMarker>
  );
}

export function JourneyMap({
  journey,
}: JourneyMapProps) {
  const from = journey?.from;
  const to = journey?.to;

  return (
    <div className="overflow-hidden rounded-xl border border-[#E5E5E5] bg-white">
      <MapContainer
        center={defaultCenter}
        zoom={7}
        scrollWheelZoom={false}
        style={{
          height: "480px",
          width: "100%",
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitMapToJourney journey={journey} />

        {from && (
          <LocationMarker
            point={from}
            color={originColor}
            label="Origin / Pickup"
          />
        )}

        {to && (
          <LocationMarker
            point={to}
            color={destinationColor}
            label="Destination / Delivery"
          />
        )}

        {from && to && (
          <Polyline
            positions={[
              from.position,
              to.position,
            ]}
            pathOptions={{
              color: originColor,
              weight: 3,
              opacity: 0.85,
              dashArray: "8 10",
            }}
          />
        )}
      </MapContainer>

      <div className="space-y-2 border-t border-[#E5E5E5] px-4 py-3">
        <div className="flex flex-wrap items-center gap-5 text-xs text-[#6B6B6B]">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#2F63FF]" />
            Origin / Pickup
          </span>

          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#111111]" />
            Destination / Delivery
          </span>
        </div>

        <p className="text-xs leading-5 text-[#6B6B6B]">
          Dashed line indicates endpoint direction only.
          It does not represent a road route, driving
          distance, detour or estimated travel time.
        </p>

        {(from?.approximate || to?.approximate) && (
          <p className="text-xs leading-5 text-[#6B6B6B]">
            One or more locations use approximate city
            centers instead of exact freight addresses.
          </p>
        )}

        {journey && (!from || !to) && (
          <p className="text-xs font-medium text-amber-700">
            Some locations could not be plotted.
            Valid coordinates or supported city names
            are required.
          </p>
        )}
      </div>
    </div>
  );
}
