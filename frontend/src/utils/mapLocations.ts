
import type { LatLngTuple } from "leaflet";

export type MapPoint = {
  name: string;
  position: LatLngTuple;
  approximate: boolean;
};

export type MapJourney = {
  id: string;
  title: string;
  description: string;
  status: string;
  from: MapPoint | null;
  to: MapPoint | null;
};

// Approximate city reference positions.
// These are NOT exact pickup points, warehouses,
// truck GPS positions or road-route waypoints.
const cityCenters: Record<string, LatLngTuple> = {
  mumbai: [19.054999, 72.869204],
  pune: [18.521374, 73.854507],
  lonavala: [18.74806, 73.407219],
  lonavla: [18.74806, 73.407219],
  panvel: [18.989525, 73.122194],
  bhiwandi: [19.30023, 73.05881],
  chakan: [18.7606, 73.8635],
  nashik: [20.011248, 73.790236],
};

function validCoordinatePair(
  lat: string | number | null | undefined,
  lng: string | number | null | undefined
): LatLngTuple | null {
  if (lat == null || lng == null) {
    return null;
  }

  if (lat === "" || lng === "") {
    return null;
  }

  const latitude = Number(lat);
  const longitude = Number(lng);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return [latitude, longitude];
}

export function resolveMapPoint(
  name: string,
  lat?: string | number | null,
  lng?: string | number | null
): MapPoint | null {
  const actual = validCoordinatePair(lat, lng);

  if (actual) {
    return {
      name,
      position: actual,
      approximate: false,
    };
  }

  const normalizedName = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  const fallback = cityCenters[normalizedName];

  if (!fallback) {
    return null;
  }

  return {
    name,
    position: fallback,
    approximate: true,
  };
}
