
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../../database/prisma.js";
import { buildCsv } from "./adminReportCsv.js";

const router = Router();

const MAX_ROWS = 500;
const PREVIEW_ROWS = 10;

const querySchema = z.object({
  dataset: z.enum([
    "bookings",
    "loads",
    "journeys",
    "moderation",
  ]),

  days: z.coerce.number().int().refine(
    (value) => [7, 30, 90].includes(value),
    "Choose 7, 30 or 90 days"
  ),
}).strict();

type ReportDataset = z.infer<
  typeof querySchema
>["dataset"];

type RawReport = {
  headers: string[];
  rows: string[][];
  totalRows: number;
};

function iso(value: Date): string {
  return value.toISOString();
}

function text(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

// Fetch at most 500 records from each selected
// dataset. Count all matching records separately
// to disclose incomplete exports.
async function fetchReport(
  dataset: ReportDataset,
  since: Date
): Promise<RawReport> {
  if (dataset === "bookings") {
    const where = {
      requestedAt: { gte: since },
    };

    const [items, totalRows] =
      await Promise.all([
        prisma.booking.findMany({
          where,
          take: MAX_ROWS,

          orderBy: [
            { requestedAt: "desc" },
            { id: "desc" },
          ],

          select: {
            id: true,
            status: true,
            pickupName: true,
            deliveryName: true,
            requestedAt: true,
            requestedWeightKg: true,
            requestedVolumeM3: true,
            quotedPriceInr: true,
            dedicatedPriceInr: true,
            platformFeeInr: true,
            estimatedCo2SavedKg: true,

            shipper: {
              select: {
                name: true,
              },
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

        prisma.booking.count({ where }),
      ]);

    return {
      headers: [
        "Booking ID",
        "Requested At (UTC)",
        "Status",
        "Shipper",
        "Pickup",
        "Delivery",
        "Truck Registration",
        "Weight (kg)",
        "Volume (m3)",
        "Marketplace Quote (INR)",
        "Dedicated Estimate (INR)",
        "Platform Fee (INR)",
        "Estimated CO2 Saved (kg)",
      ],

      rows: items.map((item) => [
        item.id,
        iso(item.requestedAt),
        item.status,
        item.shipper.name,
        item.pickupName,
        item.deliveryName,
        item.emptyLeg.truck.registrationNumber,
        item.requestedWeightKg.toString(),
        text(item.requestedVolumeM3),
        text(item.quotedPriceInr),
        text(item.dedicatedPriceInr),
        text(item.platformFeeInr),
        text(item.estimatedCo2SavedKg),
      ]),

      totalRows,
    };
  }

  if (dataset === "loads") {
    const where = {
      createdAt: { gte: since },
    };

    const [items, totalRows] =
      await Promise.all([
        prisma.load.findMany({
          where,
          take: MAX_ROWS,

          orderBy: [
            { createdAt: "desc" },
            { id: "desc" },
          ],

          select: {
            id: true,
            createdAt: true,
            status: true,
            pickupName: true,
            deliveryName: true,
            cargoType: true,
            weightKg: true,
            volumeM3: true,
            requiredEquipment: true,

            shipper: {
              select: {
                name: true,
              },
            },
          },
        }),

        prisma.load.count({ where }),
      ]);

    return {
      headers: [
        "Load ID",
        "Created At (UTC)",
        "Status",
        "Shipper",
        "Pickup",
        "Delivery",
        "Cargo Type",
        "Weight (kg)",
        "Volume (m3)",
        "Required Equipment",
      ],

      rows: items.map((item) => [
        item.id,
        iso(item.createdAt),
        item.status,
        item.shipper.name,
        item.pickupName,
        item.deliveryName,
        item.cargoType,
        item.weightKg.toString(),
        text(item.volumeM3),
        text(item.requiredEquipment),
      ]),

      totalRows,
    };
  }

  if (dataset === "journeys") {
    const where = {
      createdAt: { gte: since },
    };

    const [items, totalRows] =
      await Promise.all([
        prisma.emptyLeg.findMany({
          where,
          take: MAX_ROWS,

          orderBy: [
            { createdAt: "desc" },
            { id: "desc" },
          ],

          select: {
            id: true,
            createdAt: true,
            status: true,
            originName: true,
            destinationName: true,
            departureAt: true,
            arrivalAt: true,
            availableWeightKg: true,
            availableVolumeM3: true,
            maxDetourKm: true,

            truck: {
              select: {
                registrationNumber: true,
                carrier: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        }),

        prisma.emptyLeg.count({ where }),
      ]);

    return {
      headers: [
        "Journey ID",
        "Created At (UTC)",
        "Status",
        "Carrier",
        "Truck Registration",
        "Origin",
        "Destination",
        "Departure (UTC)",
        "Arrival (UTC)",
        "Available Weight (kg)",
        "Available Volume (m3)",
        "Max Detour (km)",
      ],

      rows: items.map((item) => [
        item.id,
        iso(item.createdAt),
        item.status,
        item.truck.carrier.name,
        item.truck.registrationNumber,
        item.originName,
        item.destinationName,
        iso(item.departureAt),
        item.arrivalAt
          ? iso(item.arrivalAt)
          : "",
        item.availableWeightKg.toString(),
        text(item.availableVolumeM3),
        item.maxDetourKm.toString(),
      ]),

      totalRows,
    };
  }

  // Step 25 moderation audit.
  const where = {
    createdAt: { gte: since },
  };

  const [items, totalRows] =
    await Promise.all([
      prisma.adminModerationAction.findMany({
        where,
        take: MAX_ROWS,

        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],

        select: {
          id: true,
          createdAt: true,
          adminId: true,
          targetUserId: true,
          targetEmailSnapshot: true,
          previousStatus: true,
          nextStatus: true,
          reason: true,
        },
      }),

      prisma.adminModerationAction.count({
        where,
      }),
    ]);

  return {
    headers: [
      "Action ID",
      "Created At (UTC)",
      "Admin ID",
      "Target User ID",
      "Target Email",
      "Previous Status",
      "New Status",
      "Reason",
    ],

    rows: items.map((item) => [
      item.id,
      iso(item.createdAt),
      item.adminId,
      item.targetUserId,
      item.targetEmailSnapshot,
      item.previousStatus,
      item.nextStatus,
      item.reason,
    ]),

    totalRows,
  };
}

// Authentication and ADMIN role protection are
// applied by the parent admin.routes.ts router.
//
// GET /api/v1/admin/reports?dataset=bookings&days=30
router.get("/", async (req, res, next) => {
  try {
    const parsed = querySchema.safeParse(
      req.query
    );

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message:
          "Choose a valid report and a period of 7, 30 or 90 days",
      });
      return;
    }

    const now = new Date();

    const {
      dataset,
      days,
    } = parsed.data;

    const since = new Date(
      now.getTime() -
        days * 24 * 60 * 60 * 1000
    );

    const report = await fetchReport(
      dataset,
      since
    );

    const exportedRows = report.rows.length;

    const csv = buildCsv(
      report.headers,
      report.rows
    );

    const filename =
      `empty-miles-${dataset}-${days}d-` +
      `${now.toISOString().slice(0, 10)}.csv`;

    // Reports contain business and account data.
    // Avoid storing the response in shared caches.
    res.setHeader(
      "Cache-Control",
      "private, no-store"
    );

    res.json({
      success: true,

      data: {
        dataset,
        days,

        generatedAt: now.toISOString(),
        from: since.toISOString(),
        to: now.toISOString(),

        filename,

        totalRows: report.totalRows,
        exportedRows,

        truncated:
          report.totalRows > exportedRows,

        headers: report.headers,

        preview: report.rows.slice(
          0,
          PREVIEW_ROWS
        ),

        csv,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
