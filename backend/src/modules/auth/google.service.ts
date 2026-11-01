
import "dotenv/config";

import { OAuth2Client } from "google-auth-library";

const clientId = process.env.GOOGLE_CLIENT_ID;

if (!clientId) {
  throw new Error(
    "GOOGLE_CLIENT_ID is missing from backend/.env"
  );
}

const googleClient = new OAuth2Client(clientId);

export type VerifiedGoogleUser = {
  googleSubject: string;
  email: string;
  name: string;
};

export async function verifyGoogleCredential(
  credential: string
): Promise<VerifiedGoogleUser> {
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: clientId,
  });

  const payload = ticket.getPayload();

  if (
    !payload?.sub ||
    !payload.email ||
    payload.email_verified !== true
  ) {
    throw new Error("Invalid Google account information");
  }

  return {
    googleSubject: payload.sub,
    email: payload.email.trim().toLowerCase(),
    name: payload.name?.trim() || "Google User",
  };
}
