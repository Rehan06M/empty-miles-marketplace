
export const EMISSION_ASSUMPTIONS = {
  dieselCo2KgPerLitre: 2.69,
  baseFuelLitresPerKm: 0.28,
  extraFuelLitresPerTonneKm: 0.012,
} as const;

export type EmissionsInput = {
  dedicatedDistanceKm: number;
  additionalDetourKm: number;
  sharedLoadedDistanceKm: number;
  loadWeightKg: number;
};

export type EmissionsEstimate = {
  estimateType: "ILLUSTRATIVE";
  emissionBoundary: "TAILPIPE_CO2";

  dedicatedDistanceKm: number;
  additionalDetourKm: number;
  sharedLoadedDistanceKm: number;
  loadWeightTonnes: number;

  dedicatedFuelLitres: number;
  sharedIncrementalFuelLitres: number;

  dedicatedCo2Kg: number;
  sharedIncrementalCo2Kg: number;

  // Signed value: negative means increased emissions.
  netAvoidedCo2Kg: number;

  // Positive avoided emissions, zero if no benefit.
  co2SavedKg: number;

  // Positive emissions increase, zero otherwise.
  additionalCo2Kg: number;

  savingsPercentage: number;

  assumptions: typeof EMISSION_ASSUMPTIONS;
  limitations: string[];
};

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function validateNonnegative(
  value: number,
  name: string
): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(
      `Invalid emissions input: ${name}`
    );
  }
}

export function calculateEmissions(
  input: EmissionsInput
): EmissionsEstimate {
  validateNonnegative(
    input.dedicatedDistanceKm,
    "dedicatedDistanceKm"
  );

  validateNonnegative(
    input.additionalDetourKm,
    "additionalDetourKm"
  );

  validateNonnegative(
    input.sharedLoadedDistanceKm,
    "sharedLoadedDistanceKm"
  );

  if (
    !Number.isFinite(input.loadWeightKg) ||
    input.loadWeightKg <= 0
  ) {
    throw new Error(
      "Invalid emissions input: loadWeightKg"
    );
  }

  const tonnes = input.loadWeightKg / 1000;
  const a = EMISSION_ASSUMPTIONS;

  // Hypothetical separate trip for this shipment.
  const dedicatedFuelLitres =
    input.dedicatedDistanceKm *
    (
      a.baseFuelLitresPerKm +
      tonnes * a.extraFuelLitresPerTonneKm
    );

  // Incremental fuel consumption when using the
  // carrier's existing journey.
  //
  // Component 1: driving extra detour kilometres.
  // Component 2: carrying additional freight weight
  // along the pickup-to-delivery section.
  const sharedIncrementalFuelLitres =
    input.additionalDetourKm *
      a.baseFuelLitresPerKm +
    input.sharedLoadedDistanceKm *
      tonnes *
      a.extraFuelLitresPerTonneKm;

  const dedicatedCo2Kg =
    dedicatedFuelLitres *
    a.dieselCo2KgPerLitre;

  const sharedIncrementalCo2Kg =
    sharedIncrementalFuelLitres *
    a.dieselCo2KgPerLitre;

  const netAvoidedCo2Kg =
    dedicatedCo2Kg -
    sharedIncrementalCo2Kg;

  const savingsPercentage =
    dedicatedCo2Kg > 0
      ? netAvoidedCo2Kg /
        dedicatedCo2Kg * 100
      : 0;

  return {
    estimateType: "ILLUSTRATIVE",
    emissionBoundary: "TAILPIPE_CO2",

    dedicatedDistanceKm:
      round2(input.dedicatedDistanceKm),

    additionalDetourKm:
      round2(input.additionalDetourKm),

    sharedLoadedDistanceKm:
      round2(input.sharedLoadedDistanceKm),

    loadWeightTonnes: round2(tonnes),

    dedicatedFuelLitres:
      round2(dedicatedFuelLitres),

    sharedIncrementalFuelLitres:
      round2(sharedIncrementalFuelLitres),

    dedicatedCo2Kg:
      round2(dedicatedCo2Kg),

    sharedIncrementalCo2Kg:
      round2(sharedIncrementalCo2Kg),

    netAvoidedCo2Kg:
      round2(netAvoidedCo2Kg),

    co2SavedKg:
      round2(Math.max(0, netAvoidedCo2Kg)),

    additionalCo2Kg:
      round2(Math.max(0, -netAvoidedCo2Kg)),

    savingsPercentage:
      round2(savingsPercentage),

    assumptions: EMISSION_ASSUMPTIONS,

    limitations: [
      "Illustrative calculation, not measured or certified carbon savings.",
      "Assumes the carrier's original journey would happen without this shipment.",
      "Uses a hypothetical dedicated diesel-truck alternative.",
      "Fuel efficiency and additional load consumption are model assumptions.",
      "Includes direct diesel combustion CO2 only, not full lifecycle CO2e.",
      "Actual vehicle fuel use, loading addresses, traffic and terrain may differ.",
      "Emissions are not recorded as realized savings until transport is verified.",
    ],
  };
}
