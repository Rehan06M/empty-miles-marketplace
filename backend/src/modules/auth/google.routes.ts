
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";

import { prisma } from "../../database/prisma.js";
import { createAccessToken } from "./auth.tokens.js";
import { verifyGoogleCredential } from "./google.service.js";

const router = Router();

const googleSchema = z.strictObject({
  credential: z.string().min(100).max(10000),
  role: z.enum(["SHIPPER", "CARRIER"]).optional(),
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many sign-in attempts. Try again later.",
  },
});

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  companyName: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

router.post("/", limiter, async (req, res, next) => {
  try {
    const parsed = googleSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid Google authentication request",
      });
      return;
    }

    const { credential, role } = parsed.data;

    let googleUser;

    try {
      googleUser = await verifyGoogleCredential(credential);
    } catch {
      res.status(401).json({
        success: false,
        message: "Google authentication failed",
      });
      return;
    }

    // Always identify a returning Google account by sub.
    const existingIdentity =
      await prisma.authIdentity.findUnique({
        where: {
          provider_providerUserId: {
            provider: "GOOGLE",
            providerUserId: googleUser.googleSubject,
          },
        },
        include: {
          user: {
            select: userSelect,
          },
        },
      });

    let user;

    if (existingIdentity) {
      user = existingIdentity.user;
    } else {
      // Role selection is required for first-time Google users.
      if (!role) {
        res.status(400).json({
          success: false,
          code: "ROLE_REQUIRED",
          message:
            "Choose Shipper or Carrier to create your account.",
        });
        return;
      }

      // Do not automatically link to another account just
      // because Google reports the same email.
      const emailAccount = await prisma.user.findUnique({
        where: { email: googleUser.email },
        select: { id: true },
      });

      if (emailAccount) {
        res.status(409).json({
          success: false,
          code: "ACCOUNT_LINK_REQUIRED",
          message:
            "An account already uses this email. Sign in with your existing method. Google account linking is not yet available.",
        });
        return;
      }

      // Create the user and Google identity atomically.
      try {
        user = await prisma.user.create({
          data: {
            name: googleUser.name,
            email: googleUser.email,
            passwordHash: null,
            role,
            companyName: null,
            identities: {
              create: {
                provider: "GOOGLE",
                providerUserId: googleUser.googleSubject,
              },
            },
          },
          select: userSelect,
        });
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "P2002"
        ) {
          res.status(409).json({
            success: false,
            message:
              "An account conflict occurred. Please try signing in again.",
          });
          return;
        }

        throw error;
      }
    }

    if (user.status !== "ACTIVE") {
      res.status(403).json({
        success: false,
        message: "This account is not active",
      });
      return;
    }

    // This is our marketplace JWT, not Google's ID token.
    const accessToken = await createAccessToken({
      userId: user.id,
      role: user.role,
    });

    res.status(200).json({
      success: true,
      message: "Google authentication successful",
      data: {
        user,
        accessToken,
        tokenType: "Bearer",
        expiresInSeconds: 900,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
