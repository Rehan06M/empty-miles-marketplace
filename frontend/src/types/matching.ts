
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
};

export type MatchingChecks = {
  retrievedJourneys: number;
  prefilteredCandidates: number;
  routingChecks: number;
  routingFailures: number;
  missingCoordinates: number;
  truncated: boolean;
  partialResults: boolean;
};

export type MatchingResponse = {
  loadId: string;
  matches: EligibleMatch[];
  checks: MatchingChecks;
  message: string;
};
