
export type BookingStatus =
  | "PENDING_APPROVAL"
  | "CONFIRMED"
  | "IN_TRANSIT"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

export type MarketplaceBooking = {
  id: string;
  loadId: string;
  emptyLegId: string;
  shipperId: string;

  status: BookingStatus;

  requestedWeightKg: string;
  requestedVolumeM3: string | null;

  pickupName: string;
  deliveryName: string;

  quotedPriceInr: string | null;
  dedicatedPriceInr: string | null;
  platformFeeInr: string | null;
  estimatedCo2SavedKg: string | null;

  expiresAt: string;
  requestedAt: string;
  approvedAt: string | null;
  pickedUpAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;

  load: {
    id: string;
    pickupName: string;
    deliveryName: string;
    cargoDescription: string;
    weightKg: string;
    volumeM3: string | null;
  };

  emptyLeg: {
    id: string;
    originName: string;
    destinationName: string;
    truck: {
      registrationNumber: string;
      equipmentType: string;
    };
  };
};
