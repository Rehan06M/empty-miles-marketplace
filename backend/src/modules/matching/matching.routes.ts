
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";

import { prisma } from "../../database/prisma.js";
import {
    authenticate,
    requireRole,
    getAuthenticatedUser,
} from "../../middleware/authenticate.js";

const router = Router();

router.use(authenticate, requireRole("SHIPPER"));

router.use(
    rateLimit({
        windowMs: 60_000,
        limit: 6,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        message: {
            success: false,
            message: "Too many matching requests. Try again shortly.",
        },
    })
);

const idSchema = z.uuid();

// [longitude, latitude]
type Point = [number, number];

// Approximate city reference points.
// These are not actual warehouse or loading addresses.
const cityCoordinates: Record<string, Point> = {
    mumbai: [72.869204, 19.054999],
    pune: [73.854507, 18.521374],
    lonavala: [73.407219, 18.74806],
    lonavla: [73.407219, 18.74806],
    panvel: [73.122194, 18.989525],
    bhiwandi: [73.05881, 19.30023],
    chakan: [73.8635, 18.7606],
    nashik: [73.790236, 20.011248],
};

function resolvePoint(
    name: string,
    latitude: unknown,
    longitude: unknown
): { point: Point; approximate: boolean } | null {
    if (latitude != null && longitude != null) {
        const lat = Number(latitude);
        const lng = Number(longitude);

        if (
            Number.isFinite(lat) &&
            Number.isFinite(lng) &&
            lat >= -90 &&
            lat <= 90 &&
            lng >= -180 &&
            lng <= 180
        ) {
            return {
                point: [lng, lat],
                approximate: false,
            };
        }
    }

    const normalized = name.trim().toLowerCase();
    const fallback = cityCoordinates[normalized];

    if (!fallback) return null;

    return {
        point: fallback,
        approximate: true,
    };
}

const routeSchema = z.object({
    features: z.array(
        z.object({
            geometry: z.object({
                type: z.literal("LineString"),
                coordinates: z.array(
                    z.tuple([
                        z.number().finite(),
                        z.number().finite(),
                    ])
                ).min(2),
            }),
            properties: z.object({
                summary: z.object({
                    distance: z.number().finite().nonnegative(),
                    duration: z.number().finite().nonnegative(),
                }),
                segments: z.array(
                    z.object({
                        distance: z.number().finite().nonnegative(),
                        duration: z.number().finite().nonnegative(),
                    })
                ),
            }),
        })
    ).min(1),
});

type RoadRoute = {
    distanceMetres: number;
    durationSeconds: number;
    geometry: Point[];
    segmentDurations: number[];
};

class ProviderError extends Error { }

async function fetchRoadRoute(
    points: Point[]
): Promise<RoadRoute> {
    const key = process.env.ORS_API_KEY;

    if (!key) {
        throw new ProviderError(
            "ORS_API_KEY is missing from backend configuration"
        );
    }

    let response: Response;

    try {
        response = await fetch(
            "https://api.openrouteservice.org/v2/directions/driving-hgv/geojson",
            {
                method: "POST",
                headers: {
                    Authorization: key,
                    "Content-Type": "application/json",
                    Accept: "application/geo+json",
                },
                body: JSON.stringify({
                    coordinates: points,
                    instructions: true,
                    options: {
                        vehicle_type: "hgv",
                    },
                }),
                signal: AbortSignal.timeout(15000),
            }
        );
    } catch {
        throw new ProviderError(
            "Routing service connection failed or timed out"
        );
    }

    if (!response.ok) {
        throw new ProviderError(
            `Routing service returned HTTP ${response.status}`
        );
    }

    let raw: unknown;

    try {
        raw = await response.json();
    } catch {
        throw new ProviderError("Invalid routing response");
    }

    const parsed = routeSchema.safeParse(raw);

    if (!parsed.success) {
        console.error(
            "ORS response validation failed:",
            z.treeifyError(parsed.error)
        );

        throw new ProviderError(
            "Routing service returned incomplete geometry or segments"
        );
    }

    const feature = parsed.data.features[0];

    if (
        feature.properties.segments.length !==
        points.length - 1
    ) {
        throw new ProviderError(
            "Routing response did not contain all waypoint segments"
        );
    }

    return {
        distanceMetres: feature.properties.summary.distance,
        durationSeconds: feature.properties.summary.duration,
        geometry: feature.geometry.coordinates,
        segmentDurations:
            feature.properties.segments.map(
                (segment) => segment.duration
            ),
    };
}

function distanceKm(a: Point, b: Point): number {
    const radians = Math.PI / 180;

    const lat1 = a[1] * radians;
    const lat2 = b[1] * radians;
    const deltaLat = (b[1] - a[1]) * radians;
    const deltaLng = (b[0] - a[0]) * radians;

    const h =
        Math.sin(deltaLat / 2) ** 2 +
        Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLng / 2) ** 2;

    return (
        6371 *
        2 *
        Math.atan2(
            Math.sqrt(h),
            Math.sqrt(Math.max(0, 1 - h))
        )
    );
}

// Approximate position along the baseline polyline.
// Used as a direction-consistency check.
function routeProgress(
    geometry: Point[],
    target: Point
): number {
    let nearestDistance = Infinity;
    let nearestProgress = 0;
    let progress = 0;

    for (let i = 0; i < geometry.length; i++) {
        if (i > 0) {
            progress += distanceKm(
                geometry[i - 1],
                geometry[i]
            );
        }

        const separation = distanceKm(
            geometry[i],
            target
        );

        if (separation < nearestDistance) {
            nearestDistance = separation;
            nearestProgress = progress;
        }
    }

    return nearestProgress;
}

function normalize(value: string): string {
    return value.trim().toLowerCase();
}

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

function validVolume(
    loadVolume: number | null,
    legVolume: number | null
): boolean {
    // Unknown volume cannot establish a verified fit.
    if (loadVolume === null || legVolume === null) {
        return false;
    }

    return loadVolume <= legVolume;
}

// GET /api/v1/matching/loads/:loadId
router.get("/loads/:loadId", async (req, res, next) => {
    try {
        const parsedId = idSchema.safeParse(req.params.loadId);

        if (!parsedId.success) {
            res.status(400).json({
                success: false,
                message: "Invalid shipment ID",
            });
            return;
        }

        const shipperId = getAuthenticatedUser(res).id;

        const load = await prisma.load.findFirst({
            where: {
                id: parsedId.data,
                shipperId,
            },
        });

        if (!load) {
            res.status(404).json({
                success: false,
                message: "Shipment not found",
            });
            return;
        }

        if (load.status !== "ACTIVE") {
            res.status(409).json({
                success: false,
                message:
                    "Publish this shipment as ACTIVE before searching for trucks",
            });
            return;
        }

        const pickup = resolvePoint(
            load.pickupName,
            load.pickupLat,
            load.pickupLng
        );

        const delivery = resolvePoint(
            load.deliveryName,
            load.deliveryLat,
            load.deliveryLng
        );

        if (!pickup || !delivery) {
            res.status(422).json({
                success: false,
                message:
                    "Pickup or delivery coordinates are unavailable",
            });
            return;
        }

        if (load.volumeM3 === null) {
            res.status(422).json({
                success: false,
                message:
                    "Enter shipment volume before eligibility matching",
            });
            return;
        }

        const now = new Date();

        // Find currently active carrier journeys.
        // This is a bounded MVP candidate search.
        const legs = await prisma.emptyLeg.findMany({
            where: {
                status: "ACTIVE",
                departureAt: { gt: now },
                truck: {
                    status: "ACTIVE",
                    carrier: { status: "ACTIVE" },
                },
            },
            include: {
                truck: {
                    select: {
                        registrationNumber: true,
                        equipmentType: true,
                        status: true,
                    },
                },
            },
            orderBy: [
                { departureAt: "asc" },
                { id: "asc" },
            ],
            take: 200,
        });

        const loadWeight = load.weightKg.toNumber();
        const loadVolume = load.volumeM3.toNumber();

        const cheapCandidates = legs.filter((leg) => {
            if (
                leg.availableWeightKg.toNumber() <
                loadWeight
            ) {
                return false;
            }

            if (
                !validVolume(
                    loadVolume,
                    leg.availableVolumeM3?.toNumber() ?? null
                )
            ) {
                return false;
            }

            if (
                load.requiredEquipment !== null &&
                leg.truck.equipmentType !==
                load.requiredEquipment
            ) {
                return false;
            }

            if (
                leg.acceptedCargoTypes.length > 0 &&
                !leg.acceptedCargoTypes
                    .map(normalize)
                    .includes(normalize(load.cargoType))
            ) {
                return false;
            }

            // Carrier cannot start after the shipment's
            // pickup window has already finished.
            if (
                leg.departureAt >
                load.pickupWindowEnd
            ) {
                return false;
            }

            return true;
        });

        // Keep ORS usage bounded, especially on free keys.
        const candidates = cheapCandidates.slice(0, 8);
        const truncated =
            cheapCandidates.length > candidates.length ||
            legs.length === 200;

        const matches: Array<{
            emptyLegId: string;
            truckRegistration: string;
            equipmentType: string;
            originName: string;
            destinationName: string;
            departureAt: string;
            availableWeightKg: number;
            availableVolumeM3: number;
            maxDetourKm: number;
            additionalDistanceKm: number;
            additionalDurationMinutes: number;
            estimatedPickupAt: string;
            estimatedDeliveryAt: string;
            approximateLocations: boolean;
            locationVerification: "PROVISIONAL" | "EXACT_COORDINATES";
            explanations: string[];
        }> = [];

        let routeFailures = 0;
        let routeChecks = 0;
        let missingCoordinates = 0;

        for (const leg of candidates) {
            const origin = resolvePoint(
                leg.originName,
                leg.originLat,
                leg.originLng
            );

            const destination = resolvePoint(
                leg.destinationName,
                leg.destinationLat,
                leg.destinationLng
            );

            if (!origin || !destination) {
                missingCoordinates++;
                continue;
            }

            let original: RoadRoute;
            let via: RoadRoute;

            try {
                original = await fetchRoadRoute([
                    origin.point,
                    destination.point,
                ]);

                via = await fetchRoadRoute([
                    origin.point,
                    pickup.point,
                    delivery.point,
                    destination.point,
                ]);

                routeChecks++;
            } catch (error) {
                routeFailures++;
                console.warn(
                    "Candidate routing failed:",
                    error instanceof Error
                        ? error.message
                        : "Unknown routing error"
                );
                continue;
            }

            // Pickup must be before delivery along the
            // original direction of travel.
            const pickupProgress = routeProgress(
                original.geometry,
                pickup.point
            );

            const deliveryProgress = routeProgress(
                original.geometry,
                delivery.point
            );

            if (deliveryProgress <= pickupProgress) {
                continue;
            }

            const extraKm = Math.max(
                0,
                (via.distanceMetres -
                    original.distanceMetres) / 1000
            );

            const maxDetour = leg.maxDetourKm.toNumber();

            if (extraKm > maxDetour + 0.000001) {
                continue;
            }

            const departureMs = leg.departureAt.getTime();

            // Segments correspond to:
            // origin->pickup, pickup->delivery,
            // delivery->truck destination.
            const pickupArrivalMs =
                departureMs +
                via.segmentDurations[0] * 1000;

            const pickupMs = Math.max(
                pickupArrivalMs,
                load.pickupWindowStart.getTime()
            );

            if (
                pickupMs >
                load.pickupWindowEnd.getTime()
            ) {
                continue;
            }

            const deliveryArrivalMs =
                pickupMs +
                via.segmentDurations[1] * 1000;

            const deliveryMs = Math.max(
                deliveryArrivalMs,
                load.deliveryWindowStart?.getTime() ??
                deliveryArrivalMs
            );

            if (
                load.deliveryWindowEnd &&
                deliveryMs >
                load.deliveryWindowEnd.getTime()
            ) {
                continue;
            }

            const finalArrivalMs =
                deliveryMs +
                via.segmentDurations[2] * 1000;

            if (
                leg.arrivalAt &&
                finalArrivalMs >
                leg.arrivalAt.getTime()
            ) {
                continue;
            }

            const additionalMinutes = Math.max(
                0,
                (via.durationSeconds -
                    original.durationSeconds) / 60
            );

            const approximateLocations =
                origin.approximate ||
                destination.approximate ||
                pickup.approximate ||
                delivery.approximate;

            matches.push({
                emptyLegId: leg.id,
                truckRegistration:
                    leg.truck.registrationNumber,
                equipmentType: leg.truck.equipmentType,
                originName: leg.originName,
                destinationName: leg.destinationName,
                departureAt:
                    leg.departureAt.toISOString(),
                availableWeightKg:
                    leg.availableWeightKg.toNumber(),
                availableVolumeM3:
                    leg.availableVolumeM3!.toNumber(),
                maxDetourKm: maxDetour,
                additionalDistanceKm: round2(extraKm),
                additionalDurationMinutes:
                    round2(additionalMinutes),
                estimatedPickupAt:
                    new Date(pickupMs).toISOString(),
                estimatedDeliveryAt:
                    new Date(deliveryMs).toISOString(),
                approximateLocations,
                locationVerification:
                    approximateLocations
                        ? "PROVISIONAL"
                        : "EXACT_COORDINATES",
                explanations: [
                    "Cargo type and equipment requirements are satisfied",
                    "Weight and declared volume fit the advertised capacity",
                    "Pickup precedes delivery in the estimated route direction",
                    "Additional road distance is within the configured detour limit",
                    "Estimated pickup and delivery meet the shipment windows",
                ],
            });
        }

        if (
            routeFailures > 0 &&
            routeChecks === 0
        ) {
            res.status(503).json({
                success: false,
                message:
                    "Matching could not be completed because road routing failed",
            });
            return;
        }

        res.json({
            success: true,
            data: {
                loadId: load.id,
                matches,
                checks: {
                    retrievedJourneys: legs.length,
                    prefilteredCandidates:
                        cheapCandidates.length,
                    routingChecks: routeChecks,
                    routingFailures: routeFailures,
                    missingCoordinates,
                    truncated,
                    partialResults:
                        truncated ||
                        routeFailures > 0 ||
                        missingCoordinates > 0,
                },
                message:
                    "Unranked hard-filter candidates. Approximate coordinates require location verification.",
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
