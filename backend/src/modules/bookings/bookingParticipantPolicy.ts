
export type BookingParticipant = {
  id: string;
  role: string;
  status: string;
};

export function validateBookingParticipants(
  shipper: BookingParticipant | undefined,
  carrier: BookingParticipant | undefined
): string | null {
  if (!shipper || !carrier) {
    return "Shipper or carrier account no longer exists";
  }

  if (shipper.role !== "SHIPPER") {
    return "Shipment owner is no longer a shipper account";
  }

  if (carrier.role !== "CARRIER") {
    return "Truck owner is no longer a carrier account";
  }

  if (shipper.status !== "ACTIVE") {
    return "Shipper account is not active";
  }

  if (carrier.status !== "ACTIVE") {
    return "Carrier account is not active";
  }

  if (shipper.id === carrier.id) {
    return "The same account cannot be both booking participants";
  }

  return null;
}
