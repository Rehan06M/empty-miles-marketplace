
import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateRoutePoints,
  calculateCapacityPoints,
  calculateTimePoints,
  rankEligibleMatches,
} from "./ranking.js";

import type {
  EligibleCandidate,
  RankingInput,
} from "./ranking.js";

const input: RankingInput = {
  loadWeightKg: 2500,
  loadVolumeM3: 12,

  pickupWindowStart: new Date(
    "2026-11-10T03:30:00.000Z"
  ),

  pickupWindowEnd: new Date(
    "2026-11-10T05:30:00.000Z"
  ),

  deliveryWindowStart: new Date(
    "2026-11-10T05:30:00.000Z"
  ),

  deliveryWindowEnd: new Date(
    "2026-11-10T11:30:00.000Z"
  ),
};

function makeCandidate(
  overrides: Partial<EligibleCandidate> = {}
): EligibleCandidate {
  return {
    emptyLegId: "truck-a",
    truckRegistration: "MH12TEST0001",
    equipmentType: "OPEN_BODY",

    originName: "Mumbai",
    destinationName: "Pune",

    departureAt:
      "2026-11-10T03:30:00.000Z",

    availableWeightKg: 8000,
    availableVolumeM3: 30,

    maxDetourKm: 40,
    additionalDistanceKm: 10,
    additionalDurationMinutes: 20,

    estimatedPickupAt:
      "2026-11-10T04:00:00.000Z",

    estimatedDeliveryAt:
      "2026-11-10T07:30:00.000Z",

    approximateLocations: true,
    locationVerification: "PROVISIONAL",

    explanations: [
      "Passed hard eligibility filters",
    ],

    ...overrides,
  };
}

test("route fit gives 35 points for zero detour", () => {
  assert.equal(calculateRoutePoints(0, 40), 35);
  assert.equal(calculateRoutePoints(0, 0), 35);
});

test("route fit decreases with detour utilization", () => {
  assert.equal(calculateRoutePoints(10, 40), 26.25);
  assert.equal(calculateRoutePoints(40, 40), 0);
});

test("capacity score stays within 0 to 20", () => {
  const score = calculateCapacityPoints(
    makeCandidate(),
    input
  );

  assert.ok(score >= 0);
  assert.ok(score <= 20);
});

test("time score stays within 0 to 25", () => {
  const score = calculateTimePoints(
    makeCandidate(),
    input
  );

  assert.ok(score >= 0);
  assert.ok(score <= 25);
});

test("better pre-price scores rank first", () => {
  const lower = makeCandidate({
    emptyLegId: "lower",
    additionalDistanceKm: 30,
  });

  const higher = makeCandidate({
    emptyLegId: "higher",
    additionalDistanceKm: 0,
  });

  const ranked = rankEligibleMatches(
    [lower, higher],
    input
  );

  assert.equal(ranked[0].emptyLegId, "higher");
  assert.equal(ranked[0].ranking.rank, 1);
  assert.equal(ranked[1].ranking.rank, 2);
});

test("ranking returns at most five candidates", () => {
  const candidates = Array.from(
    { length: 8 },
    (_, index) =>
      makeCandidate({
        emptyLegId: `truck-${index}`,
        additionalDistanceKm: index,
      })
  );

  const ranked = rankEligibleMatches(
    candidates,
    input
  );

  assert.equal(ranked.length, 5);
});

test("price and final score remain unavailable", () => {
  const [ranked] = rankEligibleMatches(
    [makeCandidate()],
    input
  );

  assert.equal(ranked.ranking.pricePoints, null);
  assert.equal(ranked.ranking.finalScore, null);
  assert.equal(ranked.ranking.prePriceMaximum, 80);

  assert.ok(ranked.ranking.prePricePoints <= 80);
});

test("empty candidate list remains empty", () => {
  assert.deepEqual(rankEligibleMatches([], input), []);
});
