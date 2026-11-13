
import { apiRequest } from "./apiClient";

import type {
  MarketplaceBooking,
} from "../types/booking";

export function createBooking(
  offerToken: string
): Promise<MarketplaceBooking> {
  return apiRequest<MarketplaceBooking>(
    "/bookings",
    {
      method: "POST",
      body: JSON.stringify({ offerToken }),
    }
  );
}

export function getMyBookings():
  Promise<MarketplaceBooking[]> {
  return apiRequest<MarketplaceBooking[]>(
    "/bookings/mine"
  );
}

export function getIncomingBookings():
  Promise<MarketplaceBooking[]> {
  return apiRequest<MarketplaceBooking[]>(
    "/bookings/incoming"
  );
}

export type BookingAction =
  | "approve"
  | "reject"
  | "start"
  | "complete"
  | "cancel";

export function changeBookingStatus(
  id: string,
  action: BookingAction
): Promise<MarketplaceBooking> {
  return apiRequest<MarketplaceBooking>(
    `/bookings/${encodeURIComponent(id)}/${action}`,
    { method: "PATCH" }
  );
}
