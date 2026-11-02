
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../../database/prisma.js";
import {
  authenticate,
  requireRole,
  getAuthenticatedUser,
} from "../../middleware/authenticate.js";

const router = Router();

router.use(authenticate, requireRole("CARRIER"));

const uuidSchema = z.uuid();

const legFields = z.object({
  truckId: z.uuid(),

  originName: z.string().trim().min(2).max(150),
  destinationName: z.string().trim().min(2).max(150),

  originLat: z.number().min(-90).max(90).nullable(),
  originLng: z.number().min(-180).max(180).nullable(),
  destinationLat: z.number().min(-90).max(90).nullable(),
  destinationLng: z.number().min(-180).max(180).nullable(),

  departureAt: z.iso.datetime({ offset: true }),
  arrivalAt: z.iso.datetime({ offset: true }).nullable(),

  availableWeightKg: z.number().finite().positive().max(1000000),
  availableVolumeM3: z
    .number().finite().positive().max(1000000).nullable(),

  maxDetourKm: z.number().finite().min(0).max(1000),

  acceptedCargoTypes: z.array(
    z.string().trim().min(1).max(60)
  ).max(20),

  status: z.enum(["DRAFT", "ACTIVE"]),
});

const createSchema = legFields.extend({
  originLat: legFields.shape.originLat.optional(),
  originLng: legFields.shape.originLng.optional(),
  destinationLat: legFields.shape.destinationLat.optional(),
  destinationLng: legFields.shape.destinationLng.optional(),
  arrivalAt: legFields.shape.arrivalAt.optional(),
  availableVolumeM3:
    legFields.shape.availableVolumeM3.optional(),
  maxDetourKm: legFields.shape.maxDetourKm.default(0),
  acceptedCargoTypes:
    legFields.shape.acceptedCargoTypes.default([]),
  status: legFields.shape.status.default("DRAFT"),
}).strict();

const updateSchema = legFields
  .omit({ truckId: true })
  .partial()
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Provide at least one field to update"
  );

class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

function forwardError(
  error: unknown,
  next: (error: unknown) => void
) {
  next(error);
}

function checkCoordinatePair(
  lat: number | null | undefined,
  lng: number | null | undefined
) {
  return (lat == null) === (lng == null);
}

type LegValues = z.infer<typeof legFields>;

function validateJourney(
  leg: LegValues,
  truck: {
    maxWeightKg: { toNumber(): number };
    maxVolumeM3: { toNumber(): number } | null;
    status: string;
  }
) {
  if (truck.status !== "ACTIVE") {
    throw new ApiError(
      409,
      "Only active trucks can have draft or active journeys"
    );
  }

  if (
    leg.originName.toLowerCase() ===
    leg.destinationName.toLowerCase()
  ) {
    throw new ApiError(
      400,
      "Origin and destination must be different"
    );
  }

  if (
    !checkCoordinatePair(leg.originLat, leg.originLng) ||
    !checkCoordinatePair(
      leg.destinationLat,
      leg.destinationLng
    )
  ) {
    throw new ApiError(
      400,
      "Latitude and longitude must be provided together"
    );
  }

  const departure = new Date(leg.departureAt);

  if (leg.status === "ACTIVE" && departure <= new Date()) {
    throw new ApiError(
      400,
      "Active journeys must have a future departure"
    );
  }

  if (
    leg.arrivalAt &&
    new Date(leg.arrivalAt) <= departure
  ) {
    throw new ApiError(
      400,
      "Arrival must be later than departure"
    );
  }

  if (
    leg.availableWeightKg >
    truck.maxWeightKg.toNumber()
  ) {
    throw new ApiError(
      400,
      "Available weight exceeds truck capacity"
    );
  }

  if (leg.availableVolumeM3 != null) {
    if (
      truck.maxVolumeM3 === null ||
      leg.availableVolumeM3 >
        truck.maxVolumeM3.toNumber()
    ) {
      throw new ApiError(
        400,
        "Available volume exceeds truck capacity"
      );
    }
  }
}

function handleRouteError(
  error: unknown,
  res: import("express").Response,
  next: import("express").NextFunction
) {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
    return;
  }

  forwardError(error, next);
}

// POST /api/v1/empty-legs
router.post("/", async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid journey details",
        errors: z.flattenError(parsed.error),
      });
      return;
    }

    const carrierId = getAuthenticatedUser(res).id;
    const input = parsed.data;

    const leg = await prisma.$transaction(async (tx) => {
      // Lock the truck during validation and insertion.
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Truck"
        WHERE "id" = ${input.truckId}::uuid
          AND "carrierId" = ${carrierId}::uuid
        FOR UPDATE
      `;

      if (locked.length === 0) {
        throw new ApiError(404, "Truck not found");
      }

      const truck = await tx.truck.findFirstOrThrow({
        where: { id: input.truckId, carrierId },
      });

      validateJourney(
        {
          ...input,
          originLat: input.originLat ?? null,
          originLng: input.originLng ?? null,
          destinationLat: input.destinationLat ?? null,
          destinationLng: input.destinationLng ?? null,
          arrivalAt: input.arrivalAt ?? null,
          availableVolumeM3: input.availableVolumeM3 ?? null,
        },
        truck
      );

      return tx.emptyLeg.create({
        data: {
          truckId: input.truckId,
          originName: input.originName,
          destinationName: input.destinationName,
          originLat: input.originLat ?? null,
          originLng: input.originLng ?? null,
          destinationLat: input.destinationLat ?? null,
          destinationLng: input.destinationLng ?? null,
          departureAt: new Date(input.departureAt),
          arrivalAt: input.arrivalAt
            ? new Date(input.arrivalAt)
            : null,
          availableWeightKg: input.availableWeightKg,
          availableVolumeM3:
            input.availableVolumeM3 ?? null,
          maxDetourKm: input.maxDetourKm,
          acceptedCargoTypes: input.acceptedCargoTypes,
          status: input.status,
        },
      });
    });

    res.status(201).json({
      success: true,
      message: "Journey created successfully",
      data: leg,
    });
  } catch (error) {
    handleRouteError(error, res, next);
  }
});

// GET /api/v1/empty-legs
router.get("/", async (_req, res, next) => {
  try {
    const carrierId = getAuthenticatedUser(res).id;

    const legs = await prisma.emptyLeg.findMany({
      where: {
        truck: { carrierId },
      },
      include: {
        truck: {
          select: {
            id: true,
            registrationNumber: true,
            equipmentType: true,
            status: true,
          },
        },
        stops: {
          orderBy: { sequence: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: legs,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/empty-legs/:id
router.get("/:id", async (req, res, next) => {
  try {
    const parsedId = uuidSchema.safeParse(req.params.id);

    if (!parsedId.success) {
      res.status(400).json({
        success: false,
        message: "Invalid journey ID",
      });
      return;
    }

    const carrierId = getAuthenticatedUser(res).id;

    const leg = await prisma.emptyLeg.findFirst({
      where: {
        id: parsedId.data,
        truck: { carrierId },
      },
      include: {
        truck: true,
        stops: {
          orderBy: { sequence: "asc" },
        },
      },
    });

    if (!leg) {
      res.status(404).json({
        success: false,
        message: "Journey not found",
      });
      return;
    }

    res.json({
      success: true,
      data: leg,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/empty-legs/:id
router.patch("/:id", async (req, res, next) => {
  try {
    const parsedId = uuidSchema.safeParse(req.params.id);
    const parsedBody = updateSchema.safeParse(req.body);

    if (!parsedId.success || !parsedBody.success) {
      res.status(400).json({
        success: false,
        message: "Invalid journey update",
        errors: parsedBody.success
          ? undefined
          : z.flattenError(parsedBody.error),
      });
      return;
    }

    const carrierId = getAuthenticatedUser(res).id;
    const id = parsedId.data;
    const patch = parsedBody.data;

    const updated = await prisma.$transaction(async (tx) => {
      const owned = await tx.emptyLeg.findFirst({
        where: {
          id,
          truck: { carrierId },
        },
        select: { truckId: true },
      });

      if (!owned) {
        throw new ApiError(404, "Journey not found");
      }

      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Truck"
        WHERE "id" = ${owned.truckId}::uuid
          AND "carrierId" = ${carrierId}::uuid
        FOR UPDATE
      `;

      if (!locked.length) {
        throw new ApiError(404, "Truck not found");
      }

      const existing = await tx.emptyLeg.findFirst({
        where: { id, truck: { carrierId } },
        include: { truck: true },
      });

      if (!existing) {
        throw new ApiError(404, "Journey not found");
      }

      if (!["DRAFT", "ACTIVE"].includes(existing.status)) {
        throw new ApiError(
          409,
          "Closed or cancelled journeys cannot be edited"
        );
      }

      if (
        existing.status === "ACTIVE" &&
        patch.status === "DRAFT"
      ) {
        throw new ApiError(
          409,
          "An active journey cannot return to draft"
        );
      }

      const activeBookings = await tx.booking.count({
        where: {
          emptyLegId: id,
          status: {
            in: [
              "PENDING_APPROVAL",
              "CONFIRMED",
              "IN_TRANSIT",
            ],
          },
        },
      });

      if (activeBookings > 0) {
        throw new ApiError(
          409,
          "Journey cannot be edited while bookings are active"
        );
      }

      const merged: LegValues = {
        truckId: existing.truckId,
        originName: patch.originName ?? existing.originName,
        destinationName:
          patch.destinationName ?? existing.destinationName,
        originLat: patch.originLat !== undefined
          ? patch.originLat
          : existing.originLat?.toNumber() ?? null,
        originLng: patch.originLng !== undefined
          ? patch.originLng
          : existing.originLng?.toNumber() ?? null,
        destinationLat: patch.destinationLat !== undefined
          ? patch.destinationLat
          : existing.destinationLat?.toNumber() ?? null,
        destinationLng: patch.destinationLng !== undefined
          ? patch.destinationLng
          : existing.destinationLng?.toNumber() ?? null,
        departureAt:
          patch.departureAt ?? existing.departureAt.toISOString(),
        arrivalAt: patch.arrivalAt !== undefined
          ? patch.arrivalAt
          : existing.arrivalAt?.toISOString() ?? null,
        availableWeightKg:
          patch.availableWeightKg ??
          existing.availableWeightKg.toNumber(),
        availableVolumeM3:
          patch.availableVolumeM3 !== undefined
            ? patch.availableVolumeM3
            : existing.availableVolumeM3?.toNumber() ?? null,
        maxDetourKm:
          patch.maxDetourKm ??
          existing.maxDetourKm.toNumber(),
        acceptedCargoTypes:
          patch.acceptedCargoTypes ??
          existing.acceptedCargoTypes,
        status: patch.status ?? (
          existing.status as "DRAFT" | "ACTIVE"
        ),
      };

      validateJourney(merged, existing.truck);

      return tx.emptyLeg.update({
        where: { id },
        data: {
          originName: merged.originName,
          destinationName: merged.destinationName,
          originLat: merged.originLat,
          originLng: merged.originLng,
          destinationLat: merged.destinationLat,
          destinationLng: merged.destinationLng,
          departureAt: new Date(merged.departureAt),
          arrivalAt: merged.arrivalAt
            ? new Date(merged.arrivalAt)
            : null,
          availableWeightKg: merged.availableWeightKg,
          availableVolumeM3: merged.availableVolumeM3,
          maxDetourKm: merged.maxDetourKm,
          acceptedCargoTypes: merged.acceptedCargoTypes,
          status: merged.status,
        },
      });
    });

    res.json({
      success: true,
      message: "Journey updated successfully",
      data: updated,
    });
  } catch (error) {
    handleRouteError(error, res, next);
  }
});

// PATCH /api/v1/empty-legs/:id/close
router.patch("/:id/close", async (req, res, next) => {
  try {
    const parsedId = uuidSchema.safeParse(req.params.id);

    if (!parsedId.success) {
      res.status(400).json({
        success: false,
        message: "Invalid journey ID",
      });
      return;
    }

    const carrierId = getAuthenticatedUser(res).id;
    const id = parsedId.data;

    const updated = await prisma.$transaction(async (tx) => {
      const owned = await tx.emptyLeg.findFirst({
        where: { id, truck: { carrierId } },
        select: { truckId: true },
      });

      if (!owned) {
        throw new ApiError(404, "Journey not found");
      }

      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Truck"
        WHERE "id" = ${owned.truckId}::uuid
          AND "carrierId" = ${carrierId}::uuid
        FOR UPDATE
      `;

      if (!locked.length) {
        throw new ApiError(404, "Truck not found");
      }

      const leg = await tx.emptyLeg.findFirst({
        where: { id, truck: { carrierId } },
      });

      if (!leg) {
        throw new ApiError(404, "Journey not found");
      }

      if (leg.status === "CLOSED") {
        throw new ApiError(409, "Journey is already closed");
      }

      if (leg.status === "CANCELLED") {
        throw new ApiError(
          409,
          "Cancelled journey cannot be closed"
        );
      }

      const activeBookings = await tx.booking.count({
        where: {
          emptyLegId: id,
          status: {
            in: [
              "PENDING_APPROVAL",
              "CONFIRMED",
              "IN_TRANSIT",
            ],
          },
        },
      });

      if (activeBookings > 0) {
        throw new ApiError(
          409,
          "Cannot close a journey with active bookings"
        );
      }

      return tx.emptyLeg.update({
        where: { id },
        data: { status: "CLOSED" },
      });
    });

    res.json({
      success: true,
      message: "Journey closed successfully",
      data: updated,
    });
  } catch (error) {
    handleRouteError(error, res, next);
  }
});

export default router;
