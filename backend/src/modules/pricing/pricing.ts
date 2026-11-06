
import type {
  RankedCandidate,
  RankingBreakdown,
} from "../matching/ranking.js";

// ILLUSTRATIVE MVP PRICING ASSUMPTIONS.
// These are NOT live freight-market quotations.
export const PRICING_RATES = {
  dedicatedDispatchInr: 600,
  dedicatedPerKmInr: 20,
  dedicatedPerTonneKmInr: 2,

  carrierBaseInr: 350,
  carrierPerTonneKmInr: 5,

  detourPerKmInr: 18,
  detourPerMinuteInr: 1.5,

  platformFeeRate: 0.10,
} as const;

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

  // Signed: negative means marketplace costs more.
  shipperSavingsInr: number;
  savingsPercentage: number;

  assumptions: typeof PRICING_RATES;

  limitations: string[];
};

export type PricedRanking = Omit<
  RankingBreakdown,
  "pricePoints" | "finalScore"
> & {
  pricePoints: number;
  finalScore: number;
};

export type PricedCandidate = Omit<
  RankedCandidate,
  "ranking"
> & {
  ranking: PricedRanking;
  pricing: PricingEstimate;
};

export type PricingInput = {
  loadWeightKg: number;
  dedicatedDistanceKm: number;
};

function roundRupees(value: number): number {
  return Math.round(value);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function ensureNonnegative(
  value: number,
  field: string
): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid pricing input: ${field}`);
  }
}

export function calculatePricing(
  dedicatedDistanceKm: number,
  loadWeightKg: number,
  additionalDistanceKm: number,
  additionalDurationMinutes: number
): PricingEstimate {
  ensureNonnegative(
    dedicatedDistanceKm,
    "dedicated distance"
  );
  ensureNonnegative(
    additionalDistanceKm,
    "additional distance"
  );
  ensureNonnegative(
    additionalDurationMinutes,
    "additional duration"
  );

  if (
    !Number.isFinite(loadWeightKg) ||
    loadWeightKg <= 0
  ) {
    throw new Error(
      "Invalid pricing input: shipment weight"
    );
  }

  const r = PRICING_RATES;
  const tonnes = loadWeightKg / 1000;

  // Illustrative standalone dedicated-trip baseline.
  const dedicatedPriceInr = roundRupees(
    r.dedicatedDispatchInr +
    dedicatedDistanceKm * r.dedicatedPerKmInr +
    tonnes *
      dedicatedDistanceKm *
      r.dedicatedPerTonneKmInr
  );

  // Additional operating costs caused by the detour.
  const incrementalDetourCostInr = roundRupees(
    additionalDistanceKm * r.detourPerKmInr +
    additionalDurationMinutes *
      r.detourPerMinuteInr
  );

  // Earnings for carrying freight on an existing trip.
  const carrierEarningsInr = roundRupees(
    r.carrierBaseInr +
    tonnes *
      dedicatedDistanceKm *
      r.carrierPerTonneKmInr +
    incrementalDetourCostInr
  );

  const platformFeeInr = roundRupees(
    carrierEarningsInr * r.platformFeeRate
  );

  const marketplacePriceInr =
    carrierEarningsInr + platformFeeInr;

  // May be negative. Never force artificial savings.
  const shipperSavingsInr =
    dedicatedPriceInr - marketplacePriceInr;

  const savingsPercentage =
    dedicatedPriceInr > 0
      ? round2(
          (shipperSavingsInr / dedicatedPriceInr) *
            100
        )
      : 0;

  return {
    currency: "INR",
    estimateType: "ILLUSTRATIVE",

    dedicatedDistanceKm:
      round2(dedicatedDistanceKm),

    loadWeightTonnes: round2(tonnes),

    dedicatedPriceInr,
    incrementalDetourCostInr,
    carrierEarningsInr,
    platformFeeInr,
    marketplacePriceInr,

    shipperSavingsInr,
    savingsPercentage,

    assumptions: PRICING_RATES,

    limitations: [
      "This is an illustrative MVP estimate, not a binding quote.",
      "Prices use project-defined assumptions, not live market tariffs.",
      "Tolls, GST, insurance, live fuel prices and contractual charges are not separately calculated.",
      "Road distances use the generic HGV profile and available location coordinates.",
      "Actual loading addresses and vehicle restrictions require verification.",
    ],
  };
}

export function calculatePricePoints(
  pricing: PricingEstimate
): number {
  if (pricing.dedicatedPriceInr <= 0) {
    return 0;
  }

  const savingsRatio =
    pricing.shipperSavingsInr /
    pricing.dedicatedPriceInr;

  return round2(20 * clamp01(savingsRatio));
}

// Only candidates that passed hard eligibility
// and received Step 18 pre-price scores are accepted.
//
// IMPORTANT: Re-sort AFTER adding price points.
// The top five must be chosen using all 100 points.
export function rankPricedMatches(
  candidates: RankedCandidate[],
  input: PricingInput,
  limit = 5
): PricedCandidate[] {
  const priced: PricedCandidate[] = candidates.map(
    (candidate) => {
      const pricing = calculatePricing(
        input.dedicatedDistanceKm,
        input.loadWeightKg,
        candidate.additionalDistanceKm,
        candidate.additionalDurationMinutes
      );

      const pricePoints =
        calculatePricePoints(pricing);

      const finalScore = round2(
        candidate.ranking.prePricePoints +
          pricePoints
      );

      return {
        ...candidate,

        pricing,

        ranking: {
          ...candidate.ranking,

          pricePoints,
          finalScore,

          explanations: [
            ...candidate.ranking.explanations.filter(
              (text) =>
                !text.startsWith(
                  "Price advantage is not scored."
                )
            ),

            `Price advantage: ${pricePoints.toFixed(2)} of 20 points, based on the modeled marketplace price compared with the illustrative dedicated-trip baseline.`,

            "The total score includes all four components, but pricing assumptions are illustrative.",
          ],
        },
      };
    }
  );

  priced.sort((a, b) => {
    const scoreDifference =
      b.ranking.finalScore -
      a.ranking.finalScore;

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    const detourDifference =
      a.additionalDistanceKm -
      b.additionalDistanceKm;

    if (detourDifference !== 0) {
      return detourDifference;
    }

    const pickupDifference =
      new Date(a.estimatedPickupAt).getTime() -
      new Date(b.estimatedPickupAt).getTime();

    if (pickupDifference !== 0) {
      return pickupDifference;
    }

    return a.emptyLegId.localeCompare(b.emptyLegId);
  });

  return priced
    .slice(0, Math.max(0, limit))
    .map((candidate, index) => ({
      ...candidate,

      ranking: {
        ...candidate.ranking,
        rank: index + 1,
      },
    }));
}
