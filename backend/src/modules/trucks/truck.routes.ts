
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../../database/prisma.js";
import {
  authenticate,
  requireRole,
  getAuthenticatedUser,
} from "../../middleware/authenticate.js";

// Replace auth.middleware.js above only if your
// actual middleware filename is different.

const router = Router();

router.use(authenticate, requireRole("CARRIER"));

const truckFields = z.object({
  registrationNumber: z
    .string()
    .trim()
    .min(5)
    .max(30)
    .regex(
      /^[A-Za-z0-9 -]+$/,
      "Enter a valid registration number"
    )
    .transform((value) =>
      value.toUpperCase().replace(/[\s-]+/g, "")
    )
    .pipe(
      z.string().regex(
        /^[A-Z]{2}[0-9]{1,2}[A-Z0-9]{3,15}$/,
        "Enter a valid canonical vehicle registration"
      )
    ),

  equipmentType: z.enum([
    "OPEN_BODY",
    "CONTAINER",
    "FLATBED",
    "REFRIGERATED",
    "OTHER",
  ]),

  maxWeightKg: z.number().finite().positive().max(1000000),

  maxVolumeM3: z
    .number()
    .finite()
    .positive()
    .max(1000000)
    .nullable(),
});

const createTruckSchema = truckFields.strict();

const updateTruckSchema = truckFields
  .partial()
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Provide at least one field to update"
  );

const idSchema = z.uuid();

function isUniqueConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

// POST /api/v1/trucks
router.post("/", async (req, res, next) => {
  try {
    const parsed = createTruckSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid truck details",
        errors: z.flattenError(parsed.error),
      });
      return;
    }

    const carrierId = getAuthenticatedUser(res).id;

    const truck = await prisma.truck.create({
      data: {
        ...parsed.data,
        carrierId,
        status: "ACTIVE",
      },
    });

    res.status(201).json({
      success: true,
      message: "Truck registered successfully",
      data: truck,
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      res.status(409).json({
        success: false,
        message: "Truck registration number already exists",
      });
      return;
    }

    next(error);
  }
});

// GET /api/v1/trucks
router.get("/", async (_req, res, next) => {
  try {
    const carrierId = getAuthenticatedUser(res).id;

    const trucks = await prisma.truck.findMany({
      where: { carrierId },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: trucks,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/trucks/:id
router.get("/:id", async (req, res, next) => {
  try {
    const parsedId = idSchema.safeParse(req.params.id);

    if (!parsedId.success) {
      res.status(400).json({
        success: false,
        message: "Invalid truck ID",
      });
      return;
    }

    const carrierId = getAuthenticatedUser(res).id;

    const truck = await prisma.truck.findFirst({
      where: {
        id: parsedId.data,
        carrierId,
      },
    });

    if (!truck) {
      res.status(404).json({
        success: false,
        message: "Truck not found",
      });
      return;
    }

    res.json({
      success: true,
      data: truck,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/trucks/:id

router.patch("/:id", async (req, res, next) => {
  try {
    const id = idSchema.safeParse(req.params.id);
    const body = updateTruckSchema.safeParse(req.body);

    if (!id.success || !body.success) {
      res.status(400).json({
        success: false,
        message: "Invalid truck ID or update details",
        errors: body.success
          ? undefined
          : z.flattenError(body.error),
      });
      return;
    }

    const carrierId = getAuthenticatedUser(res).id;

    const outcome = await prisma.$transaction(
      async (tx) => {
        // Lock this carrier's truck before checking
        // the journeys associated with it.
        const rows = await tx.$queryRaw<
          { id: string }[]
        >`
          SELECT "id"
          FROM "Truck"
          WHERE "id" = ${id.data}::uuid
            AND "carrierId" = ${carrierId}::uuid
          FOR UPDATE
        `;

        if (!rows.length) {
          return { kind: "missing" as const };
        }

        const existing =
          await tx.truck.findFirstOrThrow({
            where: {
              id: id.data,
              carrierId,
            },
          });

        const capacityChanged =
          body.data.maxWeightKg !== undefined ||
          body.data.maxVolumeM3 !== undefined;

        if (capacityChanged) {
          const journeys =
            await tx.emptyLeg.findMany({
              where: {
                truckId: existing.id,
                status: {
                  in: ["DRAFT", "ACTIVE"],
                },
              },
              select: {
                availableWeightKg: true,
                availableVolumeM3: true,
              },
            });

          const weight =
            body.data.maxWeightKg ??
            existing.maxWeightKg.toNumber();

          const volume =
            body.data.maxVolumeM3 !== undefined
              ? body.data.maxVolumeM3
              : existing.maxVolumeM3?.toNumber() ??
              null;

          const conflicts = journeys.some(
            (leg) => {
              const tooHeavy =
                leg.availableWeightKg.toNumber() >
                weight;

              const tooLarge =
                leg.availableVolumeM3 !== null &&
                (
                  volume === null ||
                  leg.availableVolumeM3.toNumber() >
                  volume
                );

              return tooHeavy || tooLarge;
            }
          );

          if (conflicts) {
            return { kind: "conflict" as const };
          }
        }

        const truck = await tx.truck.update({
          where: { id: existing.id },
          data: body.data,
        });

        return {
          kind: "ok" as const,
          truck,
        };
      }
    );

    if (outcome.kind === "missing") {
      res.status(404).json({
        success: false,
        message: "Truck not found",
      });
      return;
    }

    if (outcome.kind === "conflict") {
      res.status(409).json({
        success: false,
        message:
          "Truck capacity conflicts with an existing journey",
      });
      return;
    }

    res.json({
      success: true,
      message: "Truck updated successfully",
      data: outcome.truck,
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      res.status(409).json({
        success: false,
        message:
          "Truck registration number already exists",
      });
      return;
    }

    next(error);
  }
});


// PATCH /api/v1/trucks/:id/deactivate

router.patch(
  "/:id/deactivate",
  async (req, res, next) => {
    try {
      const id = idSchema.safeParse(req.params.id);

      if (!id.success) {
        res.status(400).json({
          success: false,
          message: "Invalid truck ID",
        });
        return;
      }

      const carrierId = getAuthenticatedUser(res).id;

      const result = await prisma.$transaction(
        async (tx) => {
          const rows = await tx.$queryRaw<
            { id: string }[]
          >`
            SELECT "id"
            FROM "Truck"
            WHERE "id" = ${id.data}::uuid
              AND "carrierId" = ${carrierId}::uuid
            FOR UPDATE
          `;

          if (!rows.length) {
            return "missing" as const;
          }

          const activeJourneys =
            await tx.emptyLeg.count({
              where: {
                truckId: id.data,
                status: "ACTIVE",
              },
            });

          if (activeJourneys > 0) {
            return "conflict" as const;
          }

          await tx.truck.update({
            where: {
              id: id.data,
            },
            data: {
              status: "INACTIVE",
            },
          });

          return "ok" as const;
        }
      );

      if (result === "missing") {
        res.status(404).json({
          success: false,
          message: "Truck not found",
        });
        return;
      }

      if (result === "conflict") {
        res.status(409).json({
          success: false,
          message:
            "Close active journeys before deactivating this truck",
        });
        return;
      }

      res.json({
        success: true,
        message: "Truck deactivated successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);


export default router;
