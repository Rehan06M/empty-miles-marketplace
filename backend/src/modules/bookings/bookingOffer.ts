
import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";

const offerSchema = z.object({
  shipperId: z.uuid(),
  loadId: z.uuid(),
  emptyLegId: z.uuid(),

  loadUpdatedAt: z.string(),
  legUpdatedAt: z.string(),

  quotedPriceInr: z.number().finite().nonnegative(),
  dedicatedPriceInr: z.number().finite().nonnegative(),
  platformFeeInr: z.number().finite().nonnegative(),
  estimatedCo2SavedKg: z.number().finite().nonnegative(),

  issuedAt: z.number().int(),
  expiresAt: z.number().int(),
}).strict();

export type BookingOffer = z.infer<typeof offerSchema>;

function secret(): string {
  const value = process.env.BOOKING_OFFER_SECRET;

  if (!value || value.length < 32) {
    throw new Error(
      "BOOKING_OFFER_SECRET must be configured on the backend"
    );
  }

  return value;
}

function sign(payload: string): Buffer {
  return createHmac("sha256", secret())
    .update(payload)
    .digest();
}

export function createBookingOffer(
  data: Omit<BookingOffer, "issuedAt" | "expiresAt">
): string {
  const issuedAt = Date.now();

  const offer: BookingOffer = {
    ...data,
    issuedAt,
    expiresAt: issuedAt + 15 * 60 * 1000,
  };

  const encoded = Buffer.from(
    JSON.stringify(offer),
    "utf8"
  ).toString("base64url");

  const signature = sign(encoded).toString("base64url");

  return `${encoded}.${signature}`;
}

export function verifyBookingOffer(
  token: string
): BookingOffer | null {
  try {
    if (token.length > 8192) return null;

    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [encoded, signature] = parts;

    if (!encoded || !signature) return null;

    const actual = Buffer.from(
      signature,
      "base64url"
    );

    const expected = sign(encoded);

    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      return null;
    }

    const decoded: unknown = JSON.parse(
      Buffer.from(encoded, "base64url")
        .toString("utf8")
    );

    const parsed = offerSchema.safeParse(decoded);

    if (!parsed.success) return null;

    const now = Date.now();

    if (
      parsed.data.issuedAt > now ||
      parsed.data.expiresAt <= now ||
      parsed.data.expiresAt -
        parsed.data.issuedAt > 15 * 60 * 1000
    ) {
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}
