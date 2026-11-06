
import { apiRequest } from "./apiClient";

// Geographic coordinates in longitude, latitude order.
export type RoutingPoint = [number, number];

// Returned polylines use Leaflet's latitude, longitude order.
export type RoadRoute = {
  distanceKm: number;
  durationMinutes: number;
  coordinates: [number, number][];
};

export type RoutePreviewInput = {
  origin: RoutingPoint;
  destination: RoutingPoint;
  pickup?: RoutingPoint;
  delivery?: RoutingPoint;
  maxDetourKm?: number;
};

export type RoutePreview = {
  profile: "driving-hgv";
  baseline: RoadRoute;
  via: RoadRoute | null;
  additionalDistanceKm: number | null;
  additionalDurationMinutes: number | null;
  maxDetourKm: number | null;
  withinMaxDetour: boolean | null;
  source: string;
};

export function previewRoadRoute(
  input: RoutePreviewInput
): Promise<RoutePreview> {
  return apiRequest<RoutePreview>("/routing/preview", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
