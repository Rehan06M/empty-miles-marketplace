
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../database/prisma.js";
import {
    authenticate,
    requireRole,
    getAuthenticatedUser,
} from "../../middleware/authenticate.js";

const router = Router();
router.use(
    authenticate,
    requireRole("SHIPPER", "CARRIER")
);

const PAGE_SIZE = 20;
const pageSchema = z.coerce
    .number()
    .int()
    .min(1)
    .max(1000);

const eventIdSchema = z.uuid();

function visibleEvents(
    user: {
        id: string;
        role: "SHIPPER" | "CARRIER";
    }
) {
    if (user.role === "SHIPPER") {
        return {
            actorType: {
                in: ["CARRIER", "SYSTEM"],
            },
            booking: {
                shipperId: user.id,
            },
        };
    }

    return {
        actorType: {
            in: ["SHIPPER", "SYSTEM"],
        },
        booking: {
            emptyLeg: {
                truck: {
                    carrierId: user.id,
                },
            },
        },
    };
}

function notificationTitle(status: string): string {
    switch (status) {
        case "PENDING_APPROVAL":
            return "New booking request";
        case "CONFIRMED":
            return "Booking approved";
        case "REJECTED":
            return "Booking rejected";
        case "IN_TRANSIT":
            return "Shipment in transit";
        case "COMPLETED":
            return "Shipment completed";
        case "CANCELLED":
            return "Booking cancelled";
        case "EXPIRED":
            return "Booking expired";
        default:
            return "Booking update";
    }
}

// GET /api/v1/notifications?page=1
router.get("/", async (req, res, next) => {
    try {
        const parsed = pageSchema.safeParse(
            req.query.page ?? 1
        );

        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Invalid notification page",
            });
            return;
        }

        const auth = getAuthenticatedUser(res);

        if (
            auth.role !== "SHIPPER" &&
            auth.role !== "CARRIER"
        ) {
            res.status(403).json({
                success: false,
                message: "Access denied",
            });
            return;
        }

        const page = parsed.data;
        const scope = visibleEvents({
            id: auth.id,
            role: auth.role,
        });

        const [rows, unreadCount] = await Promise.all([
            prisma.bookingEvent.findMany({
                where: scope,
                orderBy: [
                    { occurredAt: "desc" },
                    { id: "desc" },
                ],
                skip: (page - 1) * PAGE_SIZE,
                take: PAGE_SIZE + 1,
                include: {
                    booking: {
                        select: {
                            id: true,
                            pickupName: true,
                            deliveryName: true,
                            status: true,
                            emptyLeg: {
                                select: {
                                    truck: {
                                        select: {
                                            registrationNumber: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    reads: {
                        where: {
                            userId: auth.id,
                        },
                        select: {
                            readAt: true,
                        },
                    },
                },
            }),

            prisma.bookingEvent.count({
                where: {
                    AND: [
                        scope,
                        {
                            reads: {
                                none: {
                                    userId: auth.id,
                                },
                            },
                        },
                    ],
                },
            }),
        ]);

        const hasMore = rows.length > PAGE_SIZE;

        const items = rows
            .slice(0, PAGE_SIZE)
            .map((event) => ({
                id: event.id,
                bookingId: event.bookingId,

                title: notificationTitle(event.toStatus),
                description: event.description,

                toStatus: event.toStatus,
                actorType: event.actorType,

                occurredAt:
                    event.occurredAt.toISOString(),

                readAt:
                    event.reads[0]?.readAt.toISOString() ??
                    null,

                pickupName:
                    event.booking.pickupName,

                deliveryName:
                    event.booking.deliveryName,

                truckRegistration:
                    event.booking.emptyLeg.truck
                        .registrationNumber,
            }));

        res.json({
            success: true,
            data: {
                items,
                page,
                pageSize: PAGE_SIZE,
                hasMore,
                unreadCount,
            },
        });
    } catch (error) {
        next(error);
    }
});

// PATCH /api/v1/notifications/:eventId/read
router.patch("/:eventId/read", async (
    req,
    res,
    next
) => {
    try {
        const parsed = eventIdSchema.safeParse(
            req.params.eventId
        );

        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Invalid notification ID",
            });
            return;
        }

        const auth = getAuthenticatedUser(res);

        if (
            auth.role !== "SHIPPER" &&
            auth.role !== "CARRIER"
        ) {
            res.status(403).json({
                success: false,
                message: "Access denied",
            });
            return;
        }

        // Check account ownership before writing.
        const event = await prisma.bookingEvent.findFirst({
            where: {
                id: parsed.data,
                ...visibleEvents({
                    id: auth.id,
                    role: auth.role,
                }),
            },
            select: {
                id: true,
            },
        });

        if (!event) {
            res.status(404).json({
                success: false,
                message: "Notification not found",
            });
            return;
        }

        // Repeated read actions remain idempotent.
        const marker = await prisma.bookingEventRead.upsert({
            where: {
                userId_bookingEventId: {
                    userId: auth.id,
                    bookingEventId: event.id,
                },
            },
            create: {
                userId: auth.id,
                bookingEventId: event.id,
            },
            update: {},
            select: {
                readAt: true,
            },
        });

        res.json({
            success: true,
            data: {
                eventId: event.id,
                readAt: marker.readAt.toISOString(),
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
