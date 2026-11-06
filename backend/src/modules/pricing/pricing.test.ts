
import assert from "node:assert/strict";
import test from "node:test";

import {
  calculatePricing,
  calculatePricePoints,
  rankPricedMatches,
} from "./pricing.js";

import type {
  RankedCandidate,
} from "../matching/ranking.js";

test("calculates all pricing components", () => {
  const price = calculatePricing(
    100,  // Dedicated shipment distance (km)
    2500, // Shipment weight (kg)
    10,   // Extra detour (km)
    20    // Extra detour (minutes)
  );

  assert.equal(price.dedicatedPriceInr, 3100);
  assert.equal(
    price.incrementalDetourCostInr,
    210
  );
  assert.equal(price.carrierEarningsInr, 1810);
  assert.equal(price.platformFeeInr, 181);
  assert.equal(price.marketplacePriceInr, 1991);
  assert.equal(price.shipperSavingsInr, 1109);

  assert.equal(price.currency, "INR");
  assert.equal(
    price.estimateType,
    "ILLUSTRATIVE"
  );
});

test("platform fee is included exactly once", () => {
  const price = calculatePricing(100, 2500, 10, 20);

  assert.equal(
    price.marketplacePriceInr,
    price.carrierEarningsInr +
      price.platformFeeInr
  );
});

test("negative savings are not hidden", () => {
  const price = calculatePricing(5, 100, 100, 100);

  assert.ok(price.shipperSavingsInr < 0);

  assert.equal(calculatePricePoints(price), 0);
});

test("price points stay between 0 and 20", () => {
  const price = calculatePricing(100, 2500, 10, 20);

  const points = calculatePricePoints(price);

  assert.ok(points >= 0);
  assert.ok(points <= 20);
});

test("zero detour has zero incremental cost", () => {
  const price = calculatePricing(100, 2500, 0, 0);

  assert.equal(price.incrementalDetourCostInr, 0);
});

test("invalid pricing inputs are rejected", () => {
  assert.throws(
    () => calculatePricing(-1, 2500, 10, 20)
  );

  assert.throws(
    () => calculatePricing(100, 0, 10, 20)
  );

  assert.throws(
    () => calculatePricing(100, 2500, -10, 20)
  );
});

function candidate(
  id: string,
  detourKm: number
): RankedCandidate {
  return {
    emptyLegId: id,
    truckRegistration: `MH12TEST${id}`,
    equipmentType: "OPEN_BODY",

    originName: "Mumbai",
    destinationName: "Pune",
    departureAt: "2026-11-10T03:30:00.000Z",

    availableWeightKg: 8000,
    availableVolumeM3: 30,
    maxDetourKm: 40,

    additionalDistanceKm: detourKm,
    additionalDurationMinutes: 20,
    sharedLoadedDistanceKm: 70,

    estimatedPickupAt:
      "2026-11-10T04:00:00.000Z",
    estimatedDeliveryAt:
      "2026-11-10T07:30:00.000Z",

    approximateLocations: true,
    locationVerification: "PROVISIONAL",
    explanations: [],

    ranking: {
      rank: 1,
      routePoints: 20,
      timePoints: 18,
      capacityPoints: 12,
      pricePoints: null,
      prePricePoints: 50,
      prePriceMaximum: 80,
      finalScore: null,
      explanations: [
        "Price advantage is not scored. The final 20-point pricing component is reserved for Step 19.",
      ],
    },
  };
}

test("adds price points to the existing score", () => {
  const results = rankPricedMatches(
    [candidate("a", 10)],
    {
      dedicatedDistanceKm: 100,
      loadWeightKg: 2500,
    }
  );

  assert.equal(results.length, 1);

  assert.equal(
    results[0].ranking.finalScore,
    Math.round(
      (
        results[0].ranking.prePricePoints +
        results[0].ranking.pricePoints
      ) * 100
    ) / 100
  );
});

test("reprices and reranks the full candidate set", () => {
  const expensive = candidate("expensive", 30);
  const affordable = candidate("affordable", 0);

  const results = rankPricedMatches(
    [expensive, affordable],
    {
      dedicatedDistanceKm: 100,
      loadWeightKg: 2500,
    }
  );

  assert.equal(results.length, 2);
  assert.equal(results[0].emptyLegId, "affordable");
  assert.equal(results[0].ranking.rank, 1);

  assert.ok(
    results[0].ranking.finalScore >=
    results[1].ranking.finalScore
  );
});

test("returns no more than five results", () => {
  const candidates = Array.from(
    { length: 8 },
    (_, i) => candidate(`truck-${i}`, i)
  );

  const results = rankPricedMatches(
    candidates,
    {
      dedicatedDistanceKm: 100,
      loadWeightKg: 2500,
    },
    5
  );

  assert.equal(results.length, 5);
});

test("empty input stays empty", () => {
  assert.deepEqual(
    rankPricedMatches(
      [],
      {
        dedicatedDistanceKm: 100,
        loadWeightKg: 2500,
      }
    ),
    []
  );
});
