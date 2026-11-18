import type {
  BookingStatus,
} from "./booking";

export type AdminUserRole =
  | "SHIPPER"
  | "CARRIER"
  | "ADMIN";

export type AdminUserStatus =
  | "ACTIVE"
  | "SUSPENDED";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
  role: AdminUserRole;
  status: AdminUserStatus;
  createdAt: string;
};

export type AdminModerationAction = {
  id: string;
  adminId: string;
  targetUserId: string;
  targetEmailSnapshot: string;
  previousStatus: AdminUserStatus;
  nextStatus: AdminUserStatus;
  reason: string;
  createdAt: string;
};

export type AdminPage<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

export type AdminOverview = {
  asOf: string;

  totals: {
    shippers: number;
    carriers: number;
    suspended: number;
    loads: number;
    activeLoads: number;
    journeys: number;
    activeJourneys: number;
    bookings: number;
    liveReservations: number;
  };

  recentLoads: Array<{
    id: string;
    pickupName: string;
    deliveryName: string;
    status: string;
    cargoType: string;
    weightKg: string;
    createdAt: string;
    shipper: {
      name: string;
    };
  }>;

  recentJourneys: Array<{
    id: string;
    originName: string;
    destinationName: string;
    status: string;
    departureAt: string;
    availableWeightKg: string;
    truck: {
      registrationNumber: string;
      carrier: {
        name: string;
      };
    };
  }>;

  recentBookings: Array<{
    id: string;
    status: BookingStatus;
    pickupName: string;
    deliveryName: string;
    requestedAt: string;
    quotedPriceInr: string | null;
    shipper: {
      name: string;
    };
    emptyLeg: {
      truck: {
        registrationNumber: string;
      };
    };
  }>;
};