
import { Router } from "express";

import { prisma } from "../../database/prisma.js";

import {
  authenticate,
  requireRole,
  getAuthenticatedUser,
} from "../../middleware/authenticate.js";

import {
  emptyBookingStatusCounts,
  effectiveBookingStatuses,
  lastSixUtcMonths,
} from "./analyticsMath.js";

const router = Router();

router.use(
  authenticate,
  requireRole("SHIPPER", "CARRIER")
);

function decimalNumber(
  value: { toNumber(): number } | null | undefined
): number {
  return value?.toNumber() ?? 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// GET /api/v1/analytics/overview
router.get("/overview", async (_req, res, next) => {
  try {
    const user = getAuthenticatedUser(res);

    if (
      user.role !== "SHIPPER" &&
      user.role !== "CARRIER"
    ) {
      res.status(403).json({
        success: false,
        message: "Analytics is available to shipper and carrier accounts",
      });
      return;
    }

    const now = new Date();

    // Every booking query uses account ownership.
    // No user ID is accepted from a query parameter.
    const scope =
      user.role === "SHIPPER"
        ? {
            shipperId: user.id,
          }
        : {
            emptyLeg: {
              truck: {
                carrierId: user.id,
              },
            },
          };

    const completedScope = {
      ...scope,
      status: "COMPLETED" as const,
    };

    const quotedScope = {
      ...completedScope,
      quotedPriceInr: { not: null },
    };

    const comparableScope = {
      ...completedScope,
      quotedPriceInr: { not: null },
      dedicatedPriceInr: { not: null },
    };

    const earningsScope = {
      ...completedScope,
      quotedPriceInr: { not: null },
      platformFeeInr: { not: null },
    };

    const carbonScope = {
      ...completedScope,
      estimatedCo2SavedKg: { not: null },
    };

    const months = lastSixUtcMonths(now);

    const [
      statusGroups,
      livePendingCount,
      quotedTotals,
      comparableTotals,
      earningsTotals,
      carbonTotals,
      quotedCount,
      comparableCount,
      earningsCount,
      carbonCount,
      monthlyCounts,
    ] = await Promise.all([
      prisma.booking.groupBy({
        by: ["status"],
        where: scope,
        _count: {
          _all: true,
        },
      }),

      prisma.booking.count({
        where: {
          ...scope,
          status: "PENDING_APPROVAL",
          expiresAt: { gt: now },
        },
      }),

      prisma.booking.aggregate({
        where: quotedScope,
        _sum: {
          quotedPriceInr: true,
        },
      }),

      prisma.booking.aggregate({
        where: comparableScope,
        _sum: {
          quotedPriceInr: true,
          dedicatedPriceInr: true,
        },
      }),

      prisma.booking.aggregate({
        where: earningsScope,
        _sum: {
          quotedPriceInr: true,
          platformFeeInr: true,
        },
      }),

      prisma.booking.aggregate({
        where: carbonScope,
        _sum: {
          estimatedCo2SavedKg: true,
        },
      }),

      prisma.booking.count({
        where: quotedScope,
      }),

      prisma.booking.count({
        where: comparableScope,
      }),

      prisma.booking.count({
        where: earningsScope,
      }),

      prisma.booking.count({
        where: carbonScope,
      }),

      Promise.all(
        months.map((window) =>
          prisma.booking.count({
            where: {
              ...scope,
              requestedAt: {
                gte: window.start,
                lt: window.end,
              },
            },
          })
        )
      ),
    ]);

    const storedStatuses =
      emptyBookingStatusCounts();

    for (const group of statusGroups) {
      storedStatuses[group.status] =
        group._count._all;
    }

    const statuses = effectiveBookingStatuses(
      storedStatuses,
      livePendingCount
    );

    const bookingTotal = Object.values(
      statuses
    ).reduce((total, count) => total + count, 0);

    const activeReservations =
      statuses.PENDING_APPROVAL +
      statuses.CONFIRMED +
      statuses.IN_TRANSIT;

    // Only one side's inventory is populated.
    // The other side is null, not a fabricated zero.
    const inventory: {
      loads: {
        total: number;
        active: number;
      } | null;
      trucks: {
        total: number;
        active: number;
      } | null;
      journeys: {
        total: number;
        active: number;
      } | null;
    } = {
      loads: null,
      trucks: null,
      journeys: null,
    };

    if (user.role === "SHIPPER") {
      const [totalLoads, activeLoads] =
        await Promise.all([
          prisma.load.count({
            where: {
              shipperId: user.id,
            },
          }),
          prisma.load.count({
            where: {
              shipperId: user.id,
              status: "ACTIVE",
            },
          }),
        ]);

      inventory.loads = {
        total: totalLoads,
        active: activeLoads,
      };
    } else {
      const [
        totalTrucks,
        activeTrucks,
        totalJourneys,
        activeJourneys,
      ] = await Promise.all([
        prisma.truck.count({
          where: {
            carrierId: user.id,
          },
        }),

        prisma.truck.count({
          where: {
            carrierId: user.id,
            status: "ACTIVE",
          },
        }),

        prisma.emptyLeg.count({
          where: {
            truck: {
              carrierId: user.id,
            },
          },
        }),

        prisma.emptyLeg.count({
          where: {
            status: "ACTIVE",
            truck: {
              carrierId: user.id,
              status: "ACTIVE",
            },
          },
        }),
      ]);

      inventory.trucks = {
        total: totalTrucks,
        active: activeTrucks,
      };

      inventory.journeys = {
        total: totalJourneys,
        active: activeJourneys,
      };
    }

    const comparableQuoted = decimalNumber(
      comparableTotals._sum.quotedPriceInr
    );

    const comparableDedicated = decimalNumber(
      comparableTotals._sum.dedicatedPriceInr
    );

    const earningsQuoted = decimalNumber(
      earningsTotals._sum.quotedPriceInr
    );

    const earningsFees = decimalNumber(
      earningsTotals._sum.platformFeeInr
    );

    res.json({
      success: true,
      data: {
        role: user.role,
        asOf: now.toISOString(),

        inventory,

        bookings: {
          total: bookingTotal,
          ...statuses,
          activeReservations,
        },

        monthlyRequests: months.map(
          (window, index) => ({
            month: window.month,
            requests: monthlyCounts[index],
          })
        ),

        financials: {
          currency: "INR",
          estimateType: "ILLUSTRATIVE",

          completedQuotedValueInr: round2(
            decimalNumber(
              quotedTotals._sum.quotedPriceInr
            )
          ),
          completedQuotedCount: quotedCount,

          completedDedicatedBaselineInr: round2(
            comparableDedicated
          ),

          completedModeledSavingsInr: round2(
            comparableDedicated -
            comparableQuoted
          ),

          completedComparisonCount:
            comparableCount,

          completedCarrierEarningsInr: round2(
            earningsQuoted - earningsFees
          ),

          completedCarrierEarningsCount:
            earningsCount,
        },

        environmental: {
          estimateType: "ILLUSTRATIVE",
          emissionBoundary: "TAILPIPE_CO2",

          completedEstimatedAvoidedCo2Kg:
            round2(
              decimalNumber(
                carbonTotals._sum
                  .estimatedCo2SavedKg
              )
            ),

          completedEstimateCount:
            carbonCount,
        },

        notes: [
          "Analytics is limited to the authenticated account's loads or trucks.",
          "Expired pending requests are treated as expired in these counts, without changing booking history.",
          "Financial amounts are illustrative booking quote snapshots, not payments or settled revenue.",
          "Completed bookings are carrier-reported lifecycle records, not independently verified deliveries.",
          "CO2 estimates are modeled potential savings, not measured or certified reductions.",
          "Monthly requests are grouped by booking request date in UTC.",
        ],
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
