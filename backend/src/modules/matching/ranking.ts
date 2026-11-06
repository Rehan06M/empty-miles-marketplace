
export type EligibleCandidate = {
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

export type RankingInput = {
  loadWeightKg: number;
  loadVolumeM3: number;

  pickupWindowStart: Date;
  pickupWindowEnd: Date;

  deliveryWindowStart: Date | null;
  deliveryWindowEnd: Date | null;
};

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

export type RankedCandidate = EligibleCandidate & {
  ranking: RankingBreakdown;
};

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Route fit: maximum 35 points.
//
// Lower detour utilization is preferred.
// Zero detour with zero allowance is fully compatible.
export function calculateRoutePoints(
  additionalDistanceKm: number,
  maxDetourKm: number
): number {
  if (
    !Number.isFinite(additionalDistanceKm) ||
    !Number.isFinite(maxDetourKm) ||
    additionalDistanceKm < 0 ||
    maxDetourKm < 0
  ) {
    throw new Error("Invalid route scoring inputs");
  }

  if (maxDetourKm === 0) {
    return additionalDistanceKm === 0 ? 35 : 0;
  }

  const utilization =
    additionalDistanceKm / maxDetourKm;

  return round2(35 * (1 - clamp(utilization)));
}

// Earlier feasible arrival leaves more deadline slack.
// The hard matching filters already establish feasibility.
function deadlineSlack(
  estimatedTime: Date,
  windowStart: Date,
  windowEnd: Date
): number {
  const duration =
    windowEnd.getTime() - windowStart.getTime();

  if (duration <= 0) {
    return 0;
  }

  const remaining =
    windowEnd.getTime() - estimatedTime.getTime();

  return clamp(remaining / duration);
}

// Time compatibility: maximum 25 points.
//
// Pickup timing always contributes.
// If there is a delivery deadline, pickup and delivery
// contribute equally.
export function calculateTimePoints(
  candidate: EligibleCandidate,
  input: RankingInput
): number {
  const pickupTime = new Date(
    candidate.estimatedPickupAt
  );

  const pickupSlack = deadlineSlack(
    pickupTime,
    input.pickupWindowStart,
    input.pickupWindowEnd
  );

  let combined = pickupSlack;

  if (input.deliveryWindowEnd !== null) {
    const deliveryTime = new Date(
      candidate.estimatedDeliveryAt
    );

    const deliveryStart =
      input.deliveryWindowStart ??
      input.pickupWindowStart;

    const deliverySlack = deadlineSlack(
      deliveryTime,
      deliveryStart,
      input.deliveryWindowEnd
    );

    combined = (pickupSlack + deliverySlack) / 2;
  }

  return round2(25 * clamp(combined));
}

// Capacity utilization: maximum 20 points.
//
// A tighter positive fit is preferred after hard
// eligibility checks have already passed.
export function calculateCapacityPoints(
  candidate: EligibleCandidate,
  input: RankingInput
): number {
  if (
    candidate.availableWeightKg <= 0 ||
    candidate.availableVolumeM3 <= 0
  ) {
    return 0;
  }

  const weightUtilization = clamp(
    input.loadWeightKg /
      candidate.availableWeightKg
  );

  const volumeUtilization = clamp(
    input.loadVolumeM3 /
      candidate.availableVolumeM3
  );

  return round2(
    20 *
      (weightUtilization + volumeUtilization) /
      2
  );
}

function scoreCandidate(
  candidate: EligibleCandidate,
  input: RankingInput
): RankedCandidate {
  const routePoints = calculateRoutePoints(
    candidate.additionalDistanceKm,
    candidate.maxDetourKm
  );

  const timePoints = calculateTimePoints(
    candidate,
    input
  );

  const capacityPoints = calculateCapacityPoints(
    candidate,
    input
  );

  const prePricePoints = round2(
    routePoints + timePoints + capacityPoints
  );

  const scoringExplanations = [
    `Route fit: ${routePoints.toFixed(2)} of 35 points. Additional detour is ${candidate.additionalDistanceKm.toFixed(2)} km against a ${candidate.maxDetourKm.toFixed(2)} km allowance.`,

    `Time compatibility: ${timePoints.toFixed(2)} of 25 points, based on remaining pickup and applicable delivery deadline slack.`,

    `Capacity utilization: ${capacityPoints.toFixed(2)} of 20 points, based on shipment weight and volume relative to advertised space.`,

    "Price advantage is not scored. The final 20-point pricing component is reserved for Step 19.",
  ];

  return {
    ...candidate,

    ranking: {
      rank: 0,

      routePoints,
      timePoints,
      capacityPoints,

      pricePoints: null,

      prePricePoints,
      prePriceMaximum: 80,

      finalScore: null,

      explanations: scoringExplanations,
    },
  };
}

// Rank already-eligible candidates only.
//
// This function does not decide hard eligibility,
// pricing, bookings or capacity reservations.
export function rankEligibleMatches(
  candidates: EligibleCandidate[],
  input: RankingInput,
  limit = 5
): RankedCandidate[] {
  const scored = candidates.map((candidate) =>
    scoreCandidate(candidate, input)
  );

  scored.sort((a, b) => {
    // Primary comparison: highest pre-price points.
    const scoreDifference =
      b.ranking.prePricePoints -
      a.ranking.prePricePoints;

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    // Tie: prefer the smaller additional detour.
    const detourDifference =
      a.additionalDistanceKm -
      b.additionalDistanceKm;

    if (detourDifference !== 0) {
      return detourDifference;
    }

    // Tie: prefer earlier feasible pickup.
    const pickupDifference =
      new Date(a.estimatedPickupAt).getTime() -
      new Date(b.estimatedPickupAt).getTime();

    if (pickupDifference !== 0) {
      return pickupDifference;
    }

    // Stable final tie-breaker.
    return a.emptyLegId.localeCompare(b.emptyLegId);
  });

  return scored.slice(0, Math.max(0, limit)).map(
    (candidate, index) => ({
      ...candidate,

      ranking: {
        ...candidate.ranking,
        rank: index + 1,
      },
    })
  );
}
