
import type {
  RequestHandler,
  Response,
} from "express";

import { prisma } from "../database/prisma.js";
import { verifyAccessToken } from "../modules/auth/auth.tokens.js";

import type { UserRole } from "../generated/prisma/enums.js";

export type AuthenticatedUser = {
  id: string;
  role: UserRole;
};

export function getAuthenticatedUser(
  res: Response
): AuthenticatedUser {
  const user = res.locals.auth as
    | AuthenticatedUser
    | undefined;

  if (!user) {
    throw new Error("Authentication context unavailable");
  }

  return user;
}

export const authenticate: RequestHandler = async (
  req,
  res,
  next
) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  try {
    const payload = await verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (
      !user ||
      user.status !== "ACTIVE" ||
      user.role !== payload.role
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid or inactive session",
      });
      return;
    }

    res.locals.auth = {
      id: user.id,
      role: user.role,
    } satisfies AuthenticatedUser;

    next();
  } catch (error) {
    // Invalid/expired JWTs receive 401.
    // Unexpected database errors should reach the error handler.
    if (
      error instanceof Error &&
      (
        error.name === "JWTExpired" ||
        error.name === "JWTInvalid" ||
        error.name === "JWSInvalid" ||
        error.name === "JWSSignatureVerificationFailed" ||
        error.message === "Invalid access token payload"
      )
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
      return;
    }

    next(error);
  }
};

export function requireRole(
  ...allowedRoles: UserRole[]
): RequestHandler {
  return (_req, res, next) => {
    const user = res.locals.auth as
      | AuthenticatedUser
      | undefined;

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        success: false,
        message: "Access denied for this account role",
      });
      return;
    }

    next();
  };
}
