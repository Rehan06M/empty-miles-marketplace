
export type InventoryCounts = {
  total: number;
  active: number;
};

export type AnalyticsBookingCounts = {
  total: number;

  PENDING_APPROVAL: number;
  CONFIRMED: number;
  IN_TRANSIT: number;
  COMPLETED: number;
  REJECTED: number;
  CANCELLED: number;
  EXPIRED: number;

  activeReservations: number;
};

export type AnalyticsMonth = {
  month: string;
  requests: number;
};

export type AnalyticsOverview = {
  role: "SHIPPER" | "CARRIER";
  asOf: string;

  inventory: {
    loads: InventoryCounts | null;
    trucks: InventoryCounts | null;
    journeys: InventoryCounts | null;
  };

  bookings: AnalyticsBookingCounts;

  monthlyRequests: AnalyticsMonth[];

  financials: {
    currency: "INR";
    estimateType: "ILLUSTRATIVE";

    completedQuotedValueInr: number;
    completedQuotedCount: number;

    completedDedicatedBaselineInr: number;
    completedModeledSavingsInr: number;
    completedComparisonCount: number;

    completedCarrierEarningsInr: number;
    completedCarrierEarningsCount: number;
  };

  environmental: {
    estimateType: "ILLUSTRATIVE";
    emissionBoundary: "TAILPIPE_CO2";

    completedEstimatedAvoidedCo2Kg: number;
    completedEstimateCount: number;
  };

  notes: string[];
};
