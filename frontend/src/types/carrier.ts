
export type EquipmentType =
  | "OPEN_BODY"
  | "CONTAINER"
  | "FLATBED"
  | "REFRIGERATED"
  | "OTHER";

export type TruckStatus = "ACTIVE" | "INACTIVE";

export type ListingStatus =
  | "DRAFT"
  | "ACTIVE"
  | "CLOSED"
  | "CANCELLED";

export type Truck = {
  id: string;
  carrierId: string;
  registrationNumber: string;
  equipmentType: EquipmentType;
  maxWeightKg: string;
  maxVolumeM3: string | null;
  status: TruckStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateTruckInput = {
  registrationNumber: string;
  equipmentType: EquipmentType;
  maxWeightKg: number;
  maxVolumeM3: number | null;
};

export type UpdateTruckInput =
  Partial<CreateTruckInput>;

export type LegStop = {
  id: string;
  emptyLegId: string;
  sequence: number;
  placeName: string;
  latitude: string | null;
  longitude: string | null;
  arrivalAt: string | null;
};

export type EmptyLeg = {
  id: string;
  truckId: string;
  originName: string;
  destinationName: string;
  originLat: string | null;
  originLng: string | null;
  destinationLat: string | null;
  destinationLng: string | null;
  departureAt: string;
  arrivalAt: string | null;
  availableWeightKg: string;
  availableVolumeM3: string | null;
  maxDetourKm: string;
  acceptedCargoTypes: string[];
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
  truck?: Pick<
    Truck,
    "id" | "registrationNumber" | "equipmentType" | "status"
  >;
  stops?: LegStop[];
};

export type CreateEmptyLegInput = {
  truckId: string;
  originName: string;
  destinationName: string;
  originLat?: number | null;
  originLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  departureAt: string;
  arrivalAt?: string | null;
  availableWeightKg: number;
  availableVolumeM3?: number | null;
  maxDetourKm?: number;
  acceptedCargoTypes?: string[];
  status?: "DRAFT" | "ACTIVE";
};

export type UpdateEmptyLegInput =
  Partial<Omit<CreateEmptyLegInput, "truckId">>;
