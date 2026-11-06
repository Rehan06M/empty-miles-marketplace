
import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateEmissions,
  EMISSION_ASSUMPTIONS,
} from "./emissions.js";

const baseInput = {
  dedicatedDistanceKm: 100,
  additionalDetourKm: 10,
  sharedLoadedDistanceKm: 70,
  loadWeightKg: 2500,
};

test("uses the configured diesel CO2 factor", () => {
  assert.equal(
    EMISSION_ASSUMPTIONS.dieselCo2KgPerLitre,
    2.69
  );
});

test("calculates dedicated-trip emissions", () => {
  const result = calculateEmissions(baseInput);

  assert.equal(result.dedicatedFuelLitres, 31);
  assert.equal(result.dedicatedCo2Kg, 83.39);
});

test("includes detour and load-related emissions", () => {
  const result = calculateEmissions(baseInput);

  assert.equal(
    result.sharedIncrementalFuelLitres,
    4.9
  );

  assert.equal(
    result.sharedIncrementalCo2Kg,
    13.18
  );
});

test("calculates positive estimated CO2 savings", () => {
  const result = calculateEmissions(baseInput);

  assert.equal(result.co2SavedKg, 70.21);
  assert.equal(result.additionalCo2Kg, 0);
  assert.equal(result.netAvoidedCo2Kg, 70.21);
});

test("zero detour still has cargo-weight emissions", () => {
  const result = calculateEmissions({
    ...baseInput,
    additionalDetourKm: 0,
  });

  assert.ok(
    result.sharedIncrementalCo2Kg > 0
  );
});

test("negative savings are reported as added emissions", () => {
  const result = calculateEmissions({
    dedicatedDistanceKm: 10,
    additionalDetourKm: 50,
    sharedLoadedDistanceKm: 10,
    loadWeightKg: 1000,
  });

  assert.ok(result.netAvoidedCo2Kg < 0);
  assert.equal(result.co2SavedKg, 0);
  assert.ok(result.additionalCo2Kg > 0);
});

test("invalid negative distance is rejected", () => {
  assert.throws(() =>
    calculateEmissions({
      ...baseInput,
      additionalDetourKm: -1,
    })
  );
});

test("invalid shipment weight is rejected", () => {
  assert.throws(() =>
    calculateEmissions({
      ...baseInput,
      loadWeightKg: 0,
    })
  );
});

test("non-finite inputs are rejected", () => {
  assert.throws(() =>
    calculateEmissions({
      ...baseInput,
      sharedLoadedDistanceKm: Infinity,
    })
  );
});

test("model boundary and assumptions are explicit", () => {
  const result = calculateEmissions(baseInput);

  assert.equal(
    result.emissionBoundary,
    "TAILPIPE_CO2"
  );

  assert.equal(
    result.estimateType,
    "ILLUSTRATIVE"
  );

  assert.ok(result.limitations.length > 0);
});
