
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../../database/prisma.js";
import {
  authenticate,
  requireRole,
  getAuthenticatedUser,
} from "../../middleware/authenticate.js";

const router = Router();

router.use(authenticate, requireRole("SHIPPER"));

const uuidSchema = z.uuid();

const equipmentSchema = z.enum([
  "OPEN_BODY",
  "CONTAINER",
  "FLATBED",
  "REFRIGERATED",
  "OTHER",
]);

// Enforce the precision supported by PostgreSQL Decimal columns.
const weightSchema = z.number()
  .finite()
  .min(0.01)
  .max(9999999999.99)
  .refine(
    (value) => Number.isInteger(Math.round(value * 100)) &&
      Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
    "Weight allows at most two decimal places"
  );

const volumeSchema = z.number()
  .finite()
  .min(0.001)
  .max(999999999.999)
  .refine(
    (value) =>
      Math.abs(value * 1000 - Math.round(value * 1000)) <
      0.000001,
    "Volume allows at most three decimal places"
  );

const fields = z.object({
  pickupName: z.string().trim().min(2).max(150),
  deliveryName: z.string().trim().min(2).max(150),

  cargoDescription: z.string().trim().min(3).max(500),
  cargoType: z.string().trim().min(2).max(60),

  weightKg: weightSchema,
  volumeM3: volumeSchema.nullable(),

  requiredEquipment: equipmentSchema.nullable(),

  pickupWindowStart: z.iso.datetime({ offset: true }),
  pickupWindowEnd: z.iso.datetime({ offset: true }),

  deliveryWindowStart: z.iso.datetime({
    offset: true,
  }).nullable(),

  deliveryWindowEnd: z.iso.datetime({
    offset: true,
  }).nullable(),

  status: z.enum(["DRAFT", "ACTIVE"]),
});

const createSchema = fields.extend({
  volumeM3: fields.shape.volumeM3.optional(),
  requiredEquipment: fields.shape.requiredEquipment.optional(),
  deliveryWindowStart:
    fields.shape.deliveryWindowStart.optional(),
  deliveryWindowEnd:
    fields.shape.deliveryWindowEnd.optional(),
  status: fields.shape.status.default("DRAFT"),
}).strict();

const updateSchema = fields
  .partial()
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Provide at least one field to update"
  );

type LoadValues = z.infer<typeof fields>;

function validateLoad(data: LoadValues): string | null {
  if (
    data.pickupName.toLowerCase() ===
    data.deliveryName.toLowerCase()
  ) {
    return "Pickup and delivery locations must differ";
  }

  const pickupStart = new Date(data.pickupWindowStart);
  const pickupEnd = new Date(data.pickupWindowEnd);

  if (pickupEnd <= pickupStart) {
    return "Pickup window end must be after its start";
  }

  if (
    data.status === "ACTIVE" &&
    pickupStart <= new Date()
  ) {
    return "Active loads require a future pickup window";
  }

  const deliveryStart = data.deliveryWindowStart
    ? new Date(data.deliveryWindowStart)
    : null;

  const deliveryEnd = data.deliveryWindowEnd
    ? new Date(data.deliveryWindowEnd)
    : null;

  if (
    deliveryStart &&
    deliveryEnd &&
    deliveryEnd <= deliveryStart
  ) {
    return "Delivery window end must be after its start";
  }

  if (deliveryStart && deliveryStart < pickupStart) {
    return "Delivery cannot begin before the pickup window";
  }

  if (deliveryEnd && deliveryEnd <= pickupStart) {
    return "Delivery must end after pickup begins";
  }

  return null;
}

function handleError(
  error: unknown,
  next: (error: unknown) => void
) {
  next(error);
}

function toCreateData(
  input: LoadValues,
  shipperId: string
) {
  return {
    shipperId,
    pickupName: input.pickupName,
    deliveryName: input.deliveryName,
    cargoDescription: input.cargoDescription,
    cargoType: input.cargoType,
    weightKg: input.weightKg,
    volumeM3: input.volumeM3,
    requiredEquipment: input.requiredEquipment,
    pickupWindowStart: new Date(input.pickupWindowStart),
    pickupWindowEnd: new Date(input.pickupWindowEnd),
    deliveryWindowStart: input.deliveryWindowStart
      ? new Date(input.deliveryWindowStart)
      : null,
    deliveryWindowEnd: input.deliveryWindowEnd
      ? new Date(input.deliveryWindowEnd)
      : null,
    status: input.status,
  };
}

// POST /api/v1/loads
router.post("/", async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid shipment details",
        errors: z.flattenError(parsed.error),
      });
      return;
    }

    const input: LoadValues = {
      ...parsed.data,
      volumeM3: parsed.data.volumeM3 ?? null,
      requiredEquipment:
        parsed.data.requiredEquipment ?? null,
      deliveryWindowStart:
        parsed.data.deliveryWindowStart ?? null,
      deliveryWindowEnd:
        parsed.data.deliveryWindowEnd ?? null,
    };

    const validationError = validateLoad(input);

    if (validationError) {
      res.status(400).json({
        success: false,
        message: validationError,
      });
      return;
    }

    const shipperId = getAuthenticatedUser(res).id;

    const load = await prisma.load.create({
      data: toCreateData(input, shipperId),
    });

    res.status(201).json({
      success: true,
      message: "Shipment created successfully",
      data: load,
    });
  } catch (error) {
    handleError(error, next);
  }
});

// GET /api/v1/loads
router.get("/", async (_req, res, next) => {
  try {
    const shipperId = getAuthenticatedUser(res).id;

    const loads = await prisma.load.findMany({
      where: { shipperId },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: loads,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/loads/:id
router.get("/:id", async (req, res, next) => {
  try {
    const parsed = uuidSchema.safeParse(req.params.id);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid shipment ID",
      });
      return;
    }

    const shipperId = getAuthenticatedUser(res).id;

    const load = await prisma.load.findFirst({
      where: {
        id: parsed.data,
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

    res.json({
      success: true,
      data: load,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/loads/:id
router.patch("/:id", async (req, res, next) => {
  try {
    const parsedId = uuidSchema.safeParse(req.params.id);
    const parsedBody = updateSchema.safeParse(req.body);

    if (!parsedId.success || !parsedBody.success) {
      res.status(400).json({
        success: false,
        message: "Invalid shipment update",
        errors: parsedBody.success
          ? undefined
          : z.flattenError(parsedBody.error),
      });
      return;
    }

    const shipperId = getAuthenticatedUser(res).id;

    const outcome = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "Load"
        WHERE "id" = ${parsedId.data}::uuid
          AND "shipperId" = ${shipperId}::uuid
        FOR UPDATE
      `;

      if (!rows.length) {
        return { kind: "missing" as const };
      }

      const existing = await tx.load.findFirstOrThrow({
        where: {
          id: parsedId.data,
          shipperId,
        },
      });

      if (
        existing.status !== "DRAFT" &&
        existing.status !== "ACTIVE"
      ) {
        return { kind: "closed" as const };
      }

      const bookingCount = await tx.booking.count({
        where: {
          loadId: existing.id,
          status: {
            in: [
              "PENDING_APPROVAL",
              "CONFIRMED",
              "IN_TRANSIT",
            ],
          },
        },
      });

      if (bookingCount > 0) {
        return { kind: "booked" as const };
      }

      const patch = parsedBody.data;

      if (
        existing.status === "ACTIVE" &&
        patch.status === "DRAFT"
      ) {
        return { kind: "closed" as const };
      }

      const merged: LoadValues = {
        pickupName:
          patch.pickupName ?? existing.pickupName,
        deliveryName:
          patch.deliveryName ?? existing.deliveryName,
        cargoDescription:
          patch.cargoDescription ??
          existing.cargoDescription,
        cargoType:
          patch.cargoType ?? existing.cargoType,
        weightKg:
          patch.weightKg ??
          existing.weightKg.toNumber(),
        volumeM3:
          patch.volumeM3 !== undefined
            ? patch.volumeM3
            : existing.volumeM3?.toNumber() ?? null,
        requiredEquipment:
          patch.requiredEquipment !== undefined
            ? patch.requiredEquipment
            : existing.requiredEquipment,
        pickupWindowStart:
          patch.pickupWindowStart ??
          existing.pickupWindowStart.toISOString(),
        pickupWindowEnd:
          patch.pickupWindowEnd ??
          existing.pickupWindowEnd.toISOString(),
        deliveryWindowStart:
          patch.deliveryWindowStart !== undefined
            ? patch.deliveryWindowStart
            : existing.deliveryWindowStart?.toISOString() ??
              null,
        deliveryWindowEnd:
          patch.deliveryWindowEnd !== undefined
            ? patch.deliveryWindowEnd
            : existing.deliveryWindowEnd?.toISOString() ??
              null,
        status:
          patch.status ??
          (existing.status as "DRAFT" | "ACTIVE"),
      };

      const validationError = validateLoad(merged);

      if (validationError) {
        return {
          kind: "invalid" as const,
          message: validationError,
        };
      }

      const updated = await tx.load.update({
        where: { id: existing.id },
        data: {
          ...toCreateData(merged, shipperId),
        },
      });

      return {
        kind: "ok" as const,
        load: updated,
      };
    });

    if (outcome.kind === "missing") {
      res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
      return;
    }

    if (outcome.kind === "closed") {
      res.status(409).json({
        success: false,
        message:
          "This shipment cannot be edited or moved to draft",
      });
      return;
    }

    if (outcome.kind === "booked") {
      res.status(409).json({
        success: false,
        message:
          "Shipment cannot be edited while bookings are active",
      });
      return;
    }

    if (outcome.kind === "invalid") {
      res.status(400).json({
        success: false,
        message: outcome.message,
      });
      return;
    }

    res.json({
      success: true,
      message: "Shipment updated successfully",
      data: outcome.load,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/loads/:id/cancel
router.patch("/:id/cancel", async (req, res, next) => {
  try {
    const parsed = uuidSchema.safeParse(req.params.id);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid shipment ID",
      });
      return;
    }

    const shipperId = getAuthenticatedUser(res).id;

    const outcome = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "Load"
        WHERE "id" = ${parsed.data}::uuid
          AND "shipperId" = ${shipperId}::uuid
        FOR UPDATE
      `;

      if (!rows.length) {
        return { kind: "missing" as const };
      }

      const existing = await tx.load.findFirstOrThrow({
        where: {
          id: parsed.data,
          shipperId,
        },
      });

      if (
        existing.status !== "DRAFT" &&
        existing.status !== "ACTIVE"
      ) {
        return { kind: "closed" as const };
      }

      const activeBookings = await tx.booking.count({
        where: {
          loadId: existing.id,
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
        return { kind: "booked" as const };
      }

      const load = await tx.load.update({
        where: { id: existing.id },
        data: { status: "CANCELLED" },
      });

      return {
        kind: "ok" as const,
        load,
      };
    });

    if (outcome.kind === "missing") {
      res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
      return;
    }

    if (outcome.kind === "closed") {
      res.status(409).json({
        success: false,
        message: "Shipment is already closed or cancelled",
      });
      return;
    }

    if (outcome.kind === "booked") {
      res.status(409).json({
        success: false,
        message:
          "Cannot cancel a shipment with active bookings",
      });
      return;
    }

    res.json({
      success: true,
      message: "Shipment cancelled successfully",
      data: outcome.load,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
