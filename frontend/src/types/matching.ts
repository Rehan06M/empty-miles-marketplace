
export type PricingEstimate = {
  currency: "INR";
  estimateType: "ILLUSTRATIVE";

  dedicatedDistanceKm: number;
  loadWeightTonnes: number;

  dedicatedPriceInr: number;
  incrementalDetourCostInr: number;

  carrierEarningsInr: number;
  platformFeeInr: number;
  marketplacePriceInr: number;

  shipperSavingsInr: number;
  savingsPercentage: number;

  assumptions: {
    dedicatedDispatchInr: number;
    dedicatedPerKmInr: number;
    dedicatedPerTonneKmInr: number;
    carrierBaseInr: number;
    carrierPerTonneKmInr: number;
    detourPerKmInr: number;
    detourPerMinuteInr: number;
    platformFeeRate: number;
  };

  limitations: string[];
};

export type RankingBreakdown = {
  rank: number;

  routePoints: number;
  timePoints: number;
  capacityPoints: number;
  pricePoints: number;

  prePricePoints: number;
  prePriceMaximum: 80;

  finalScore: number;

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
  pricing: PricingEstimate;
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
  basis: "FULL_ESTIMATED";

  weights: {
    route: 35;
    time: 25;
    capacity: 20;
    price: 20;
  };

  currentMaximum: 100;
  finalMaximum: 100;

  priceComponentAvailable: true;
  finalRankingAvailable: true;

  priceEstimateType: "ILLUSTRATIVE";

  method: string;
};

export type MatchingResponse = {
  loadId: string;
  matches: EligibleMatch[];

  checks: MatchingChecks;
  ranking: MatchingRankingInfo;

  message: string;
};
