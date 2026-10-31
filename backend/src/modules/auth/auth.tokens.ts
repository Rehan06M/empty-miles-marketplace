
import "dotenv/config";

import {
  SignJWT,
  jwtVerify,
} from "jose";

import type { UserRole } from "../../generated/prisma/enums.js";

const secretText = process.env.JWT_SECRET;

if (!secretText || secretText.length < 32) {
  throw new Error(
    "JWT_SECRET must be configured with at least 32 characters."
  );
}

const secret = new TextEncoder().encode(secretText);

const issuer = process.env.JWT_ISSUER ?? "empty-miles-api";
const audience = process.env.JWT_AUDIENCE ?? "empty-miles-client";

export type AccessTokenPayload = {
  userId: string;
  role: UserRole;
};

export async function createAccessToken(
  payload: AccessTokenPayload
): Promise<string> {
  return new SignJWT({
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime("15m")
    .sign(secret);
}

export async function verifyAccessToken(
  token: string
): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, secret, {
    issuer,
    audience,
    algorithms: ["HS256"],
  });

  if (
    typeof payload.sub !== "string" ||
    !["SHIPPER", "CARRIER", "ADMIN"].includes(
      String(payload.role)
    )
  ) {
    throw new Error("Invalid access token payload");
  }

  return {
    userId: payload.sub,
    role: payload.role as UserRole,
  };
}
