
export type RankingBreakdown = {
  rank: number;

  routePoints: number;
  timePoints: number;
  capacityPoints: number;

  pricePoints: null;

  prePricePoints: number;
  prePriceMaximum: 80;

  finalScore: null;

  explanations: string[];
};

export type EligibleMatch = {
  emptyLegId: string;
  truckRegistration: string;
  equipmentType: string;

  originName: string;
  destinationName: string;
  departureAt: string;

  availableWeightKg: number;
  availableVolumeM3: number;

  maxDetourKm: number;
  additionalDistanceKm: number;
  additionalDurationMinutes: number;

  estimatedPickupAt: string;
  estimatedDeliveryAt: string;

  approximateLocations: boolean;

  locationVerification:
    | "PROVISIONAL"
    | "EXACT_COORDINATES";

  explanations: string[];

  ranking: RankingBreakdown;
};

export type MatchingChecks = {
  retrievedJourneys: number;
  prefilteredCandidates: number;

  routingChecks: number;
  routingFailures: number;
  missingCoordinates: number;

  truncated: boolean;
  partialResults: boolean;

  eligibleBeforeRanking: number;
  returnedMatches: number;
};

export type MatchingRankingInfo = {
  basis: "PRE_PRICE";

  weights: {
    route: 35;
    time: 25;
    capacity: 20;
    price: 20;
  };

  currentMaximum: 80;
  finalMaximum: 100;

  priceComponentAvailable: false;
  finalRankingAvailable: false;

  method: string;
};

export type MatchingResponse = {
  loadId: string;

  matches: EligibleMatch[];

  checks: MatchingChecks;

  ranking: MatchingRankingInfo;

  message: string;
};
