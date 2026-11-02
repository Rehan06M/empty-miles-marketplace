
import type { EquipmentType } from "./carrier";

export type LoadStatus =
  | "DRAFT"
  | "ACTIVE"
  | "CLOSED"
  | "CANCELLED";

export type ShipmentLoad = {
  id: string;
  shipperId: string;

  pickupName: string;
  deliveryName: string;

  pickupLat: string | null;
  pickupLng: string | null;
  deliveryLat: string | null;
  deliveryLng: string | null;

  cargoDescription: string;
  cargoType: string;

  weightKg: string;
  volumeM3: string | null;

  pickupWindowStart: string;
  pickupWindowEnd: string;
  deliveryWindowStart: string | null;
  deliveryWindowEnd: string | null;

  requiredEquipment: EquipmentType | null;

  status: LoadStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateLoadInput = {
  pickupName: string;
  deliveryName: string;
  cargoDescription: string;
  cargoType: string;
  weightKg: number;
  volumeM3: number | null;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  deliveryWindowStart: string | null;
  deliveryWindowEnd: string | null;
  requiredEquipment: EquipmentType | null;
  status: "DRAFT" | "ACTIVE";
};

export type UpdateLoadInput =
  Partial<CreateLoadInput>;
