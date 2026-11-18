
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../../database/prisma.js";
import {
    authenticate,
    requireRole,
    getAuthenticatedUser,
} from "../../middleware/authenticate.js";
import {
    verifyBookingOffer,
} from "./bookingOffer.js";

const router = Router();
router.use(authenticate);

const uuid = z.uuid();

const requestSchema = z.object({
    offerToken: z.string().min(20).max(8192),
}).strict();

const activeReservationFilter = (now: Date) => ({
    OR: [
        { status: "CONFIRMED" as const },
        { status: "IN_TRANSIT" as const },
        {
            status: "PENDING_APPROVAL" as const,
            expiresAt: { gt: now },
        },
    ],
});

class BookingError extends Error {
    constructor(
        public httpStatus: number,
        message: string
    ) {
        super(message);
    }
}

function fail(status: number, message: string): never {
    throw new BookingError(status, message);
}

function sendError(
    error: unknown,
    res: import("express").Response,
    next: import("express").NextFunction
) {
    if (error instanceof BookingError) {
        res.status(error.httpStatus).json({
            success: false,
            message: error.message,
        });
        return;
    }

    next(error);
}

const bookingInclude = {
    load: {
        select: {
            id: true,
            pickupName: true,
            deliveryName: true,
            cargoDescription: true,
            weightKg: true,
            volumeM3: true,
        },
    },
    emptyLeg: {
        select: {
            id: true,
            originName: true,
            destinationName: true,
            truck: {
                select: {
                    registrationNumber: true,
                    equipmentType: true,
                },
            },
        },
    },
    events: {
        orderBy: { occurredAt: "asc" as const },
    },
} as const;

// Synchronizes expired pending requests on list reads.
// Expired pending requests do not reserve capacity
// even if they have not yet been updated to EXPIRED.

async function expirePending() {
    // Inspect expired candidates first. Each mutation then follows
    // the same Truck -> Load -> Booking lock order as status actions.
    const candidates = await prisma.booking.findMany({
        where: {
            status: "PENDING_APPROVAL",
            expiresAt: { lte: new Date() },
        },
        select: {
            id: true,
            loadId: true,
            emptyLeg: { select: { truckId: true } },
        },
        take: 100,
        orderBy: { expiresAt: "asc" },
    });

    for (const candidate of candidates) {
        await prisma.$transaction(async (tx) => {
            const truckRows = await tx.$queryRaw<{ id: string }[]>`
                SELECT "id" FROM "Truck"
                WHERE "id" = ${candidate.emptyLeg.truckId}::uuid
                FOR UPDATE
            `;
            if (!truckRows.length) return;

            const loadRows = await tx.$queryRaw<{ id: string }[]>`
                SELECT "id" FROM "Load"
                WHERE "id" = ${candidate.loadId}::uuid
                FOR UPDATE
            `;
            if (!loadRows.length) return;

            const bookingRows = await tx.$queryRaw<{ id: string }[]>`
                SELECT "id" FROM "Booking"
                WHERE "id" = ${candidate.id}::uuid
                FOR UPDATE
            `;
            if (!bookingRows.length) return;

            const current = await tx.booking.findUnique({
                where: { id: candidate.id },
                select: { status: true, expiresAt: true },
            });

            if (
                current?.status !== "PENDING_APPROVAL" ||
                current.expiresAt > new Date()
            ) {
                return;
            }

            await tx.booking.update({
                where: { id: candidate.id },
                data: {
                    status: "EXPIRED",
                    events: {
                        create: {
                            fromStatus: "PENDING_APPROVAL",
                            toStatus: "EXPIRED",
                            actorType: "SYSTEM",
                            actorId: null,
                            description:
                                "Booking approval deadline expired. Reserved capacity was released.",
                        },
                    },
                },
            });
        });
    }
}

// POST /api/v1/bookings
router.post(
    "/",
    requireRole("SHIPPER"),
    async (req, res, next) => {
        try {
            const parsed = requestSchema.safeParse(req.body);

            if (!parsed.success) {
                fail(400, "Invalid booking request");
            }

            const offer = verifyBookingOffer(
                parsed.data.offerToken
            );

            if (!offer) {
                fail(
                    400,
                    "Booking offer is invalid or expired. Find matches again."
                );
            }

            const shipperId = getAuthenticatedUser(res).id;

            if (offer.shipperId !== shipperId) {
                fail(403, "This booking offer belongs to another account");
            }

            const result = await prisma.$transaction(
                async (tx) => {
                    // Discover the truck before acquiring locks.
                    const target = await tx.emptyLeg.findUnique({
                        where: { id: offer.emptyLegId },
                        select: { truckId: true },
                    });

                    if (!target) {
                        fail(404, "Journey no longer exists");
                    }

                    // All booking writers lock the parent truck first.
                    const truckLock = await tx.$queryRaw<
                        { id: string }[]
                    >`
            SELECT "id" FROM "Truck"
            WHERE "id" = ${target.truckId}::uuid
            FOR UPDATE
          `;

                    if (!truckLock.length) {
                        fail(404, "Truck no longer exists");
                    }

                    // Serialize competing requests for this load.
                    const loadLock = await tx.$queryRaw<
                        { id: string }[]
                    >`
            SELECT "id" FROM "Load"
            WHERE "id" = ${offer.loadId}::uuid
              AND "shipperId" = ${shipperId}::uuid
            FOR UPDATE
          `;

                    if (!loadLock.length) {
                        fail(404, "Shipment not found");
                    }

                    const load = await tx.load.findFirstOrThrow({
                        where: {
                            id: offer.loadId,
                            shipperId,
                        },
                    });

                    const leg = await tx.emptyLeg.findUnique({
                        where: { id: offer.emptyLegId },
                        include: {
                            truck: {
                                include: {
                                    carrier: {
                                        select: { status: true },
                                    },
                                },
                            },
                        },
                    });

                    const now = new Date();

                    if (!leg) {
                        fail(404, "Journey not found");
                    }

                    if (
                        leg.truckId !== target.truckId ||
                        leg.status !== "ACTIVE" ||
                        leg.truck.status !== "ACTIVE" ||
                        leg.truck.carrier.status !== "ACTIVE" ||
                        load.status !== "ACTIVE"
                    ) {
                        fail(409, "Load or truck journey is no longer active");
                    }

                    if (
                        load.updatedAt.toISOString() !==
                        offer.loadUpdatedAt ||
                        leg.updatedAt.toISOString() !==
                        offer.legUpdatedAt
                    ) {
                        fail(
                            409,
                            "Shipment or journey changed. Find matches again."
                        );
                    }

                    if (
                        leg.departureAt <= now ||
                        load.pickupWindowEnd <= now
                    ) {
                        fail(
                            409,
                            "Departure or pickup window has already passed"
                        );
                    }

                    if (
                        load.requiredEquipment !== null &&
                        load.requiredEquipment !==
                        leg.truck.equipmentType
                    ) {
                        fail(409, "Truck equipment no longer matches");
                    }

                    const restrictions =
                        leg.acceptedCargoTypes.map(
                            (value) => value.trim().toLowerCase()
                        );

                    if (
                        restrictions.length > 0 &&
                        !restrictions.includes(
                            load.cargoType.trim().toLowerCase()
                        )
                    ) {
                        fail(409, "Carrier cargo restrictions changed");
                    }

                    const requestedWeight =
                        load.weightKg.toNumber();

                    const requestedVolume =
                        load.volumeM3?.toNumber() ?? null;

                    if (
                        requestedVolume === null ||
                        leg.availableVolumeM3 === null
                    ) {
                        fail(
                            409,
                            "Declared shipment and journey volumes are required"
                        );
                    }

                    // One active booking per shipment in this MVP.
                    const existingForLoad =
                        await tx.booking.count({
                            where: {
                                loadId: load.id,
                                ...activeReservationFilter(now),
                            },
                        });

                    if (existingForLoad > 0) {
                        fail(
                            409,
                            "This shipment already has an active booking request"
                        );
                    }

                    // Aggregate reservations under the truck lock.
                    // Pending (nonexpired), confirmed and in-transit
                    // all consume capacity.
                    const reservations =
                        await tx.booking.findMany({
                            where: {
                                emptyLegId: leg.id,
                                ...activeReservationFilter(now),
                            },
                            select: {
                                requestedWeightKg: true,
                                requestedVolumeM3: true,
                            },
                        });

                    const reservedWeight = reservations.reduce(
                        (total, item) =>
                            total +
                            item.requestedWeightKg.toNumber(),
                        0
                    );

                    const reservedVolume = reservations.reduce(
                        (total, item) =>
                            total +
                            (item.requestedVolumeM3?.toNumber() ?? 0),
                        0
                    );

                    const remainingWeight =
                        leg.availableWeightKg.toNumber() -
                        reservedWeight;

                    const remainingVolume =
                        leg.availableVolumeM3.toNumber() -
                        reservedVolume;

                    if (
                        requestedWeight > remainingWeight + 0.000001 ||
                        requestedVolume > remainingVolume + 0.000001
                    ) {
                        fail(
                            409,
                            "Not enough unreserved capacity remains on this journey"
                        );
                    }

                    return tx.booking.create({
                        data: {
                            loadId: load.id,
                            emptyLegId: leg.id,
                            shipperId,

                            status: "PENDING_APPROVAL",
                            events: {
                                create: {
                                    fromStatus: null,
                                    toStatus: "PENDING_APPROVAL",
                                    actorType: "SHIPPER",
                                    actorId: shipperId,
                                    description:
                                        "Shipper submitted a booking request. Capacity was reserved pending carrier approval.",
                                },
                            },

                            requestedWeightKg: load.weightKg,
                            requestedVolumeM3: load.volumeM3,

                            pickupName: load.pickupName,
                            deliveryName: load.deliveryName,

                            quotedPriceInr: offer.quotedPriceInr,
                            dedicatedPriceInr:
                                offer.dedicatedPriceInr,
                            platformFeeInr:
                                offer.platformFeeInr,

                            estimatedCo2SavedKg:
                                offer.estimatedCo2SavedKg,

                            expiresAt: new Date(
                                Math.min(
                                    now.getTime() + 24 * 60 * 60 * 1000,
                                    leg.departureAt.getTime(),
                                    load.pickupWindowEnd.getTime()
                                )
                            ),
                        },
                        include: bookingInclude,
                    });
                },
                { timeout: 10000 }
            );

            res.status(201).json({
                success: true,
                message:
                    "Booking requested. Capacity is reserved pending carrier approval.",
                data: result,
            });
        } catch (error) {
            sendError(error, res, next);
        }
    }
);

// GET /api/v1/bookings/mine
router.get(
    "/mine",
    requireRole("SHIPPER"),
    async (_req, res, next) => {
        try {
            await expirePending();

            const shipperId = getAuthenticatedUser(res).id;

            const bookings = await prisma.booking.findMany({
                where: { shipperId },
                include: bookingInclude,
                orderBy: { requestedAt: "desc" },
            });

            res.json({ success: true, data: bookings });
        } catch (error) {
            next(error);
        }
    }
);

// GET /api/v1/bookings/incoming
router.get(
    "/incoming",
    requireRole("CARRIER"),
    async (_req, res, next) => {
        try {
            await expirePending();

            const carrierId = getAuthenticatedUser(res).id;

            const bookings = await prisma.booking.findMany({
                where: {
                    emptyLeg: {
                        truck: { carrierId },
                    },
                },
                include: bookingInclude,
                orderBy: { requestedAt: "desc" },
            });

            res.json({ success: true, data: bookings });
        } catch (error) {
            next(error);
        }
    }
);

// PATCH /api/v1/bookings/:id/:action
const actionSchema = z.enum([
    "approve",
    "reject",
    "start",
    "complete",
    "cancel",
]);

router.patch(
    "/:id/:action",
    async (req, res, next) => {
        try {
            const parsedId = uuid.safeParse(req.params.id);
            const parsedAction =
                actionSchema.safeParse(req.params.action);

            if (!parsedId.success || !parsedAction.success) {
                fail(400, "Invalid booking ID or action");
            }

            const id = parsedId.data;
            const action = parsedAction.data;
            const user = getAuthenticatedUser(res);

            if (
                action === "cancel"
                    ? user.role !== "SHIPPER"
                    : user.role !== "CARRIER"
            ) {
                fail(403, "Not permitted for this account role");
            }

            const updated = await prisma.$transaction(
                async (tx) => {
                    const target = await tx.booking.findUnique({
                        where: { id },
                        select: {
                            loadId: true,
                            emptyLeg: {
                                select: { truckId: true },
                            },
                        },
                    });

                    if (!target) {
                        fail(404, "Booking not found");
                    }

                    const truckLock = await tx.$queryRaw<
                        { id: string }[]
                    >`
            SELECT "id" FROM "Truck"
            WHERE "id" = ${target.emptyLeg.truckId}::uuid
            FOR UPDATE
          `;

                    if (!truckLock.length) {
                        fail(404, "Truck not found");
                    }

                    const loadLock = await tx.$queryRaw<
                        { id: string }[]
                    >`
            SELECT "id" FROM "Load"
            WHERE "id" = ${target.loadId}::uuid
            FOR UPDATE
          `;

                    if (!loadLock.length) {
                        fail(404, "Shipment not found");
                    }

                    // Lock the booking row only after the Truck and Load.
                    const bookingLock = await tx.$queryRaw<{ id: string }[]>`
                        SELECT "id" FROM "Booking"
                        WHERE "id" = ${id}::uuid
                        FOR UPDATE
                    `;

                    if (!bookingLock.length) {
                        fail(404, "Booking not found");
                    }

                    const booking = await tx.booking.findUnique({
                        where: { id },
                        include: {
                            emptyLeg: {
                                include: {
                                    truck: {
                                        select: {
                                            carrierId: true,
                                            status: true,
                                        },
                                    },
                                },
                            },
                            load: {
                                select: { status: true },
                            },
                        },
                    });

                    if (!booking) {
                        fail(404, "Booking not found");
                    }

                    if (
                        action === "cancel"
                            ? booking.shipperId !== user.id
                            : booking.emptyLeg.truck.carrierId !== user.id
                    ) {
                        fail(404, "Booking not found");
                    }

                    const now = new Date();

                    if (
                        booking.status === "PENDING_APPROVAL" &&
                        booking.expiresAt <= now
                    ) {
                        await tx.booking.update({
                            where: { id },
                            data: {
                                status: "EXPIRED",
                                events: {
                                    create: {
                                        fromStatus: "PENDING_APPROVAL",
                                        toStatus: "EXPIRED",
                                        actorType: "SYSTEM",
                                        actorId: null,
                                        description:
                                            "Booking approval deadline expired. Reserved capacity was released.",
                                    },
                                },
                            },
                        });

                        return null;
                    }

                    let nextStatus:
    | "CONFIRMED"
    | "REJECTED"
    | "IN_TRANSIT"
    | "COMPLETED"
    | "CANCELLED";

const updates: {
    approvedAt?: Date;
    pickedUpAt?: Date;
    completedAt?: Date;
    cancelledAt?: Date;
} = {};

if (action === "approve") {
    if (
        booking.status !== "PENDING_APPROVAL" ||
        booking.load.status !== "ACTIVE" ||
        booking.emptyLeg.status !== "ACTIVE" ||
        booking.emptyLeg.truck.status !== "ACTIVE" ||
        booking.emptyLeg.departureAt <= now
    ) {
        fail(409, "Booking cannot be approved");
    }

    nextStatus = "CONFIRMED";
    updates.approvedAt = now;
} else if (action === "reject") {
    if (booking.status !== "PENDING_APPROVAL") {
        fail(409, "Only pending bookings can be rejected");
    }

    nextStatus = "REJECTED";
} else if (action === "start") {
    if (booking.status !== "CONFIRMED") {
        fail(409, "Only confirmed bookings can start");
    }

    nextStatus = "IN_TRANSIT";
    updates.pickedUpAt = now;
} else if (action === "complete") {
    if (booking.status !== "IN_TRANSIT") {
        fail(409, "Only in-transit bookings can complete");
    }

    nextStatus = "COMPLETED";
    updates.completedAt = now;
} else {
    if (
        booking.status !== "PENDING_APPROVAL" &&
        booking.status !== "CONFIRMED"
    ) {
        fail(409, "Booking cannot be cancelled now");
    }

    nextStatus = "CANCELLED";
    updates.cancelledAt = now;
}


const actionDescriptions: Record<
    typeof action,
    string
> = {
    approve: "Carrier approved the booking request.",
    reject:
        "Carrier rejected the booking request. Reserved capacity was released.",
    start:
        "Carrier marked the shipment as in transit.",
    complete:
        "Carrier marked the shipment as completed.",
    cancel:
        "Shipper cancelled the booking. Reserved capacity was released.",
};

const result = await tx.booking.update({
    where: { id },

    data: {
        status: nextStatus,
        ...updates,

        events: {
            create: {
                fromStatus: booking.status,
                toStatus: nextStatus,

                actorType:
                    action === "cancel"
                        ? "SHIPPER"
                        : "CARRIER",

                actorId: user.id,

                description: actionDescriptions[action],
            },
        },
    },

    include: bookingInclude,
});


if (nextStatus === "COMPLETED") {
    await tx.load.update({
        where: { id: booking.loadId },
        data: { status: "CLOSED" },
    });
}

return result;
        },
{ timeout: 10000 }
            );

if (updated === null) {
    res.status(409).json({
        success: false,
        message: "Booking request has expired",
    });
    return;
}

res.json({
    success: true,
    message: `Booking status updated to ${updated.status}`,
    data: updated,
});
        } catch (error) {
    sendError(error, res, next);
}
    }
);

export default router;
