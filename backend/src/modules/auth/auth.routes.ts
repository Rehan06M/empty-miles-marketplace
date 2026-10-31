
import { Router } from "express";
import bcrypt from "bcryptjs";
import { rateLimit } from "express-rate-limit";

import { prisma } from "../../database/prisma.js";
import {
  authenticate,
  getAuthenticatedUser,
  requireRole,
} from "../../middleware/authenticate.js";

import {
  loginSchema,
  registerSchema,
} from "./auth.schemas.js";

import { createAccessToken } from "./auth.tokens.js";
import { toPublicUser } from "../../utils/publicUser.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again later.",
  },
});

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  companyName: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

// ---------------------------------------
// POST /api/v1/auth/register
// ---------------------------------------

router.post("/register", authLimiter, async (req, res, next) => {
  try {
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: "Invalid registration details",
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }

    const input = result.data;

    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existing) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(
      input.password,
      12
    );

    let user;

    try {
      user = await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          phone: input.phone,
          companyName: input.companyName,
          role: input.role,
        },
        select: publicUserSelect,
      });
    } catch (error) {
      // Handles the race where two registration requests
      // attempt the same email simultaneously.
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        res.status(409).json({
          success: false,
          message: "An account with this email already exists",
        });
        return;
      }

      throw error;
    }

    const accessToken = await createAccessToken({
      userId: user.id,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        user: toPublicUser(user),
        accessToken,
        tokenType: "Bearer",
        expiresInSeconds: 900,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------
// POST /api/v1/auth/login
// ---------------------------------------

router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: "Invalid login details",
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }

    const { email, password } = result.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    const passwordValid = user
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    if (
      !user ||
      !passwordValid ||
      user.status !== "ACTIVE"
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    const accessToken = await createAccessToken({
      userId: user.id,
      role: user.role,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: toPublicUser(user),
        accessToken,
        tokenType: "Bearer",
        expiresInSeconds: 900,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------
// GET /api/v1/auth/me
// ---------------------------------------

router.get("/me", authenticate, async (_req, res, next) => {
  try {
    const authUser = getAuthenticatedUser(res);

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: publicUserSelect,
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.json({
      success: true,
      data: { user: toPublicUser(user) },
    });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------
// Role enforcement test endpoints
// ---------------------------------------

router.get(
  "/check/shipper",
  authenticate,
  requireRole("SHIPPER"),
  (_req, res) => {
    res.json({
      success: true,
      message: "Shipper access granted",
    });
  }
);

router.get(
  "/check/carrier",
  authenticate,
  requireRole("CARRIER"),
  (_req, res) => {
    res.json({
      success: true,
      message: "Carrier access granted",
    });
  }
);

router.get(
  "/check/admin",
  authenticate,
  requireRole("ADMIN"),
  (_req, res) => {
    res.json({
      success: true,
      message: "Admin access granted",
    });
  }
);

export default router;
