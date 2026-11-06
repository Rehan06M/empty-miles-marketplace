
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
  RoutePreview,
} from "../../services/routingApi";

export type RoadMapMarker = {
  label: string;
  position: LatLngTuple;
  kind: "origin" | "destination" | "waypoint";
};

type Props = {
  result: RoutePreview;
  markers: RoadMapMarker[];
};

const defaultCenter: LatLngTuple = [19.2, 73.55];

function FitRoadRoute({ result }: { result: RoutePreview }) {
  const map = useMap();

  useEffect(() => {
    const points = result.via
      ? result.via.coordinates
      : result.baseline.coordinates;

    if (points.length > 1) {
      map.fitBounds(
        latLngBounds(points),
        {
          padding: [35, 35],
          maxZoom: 12,
        }
      );
    }
  }, [map, result]);

  return null;
}

function RoadMarker({ marker }: { marker: RoadMapMarker }) {
  const color =
    marker.kind === "waypoint"
      ? "#D97706"
      : marker.kind === "origin"
        ? "#2F63FF"
        : "#111111";

  return (
    <CircleMarker
      center={marker.position}
      radius={8}
      pathOptions={{
        color: "#FFFFFF",
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      }}
    >
      <Popup>{marker.label}</Popup>
    </CircleMarker>
  );
}

export function RoadRouteMap({
  result,
  markers,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E5E5E5] bg-white">
      <MapContainer
        center={defaultCenter}
        zoom={7}
        scrollWheelZoom={false}
        style={{
          width: "100%",
          height: "480px",
        }}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <FitRoadRoute result={result} />

        <Polyline
          positions={result.baseline.coordinates}
          pathOptions={{
            color: "#2F63FF",
            weight: 5,
            opacity: 0.85,
          }}
        />

        {result.via && (
          <Polyline
            positions={result.via.coordinates}
            pathOptions={{
              color: "#D97706",
              weight: 4,
              opacity: 0.95,
              dashArray: "8 6",
            }}
          />
        )}

        {markers.map((marker, index) => (
          <RoadMarker key={index} marker={marker} />
        ))}
      </MapContainer>

      <div className="flex flex-wrap gap-5 border-t border-[#E5E5E5] px-4 py-4 text-xs text-[#6B6B6B]">
        <span className="flex items-center gap-2">
          <span className="h-[4px] w-6 rounded-full bg-[#2F63FF]" />
          Original road route
        </span>

        {result.via && (
          <span className="flex items-center gap-2">
            <span className="h-[4px] w-6 border-t-4 border-dashed border-[#D97706]" />
            Route via pickup and delivery
          </span>
        )}
      </div>
    </div>
  );
}
