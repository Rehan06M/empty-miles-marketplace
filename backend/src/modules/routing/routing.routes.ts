
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";

import {
    authenticate,
    requireRole,
} from "../../middleware/authenticate.js";

const router = Router();

// Only authenticated marketplace participants
// can request road-route calculations.
router.use(
    authenticate,
    requireRole("SHIPPER", "CARRIER")
);

// Limit external API calls from one client.
router.use(
    rateLimit({
        windowMs: 60_000,
        limit: 12,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        message: {
            success: false,
            message: "Too many routing requests. Try again later.",
        },
    })
);

// Coordinates are [longitude, latitude] in the API.
const coordinateSchema = z.tuple([
    z.number().finite().min(-180).max(180),
    z.number().finite().min(-90).max(90),
]);

const previewSchema = z.object({
    origin: coordinateSchema,
    destination: coordinateSchema,

    pickup: coordinateSchema.optional(),
    delivery: coordinateSchema.optional(),

    maxDetourKm: z
        .number()
        .finite()
        .min(0)
        .max(1000)
        .optional(),
}).strict().superRefine((value, context) => {
    const hasPickup = value.pickup !== undefined;
    const hasDelivery = value.delivery !== undefined;

    if (hasPickup !== hasDelivery) {
        context.addIssue({
            code: "custom",
            message:
                "Pickup and delivery must both be provided for a detour",
            path: ["pickup"],
        });
    }

    if (!hasPickup && value.maxDetourKm !== undefined) {
        context.addIssue({
            code: "custom",
            message:
                "Maximum detour is only used with pickup and delivery",
            path: ["maxDetourKm"],
        });
    }
});

// Validate the provider response before trusting it.
const geoJsonSchema = z.object({
    features: z.array(
        z.object({
            geometry: z.object({
                type: z.literal("LineString"),
                coordinates: z.array(
                    z.array(z.number().finite()).min(2)
                ).min(2),
            }),
            properties: z.object({
                summary: z.object({
                    distance: z.number().finite().nonnegative(),
                    duration: z.number().finite().nonnegative(),
                }),
            }),
        })
    ).min(1),
});

type Coordinate = z.infer<typeof coordinateSchema>;

type RoadRoute = {
    distanceKm: number;
    durationMinutes: number;
    coordinates: [number, number][];
};

class RoutingError extends Error {
    constructor(
        public statusCode: number,
        message: string
    ) {
        super(message);
    }
}

async function requestRoute(
    coordinates: Coordinate[]
): Promise<RoadRoute> {
    const apiKey = process.env.ORS_API_KEY;

    if (!apiKey) {
        throw new RoutingError(
            503,
            "Routing service is not configured on the backend"
        );
    }

    let response: Response;

    try {
        response = await fetch(
            "https://api.openrouteservice.org/v2/directions/driving-hgv/geojson",
            {
                method: "POST",
                headers: {
                    Authorization: apiKey,
                    "Content-Type": "application/json",
                    Accept: "application/geo+json",
                },
                body: JSON.stringify({
                    coordinates,
                    instructions: false,
                    options: {
                        vehicle_type: "hgv",
                    },
                }),
                signal: AbortSignal.timeout(15000),
            }
        );
    } catch {
        throw new RoutingError(
            502,
            "The routing provider is unreachable or timed out"
        );
    }

    if (!response.ok) {
        if (response.status === 429) {
            throw new RoutingError(
                429,
                "The routing provider's request limit was reached"
            );
        }

        if (
            response.status === 401 ||
            response.status === 403
        ) {
            throw new RoutingError(
                503,
                "Routing provider authentication failed"
            );
        }

        if (
            response.status === 400 ||
            response.status === 404 ||
            response.status === 413
        ) {
            throw new RoutingError(
                422,
                "A road route could not be calculated for these points"
            );
        }

        throw new RoutingError(
            502,
            "The routing provider returned an error"
        );
    }

    const raw: unknown = await response.json();
    const parsed = geoJsonSchema.safeParse(raw);

    if (!parsed.success) {
        throw new RoutingError(
            502,
            "The routing provider returned an invalid route"
        );
    }

    const feature = parsed.data.features[0];
    const summary = feature.properties.summary;

    // GeoJSON uses [longitude, latitude].
    // Convert to [latitude, longitude] for Leaflet.
    const leafletCoordinates: [number, number][] =
        feature.geometry.coordinates.map((point) => [
            point[1],
            point[0],
        ]);

    return {
        distanceKm: summary.distance / 1000,
        durationMinutes: summary.duration / 60,
        coordinates: leafletCoordinates,
    };
}

// POST /api/v1/routing/preview
//
// Two waypoints:
// origin -> destination
//
// Four waypoints:
// origin -> pickup -> delivery -> destination
router.post("/preview", async (req, res, next) => {
    try {
        const parsed = previewSchema.safeParse(req.body);

        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Invalid routing coordinates",
                errors: z.flattenError(parsed.error),
            });
            return;
        }

        const input = parsed.data;

        const baselinePromise = requestRoute([
            input.origin,
            input.destination,
        ]);

        const hasDetour =
            input.pickup !== undefined &&
            input.delivery !== undefined;

        if (!hasDetour) {
            const baseline = await baselinePromise;

            res.json({
                success: true,
                data: {
                    profile: "driving-hgv",
                    baseline,
                    via: null,
                    additionalDistanceKm: null,
                    additionalDurationMinutes: null,
                    withinMaxDetour: null,
                    maxDetourKm: null,
                    source: "openrouteservice",
                },
            });

            return;
        }

        const [baseline, via] = await Promise.all([
            baselinePromise,
            requestRoute([
                input.origin,
                input.pickup!,
                input.delivery!,
                input.destination,
            ]),
        ]);

        const additionalDistanceKm = Math.max(
            0,
            via.distanceKm - baseline.distanceKm
        );

        const additionalDurationMinutes = Math.max(
            0,
            via.durationMinutes - baseline.durationMinutes
        );

        const maxDetourKm = input.maxDetourKm ?? null;

        const withinMaxDetour =
            maxDetourKm === null
                ? null
                : additionalDistanceKm <= maxDetourKm;

        res.json({
            success: true,
            data: {
                profile: "driving-hgv",
                baseline,
                via,
                additionalDistanceKm,
                additionalDurationMinutes,
                maxDetourKm,
                withinMaxDetour,
                source: "openrouteservice",
            },
        });
    } catch (error) {
        if (error instanceof RoutingError) {
            res.status(error.statusCode).json({
                success: false,
                message: error.message,
            });
            return;
        }

        next(error);
    }
});

export default router;
