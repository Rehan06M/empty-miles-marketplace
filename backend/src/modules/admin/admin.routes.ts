import { Router } from "express";
import { z } from "zod";

import { prisma } from "../../database/prisma.js";

import {
  authenticate,
  requireRole,
  getAuthenticatedUser,
} from "../../middleware/authenticate.js";

import {
  checkModerationPolicy,
} from "./adminPolicy.js";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));

const uuidSchema = z.uuid();

const userListSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(1),

  search: z.string().trim().max(80).optional(),

  role: z.enum([
    "SHIPPER",
    "CARRIER",
    "ADMIN",
  ]).optional(),

  status: z.enum([
    "ACTIVE",
    "SUSPENDED",
  ]).optional(),
});

const statusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  reason: z.string().trim().min(10).max(500),
}).strict();

const pageSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(1000);

const PAGE_SIZE = 20;

// Never return password hashes or identity tokens.
const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  companyName: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

class AdminError extends Error {
  constructor(
    public httpStatus: number,
    message: string
  ) {
    super(message);
  }
}

function respondError(
  error: unknown,
  res: import("express").Response,
  next: import("express").NextFunction
) {
  if (error instanceof AdminError) {
    res.status(error.httpStatus).json({
      success: false,
      message: error.message,
    });
    return;
  }

  next(error);
}

// GET /api/v1/admin/overview
router.get("/overview", async (_req, res, next) => {
  try {
    const now = new Date();

    const [
      shippers,
      carriers,
      suspended,
      loads,
      activeLoads,
      journeys,
      activeJourneys,
      bookings,
      liveReservations,
      recentLoads,
      recentJourneys,
      recentBookings,
    ] = await Promise.all([
      prisma.user.count({
        where: { role: "SHIPPER" },
      }),

      prisma.user.count({
        where: { role: "CARRIER" },
      }),

      prisma.user.count({
        where: { status: "SUSPENDED" },
      }),

      prisma.load.count(),

      prisma.load.count({
        where: { status: "ACTIVE" },
      }),

      prisma.emptyLeg.count(),

      prisma.emptyLeg.count({
        where: { status: "ACTIVE" },
      }),

      prisma.booking.count(),

      prisma.booking.count({
        where: {
          OR: [
            { status: "CONFIRMED" },
            { status: "IN_TRANSIT" },
            {
              status: "PENDING_APPROVAL",
              expiresAt: { gt: now },
            },
          ],
        },
      }),

      prisma.load.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          pickupName: true,
          deliveryName: true,
          status: true,
          cargoType: true,
          weightKg: true,
          createdAt: true,
          shipper: {
            select: { name: true },
          },
        },
      }),

      prisma.emptyLeg.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          originName: true,
          destinationName: true,
          status: true,
          departureAt: true,
          availableWeightKg: true,
          truck: {
            select: {
              registrationNumber: true,
              carrier: {
                select: { name: true },
              },
            },
          },
        },
      }),

      prisma.booking.findMany({
        take: 10,
        orderBy: { requestedAt: "desc" },
        select: {
          id: true,
          status: true,
          pickupName: true,
          deliveryName: true,
          requestedAt: true,
          quotedPriceInr: true,
          shipper: {
            select: { name: true },
          },
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
      }),
    ]);

    res.json({
      success: true,
      data: {
        asOf: now.toISOString(),

        totals: {
          shippers,
          carriers,
          suspended,
          loads,
          activeLoads,
          journeys,
          activeJourneys,
          bookings,
          liveReservations,
        },

        recentLoads,
        recentJourneys,
        recentBookings,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/users?page=1&search=...
router.get("/users", async (req, res, next) => {
  try {
    const parsed = userListSchema.safeParse(
      req.query
    );

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid user filters",
      });
      return;
    }

    const {
      page,
      search,
      role,
      status,
    } = parsed.data;

    const where = {
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),

      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                email: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                companyName: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: safeUserSelect,
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),

      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        items,
        page,
        total,
        pageSize: PAGE_SIZE,
        hasMore: page * PAGE_SIZE < total,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/actions?page=1
router.get("/actions", async (req, res, next) => {
  try {
    const parsed = pageSchema.safeParse(
      req.query.page ?? 1
    );

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid audit page",
      });
      return;
    }

    const page = parsed.data;

    const [items, total] = await Promise.all([
      prisma.adminModerationAction.findMany({
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      }),

      prisma.adminModerationAction.count(),
    ]);

    res.json({
      success: true,
      data: {
        items,
        page,
        total,
        pageSize: PAGE_SIZE,
        hasMore: page * PAGE_SIZE < total,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/admin/users/:id/status
router.patch(
  "/users/:id/status",
  async (req, res, next) => {
    try {
      const parsedId = uuidSchema.safeParse(
        req.params.id
      );

      const parsedBody = statusSchema.safeParse(
        req.body
      );

      if (
        !parsedId.success ||
        !parsedBody.success
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid account moderation request; provide status and a reason (10–500 characters)",
        });
        return;
      }

      const actorId =
        getAuthenticatedUser(res).id;

      const targetId = parsedId.data;

      const {
        status,
        reason,
      } = parsedBody.data;

      const changed = await prisma.$transaction(
        async (tx) => {
          // Serialize moderation actions
          // against the same user account.
          const locked = await tx.$queryRaw<
            { id: string }[]
          >`
            SELECT "id"
            FROM "User"
            WHERE "id" = ${targetId}::uuid
            FOR UPDATE
          `;

          if (locked.length === 0) {
            throw new AdminError(
              404,
              "User not found"
            );
          }

          const target =
            await tx.user.findUnique({
              where: { id: targetId },
              select: {
                id: true,
                role: true,
                status: true,
              },
            });

          if (!target) {
            throw new AdminError(
              404,
              "User not found"
            );
          }

          const now = new Date();

          const liveBookingCount =
            status === "SUSPENDED"
              ? await tx.booking.count({
                  where: {
                    AND: [
                      {
                        OR: [
                          { shipperId: targetId },
                          {
                            emptyLeg: {
                              truck: {
                                carrierId: targetId,
                              },
                            },
                          },
                        ],
                      },
                      {
                        OR: [
                          {
                            status: "CONFIRMED",
                          },
                          {
                            status: "IN_TRANSIT",
                          },
                          {
                            status: "PENDING_APPROVAL",
                            expiresAt: { gt: now },
                          },
                        ],
                      },
                    ],
                  },
                })
              : 0;

          const blocked =
            checkModerationPolicy({
              actorId,
              targetId,
              targetRole: target.role,
              currentStatus: target.status,
              requestedStatus: status,
              liveBookingCount,
            });

          if (blocked) {
            throw new AdminError(409, blocked);
          }

          const updated = await tx.user.update({
            where: { id: targetId },
            data: { status },
            select: safeUserSelect,
          });

          // Record the status change in the
          // same transaction.
          await tx.adminModerationAction.create({
            data: {
              adminId: actorId,
              targetUserId: targetId,
              previousStatus: target.status,
              nextStatus: status,
              targetEmailSnapshot: updated.email,
              reason,
            },
          });

          return updated;
        },
        { timeout: 10000 }
      );

      res.json({
        success: true,
        message:
          `Account status changed to ${changed.status}`,
        data: changed,
      });
    } catch (error) {
      respondError(error, res, next);
    }
  }
);

export default router;