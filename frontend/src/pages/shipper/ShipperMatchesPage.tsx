
import { useEffect, useState } from "react";
import {
    ArrowRight,
    Search,
    Truck,
    MapPin,
    Clock3,
    AlertTriangle,
    Leaf,
} from "lucide-react";

import { Link } from "react-router-dom";

import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { DashboardPanel } from "../../components/dashboard/DashboardPanel";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

import { getLoads } from "../../services/loadApi";
import { findEligibleTrucks } from "../../services/matchingApi";

import type { ShipmentLoad } from "../../types/load";
import type {
    MatchingResponse,
    EligibleMatch,
} from "../../types/matching";

function showDate(value: string): string {
    return new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function errorMessage(error: unknown): string {
    return error instanceof Error
        ? error.message
        : "Unexpected error while searching for trucks";
}

function ScoreBreakdown({
    match,
}: {
    match: EligibleMatch;
}) {
    const score = match.ranking;

    const components = [
        {
            label: "Route fit",
            points: score.routePoints,
            maximum: 35,
        },
        {
            label: "Time compatibility",
            points: score.timePoints,
            maximum: 25,
        },
        {
            label: "Capacity utilization",
            points: score.capacityPoints,
            maximum: 20,
        },
        {
            label: "Price advantage",
            points: score.pricePoints,
            maximum: 20,
        },
    ];

    return (
        <div className="mt-5 rounded-xl border border-line bg-canvas p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                        Estimated Match Ranking
                    </p>

                    <p className="mt-2 text-2xl font-semibold text-ink">
                        {score.finalScore.toFixed(2)}
                        <span className="ml-1 text-sm font-normal text-muted">
                            / 100 points
                        </span>
                    </p>
                </div>

                <Badge variant="info">
                    Rank #{score.rank}
                </Badge>
            </div>

            <div className="mt-5 space-y-4">
                {components.map((component) => (
                    <div key={component.label}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="text-xs font-medium text-ink">
                                {component.label}
                            </span>

                            <span className="font-mono text-xs text-muted">
                                {component.points.toFixed(2)}
                                {" / "}
                                {component.maximum}
                            </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-[#E5E5E5]">
                            <div
                                className="h-full rounded-full bg-[#2F63FF]"
                                style={{
                                    width: `${Math.min(
                                        100,
                                        Math.max(
                                            0,
                                            component.points /
                                            component.maximum *
                                            100
                                        )
                                    )
                                        }%`,
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-5 space-y-2 border-t border-line pt-4">
                <p className="text-xs font-semibold text-ink">
                    How this score was calculated
                </p>

                {score.explanations.map((explanation) => (
                    <p
                        key={explanation}
                        className="text-xs leading-5 text-muted"
                    >
                        {explanation}
                    </p>
                ))}
            </div>

            <p className="mt-4 text-xs leading-5 text-muted">
                All four scoring components are calculated.
                The price component uses illustrative model
                assumptions, not verified market quotations.
                Ranking is limited to evaluated candidates.
            </p>
        </div>
    );
}


function PricingBreakdown({
    match,
}: {
    match: EligibleMatch;
}) {
    const price = match.pricing;
    const rates = price.assumptions;

    const money = (amount: number) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);

    const saving = price.shipperSavingsInr >= 0;

    return (
        <div className="mt-5 rounded-xl border border-line bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                        Estimated Marketplace Freight Price
                    </p>

                    <p className="mt-2 text-3xl font-semibold text-ink">
                        {money(price.marketplacePriceInr)}
                    </p>
                </div>

                <Badge variant="info">
                    Illustrative Estimate
                </Badge>
            </div>

            <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                    <span className="text-muted">
                        Dedicated-trip baseline
                    </span>
                    <strong className="text-ink">
                        {money(price.dedicatedPriceInr)}
                    </strong>
                </div>

                <div className="flex justify-between gap-3">
                    <span className="text-muted">
                        Incremental detour cost
                    </span>
                    <strong className="text-ink">
                        {money(price.incrementalDetourCostInr)}
                    </strong>
                </div>

                <div className="flex justify-between gap-3">
                    <span className="text-muted">
                        Carrier earnings
                    </span>
                    <strong className="text-ink">
                        {money(price.carrierEarningsInr)}
                    </strong>
                </div>

                <div className="flex justify-between gap-3">
                    <span className="text-muted">
                        Platform fee ({rates.platformFeeRate * 100}%)
                    </span>
                    <strong className="text-ink">
                        {money(price.platformFeeInr)}
                    </strong>
                </div>

                <div className="flex justify-between gap-3 border-t border-line pt-3">
                    <strong className="text-ink">
                        Marketplace price
                    </strong>
                    <strong className="text-brand">
                        {money(price.marketplacePriceInr)}
                    </strong>
                </div>

                <div className="rounded-lg bg-canvas p-3">
                    <p className="text-xs font-semibold text-ink">
                        {saving
                            ? "Estimated shipper savings"
                            : "Estimated additional cost"}
                    </p>

                    <p className="mt-1 text-xl font-semibold text-ink">
                        {money(Math.abs(price.shipperSavingsInr))}
                    </p>

                    <p className="mt-1 text-xs text-muted">
                        {Math.abs(price.savingsPercentage).toFixed(2)}%
                        {saving
                            ? " below the modeled dedicated-trip baseline"
                            : " above the modeled dedicated-trip baseline"}
                    </p>
                </div>
            </div>

            <details className="mt-5 border-t border-line pt-4">
                <summary className="cursor-pointer text-sm font-semibold text-brand">
                    View pricing assumptions and calculations
                </summary>

                <div className="mt-3 space-y-2 text-xs leading-5 text-muted">
                    <p>
                        Dedicated distance:{" "}
                        {price.dedicatedDistanceKm.toFixed(2)} km
                    </p>

                    <p>
                        Shipment weight:{" "}
                        {price.loadWeightTonnes.toFixed(2)} tonnes
                    </p>

                    <p>
                        Dedicated baseline = {money(rates.dedicatedDispatchInr)}
                        {" + "}{money(rates.dedicatedPerKmInr)}/km
                        {" + "}{money(rates.dedicatedPerTonneKmInr)}/tonne-km.
                    </p>

                    <p>
                        Detour cost = {money(rates.detourPerKmInr)}/km
                        {" + "}{money(rates.detourPerMinuteInr)}/minute
                        of additional driving.
                    </p>

                    <p>
                        Carrier earnings = {money(rates.carrierBaseInr)}
                        {" + "}{money(rates.carrierPerTonneKmInr)}/tonne-km
                        {" + detour cost."}
                    </p>

                    <p>
                        Platform fee = {rates.platformFeeRate * 100}%
                        of carrier earnings.
                    </p>

                    <p>
                        Marketplace price = carrier earnings + platform fee.
                    </p>

                    <div className="space-y-1 border-t border-line pt-3">
                        {price.limitations.map((limitation) => (
                            <p key={limitation}>
                                • {limitation}
                            </p>
                        ))}
                    </div>
                </div>
            </details>
        </div>
    );
}


function EmissionsBreakdown({
    match,
}: {
    match: EligibleMatch;
}) {
    const emissions = match.emissions;
    const assumptions = emissions.assumptions;

    const hasSavings =
        emissions.netAvoidedCo2Kg > 0;

    const hasIncrease =
        emissions.netAvoidedCo2Kg < 0;

    const headline = hasSavings
        ? "Potential CO₂ Avoided"
        : hasIncrease
            ? "Estimated Additional CO₂"
            : "No Estimated Net CO₂ Change";

    const headlineValue = hasSavings
        ? emissions.co2SavedKg
        : emissions.additionalCo2Kg;

    return (
        <div className="mt-5 rounded-xl border border-line bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Leaf
                        size={21}
                        className="text-emerald-700"
                    />

                    <h3 className="text-sm font-semibold text-ink">
                        Environmental Impact Estimate
                    </h3>
                </div>

                <Badge variant="info">
                    Illustrative Estimate
                </Badge>
            </div>

            <div className="mt-5 rounded-lg bg-canvas p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    {headline}
                </p>

                <p
                    className={[
                        "mt-2 text-3xl font-semibold",
                        hasSavings
                            ? "text-emerald-700"
                            : hasIncrease
                                ? "text-amber-700"
                                : "text-ink",
                    ].join(" ")}
                >
                    {headlineValue.toFixed(2)}
                    <span className="ml-2 text-sm font-medium">
                        kg CO₂
                    </span>
                </p>

                <p className="mt-2 text-xs leading-5 text-muted">
                    {hasSavings
                        ? `${emissions.savingsPercentage.toFixed(2)}% lower than the modeled dedicated-trip emissions.`
                        : hasIncrease
                            ? `${Math.abs(emissions.savingsPercentage).toFixed(2)}% higher than the modeled dedicated-trip emissions.`
                            : "The two modeled scenarios have equal emissions."}
                </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-line p-3">
                    <p className="text-xs text-muted">
                        Separate dedicated trip
                    </p>

                    <p className="mt-2 text-xl font-semibold text-ink">
                        {emissions.dedicatedCo2Kg.toFixed(2)}
                        <span className="ml-1 text-xs font-normal text-muted">
                            kg CO₂
                        </span>
                    </p>

                    <p className="mt-2 text-xs text-muted">
                        {emissions.dedicatedFuelLitres.toFixed(2)}
                        {" estimated litres of diesel"}
                    </p>
                </div>

                <div className="rounded-lg border border-line p-3">
                    <p className="text-xs text-muted">
                        Extra emissions using existing truck
                    </p>

                    <p className="mt-2 text-xl font-semibold text-ink">
                        {emissions.sharedIncrementalCo2Kg.toFixed(2)}
                        <span className="ml-1 text-xs font-normal text-muted">
                            kg CO₂
                        </span>
                    </p>

                    <p className="mt-2 text-xs text-muted">
                        {emissions.sharedIncrementalFuelLitres.toFixed(2)}
                        {" estimated additional litres"}
                    </p>
                </div>
            </div>

            <details className="mt-5 border-t border-line pt-4">
                <summary className="cursor-pointer text-sm font-semibold text-brand">
                    View CO₂ calculation and assumptions
                </summary>

                <div className="mt-4 space-y-3 text-xs leading-5 text-muted">
                    <p>
                        Dedicated shipment distance:{" "}
                        <strong>
                            {emissions.dedicatedDistanceKm.toFixed(2)} km
                        </strong>
                    </p>

                    <p>
                        Additional truck detour:{" "}
                        <strong>
                            {emissions.additionalDetourKm.toFixed(2)} km
                        </strong>
                    </p>

                    <p>
                        Pickup-to-delivery distance on shared journey:{" "}
                        <strong>
                            {emissions.sharedLoadedDistanceKm.toFixed(2)} km
                        </strong>
                    </p>

                    <p>
                        Shipment weight:{" "}
                        <strong>
                            {emissions.loadWeightTonnes.toFixed(2)}
                            {" tonnes"}
                        </strong>
                    </p>

                    <div className="space-y-2 border-t border-line pt-3">
                        <p className="font-semibold text-ink">
                            Model assumptions
                        </p>

                        <p>
                            Diesel CO₂ factor:{" "}
                            {assumptions.dieselCo2KgPerLitre}
                            {" kg CO₂ per litre"}
                        </p>

                        <p>
                            Baseline fuel consumption:{" "}
                            {assumptions.baseFuelLitresPerKm}
                            {" L/km"}
                        </p>

                        <p>
                            Additional load-related fuel consumption:{" "}
                            {assumptions.extraFuelLitresPerTonneKm}
                            {" L/tonne-km"}
                        </p>
                    </div>

                    <div className="space-y-2 border-t border-line pt-3">
                        <p className="font-semibold text-ink">
                            Calculation method
                        </p>

                        <p>
                            Dedicated emissions = modeled dedicated
                            diesel use × diesel CO₂ factor.
                        </p>

                        <p>
                            Shared incremental emissions =
                            additional detour fuel + load-related
                            fuel consumption on the existing journey.
                        </p>

                        <p>
                            Net avoided emissions = dedicated
                            emissions − shared incremental emissions.
                        </p>
                    </div>

                    <div className="space-y-2 border-t border-line pt-3">
                        <p className="font-semibold text-ink">
                            Limitations
                        </p>

                        {emissions.limitations.map((limitation) => (
                            <p key={limitation}>
                                • {limitation}
                            </p>
                        ))}
                    </div>
                </div>
            </details>

            <p className="mt-4 text-xs leading-5 text-muted">
                Estimated tailpipe CO₂ only. This is not a
                verified environmental saving, full lifecycle
                footprint, or carbon credit.
            </p>
        </div>
    );
}

function MatchCard({
    match,
}: {
    match: EligibleMatch;
}) {
    return (
        <div className="rounded-xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <Truck size={20} className="text-brand" />

                        <h3 className="text-base font-bold text-ink">
                            {match.truckRegistration}
                        </h3>
                    </div>

                    <p className="mt-2 text-sm text-muted">
                        {match.equipmentType.replaceAll("_", " ")}
                    </p>
                </div>

                <Badge
                    variant={
                        match.approximateLocations
                            ? "warning"
                            : "success"
                    }
                >
                    {match.approximateLocations
                        ? "Provisional location fit"
                        : "Coordinates available"}
                </Badge>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                <MapPin size={16} className="text-brand" />

                <span>{match.originName}</span>

                <ArrowRight
                    size={16}
                    className="text-brand"
                />

                <span>{match.destinationName}</span>
            </div>

            <div className="mt-5 grid gap-4 rounded-lg bg-canvas p-4 sm:grid-cols-2">
                <div>
                    <p className="text-xs text-muted">
                        Available weight
                    </p>
                    <p className="mt-1 font-semibold text-ink">
                        {match.availableWeightKg.toLocaleString(
                            "en-IN"
                        )} kg
                    </p>
                </div>

                <div>
                    <p className="text-xs text-muted">
                        Available volume
                    </p>
                    <p className="mt-1 font-semibold text-ink">
                        {match.availableVolumeM3.toLocaleString(
                            "en-IN"
                        )} m³
                    </p>
                </div>

                <div>
                    <p className="text-xs text-muted">
                        Additional road distance
                    </p>
                    <p className="mt-1 font-semibold text-ink">
                        {match.additionalDistanceKm.toFixed(2)} km
                    </p>
                </div>

                <div>
                    <p className="text-xs text-muted">
                        Maximum permitted detour
                    </p>
                    <p className="mt-1 font-semibold text-ink">
                        {match.maxDetourKm.toFixed(2)} km
                    </p>
                </div>
            </div>

            <div className="mt-5 space-y-2 text-sm text-muted">
                <p className="flex items-start gap-2">
                    <Clock3
                        size={16}
                        className="mt-0.5 shrink-0 text-brand"
                    />
                    <span>
                        Truck departure:{" "}
                        {showDate(match.departureAt)}
                    </span>
                </p>

                <p>
                    Estimated pickup:{" "}
                    <strong className="text-ink">
                        {showDate(match.estimatedPickupAt)}
                    </strong>
                </p>

                <p>
                    Estimated delivery:{" "}
                    <strong className="text-ink">
                        {showDate(match.estimatedDeliveryAt)}
                    </strong>
                </p>
            </div>

            <div className="mt-5 border-t border-line pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink">
                    Why this candidate passed
                </p>

                <ul className="mt-3 space-y-2">
                    {match.explanations.map((explanation) => (
                        <li
                            key={explanation}
                            className="flex gap-2 text-xs leading-5 text-muted"
                        >
                            <span className="font-bold text-brand">
                                ✓
                            </span>
                            <span>{explanation}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {match.approximateLocations && (
                <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <AlertTriangle
                        size={16}
                        className="mt-0.5 shrink-0 text-amber-700"
                    />
                    <p className="text-xs leading-5 text-amber-900">
                        One or more locations use approximate
                        city-center coordinates. Exact freight
                        addresses must be verified before treating
                        this as a confirmed geographic fit.
                    </p>
                </div>
            )}

            <ScoreBreakdown match={match} />
            <PricingBreakdown match={match} />
            <EmissionsBreakdown match={match} />

            <p className="mt-4 text-xs text-muted">
                This candidate passed the implemented hard eligibility
                filters. Its price and 100-point score are calculated
                from illustrative MVP assumptions, not a binding
                quotation. No booking, payment or capacity reservation
                has been created.
            </p>
        </div>
    );
}

export function ShipperMatchesPage() {
    const [loads, setLoads] = useState<ShipmentLoad[]>([]);
    const [selectedId, setSelectedId] = useState("");

    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);

    const [result, setResult] =
        useState<MatchingResponse | null>(null);

    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        getLoads()
            .then((records) => {
                if (!active) return;

                setLoads(records);

                const firstActive = records.find(
                    (load) => load.status === "ACTIVE"
                );

                setSelectedId(firstActive?.id ?? "");
            })
            .catch((err: unknown) => {
                if (active) {
                    setError(errorMessage(err));
                }
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    const activeLoads = loads.filter(
        (load) => load.status === "ACTIVE"
    );

    async function searchMatches() {
        if (!selectedId || searching) return;

        setSearching(true);
        setError("");
        setResult(null);

        try {
            const response =
                await findEligibleTrucks(selectedId);

            setResult(response);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSearching(false);
        }
    }

    return (
        <DashboardLayout
            role="shipper"
            title="FIND COMPATIBLE TRUCKS."
            description="Check your shipment against available carrier journeys, capacity, equipment, timing, and road detour requirements."
        >
            <div className="space-y-6">
                <DashboardPanel
                    title="Shipment Matching"
                    subtitle="Select a published shipment to evaluate"
                >
                    {loading ? (
                        <p
                            role="status"
                            className="text-sm text-muted"
                        >
                            Loading your shipments...
                        </p>
                    ) : activeLoads.length === 0 ? (
                        <div className="space-y-3">
                            <p className="text-sm text-muted">
                                You have no active shipments available
                                for matching.
                            </p>

                            <Link
                                to="/app/shipper/loads"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-brand"
                            >
                                Create or publish a shipment
                                <ArrowRight size={16} />
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <label className="block">
                                <span className="mb-2 block text-xs font-semibold text-ink">
                                    Choose Shipment
                                </span>

                                <select
                                    value={selectedId}
                                    disabled={searching}
                                    onChange={(event) => {
                                        setSelectedId(event.target.value);
                                        setResult(null);
                                        setError("");
                                    }}
                                    className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink"
                                >
                                    {activeLoads.map((load) => (
                                        <option
                                            key={load.id}
                                            value={load.id}
                                        >
                                            {load.pickupName} →{" "}
                                            {load.deliveryName} —{" "}
                                            {Number(
                                                load.weightKg
                                            ).toLocaleString("en-IN")} kg
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <Button
                                type="button"
                                disabled={searching || !selectedId}
                                onClick={() => void searchMatches()}
                            >
                                <Search size={17} />

                                {searching
                                    ? "Checking road and capacity compatibility..."
                                    : "Find Eligible Trucks"}
                            </Button>
                        </div>
                    )}

                    {error && (
                        <p
                            role="alert"
                            className="mt-4 text-sm text-red-700"
                        >
                            {error}
                        </p>
                    )}
                </DashboardPanel>

                {result && (
                    <>
                        <div className="rounded-xl border border-line bg-white p-4">
                            <p className="text-sm font-semibold text-ink">
                                Price-aware estimated match ranking
                            </p>

                            <p className="mt-2 text-xs leading-5 text-muted">
                                Each eligible truck also includes an illustrative
                                CO₂ impact comparison between a separate dedicated
                                shipment trip and the additional emissions of using
                                existing truck capacity. This environmental estimate
                                does not change the 100-point ranking.
                            </p>

                            <p className="mt-2 text-xs leading-5 text-muted">
                                Eligible trucks are ranked using route fit
                                (35 points), time compatibility (25 points),
                                capacity utilization (20 points), and modeled
                                price advantage (20 points).
                            </p>

                            <p className="mt-2 text-xs leading-5 text-muted">
                                Freight pricing is an illustrative calculation,
                                not a live quote. The search may be limited to
                                a subset of available truck journeys.
                            </p>

                            <p className="mt-2 text-xs leading-5 text-muted">
                                {result.checks.eligibleBeforeRanking}
                                {" eligible candidates were evaluated before the "}
                                five-result display limit.
                            </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded-xl border border-line bg-white p-5">
                                <p className="text-xs text-muted">
                                    Candidates passing filters
                                </p>

                                <p className="mt-2 text-3xl font-semibold text-ink">
                                    {result.matches.length}
                                </p>
                            </div>

                            <div className="rounded-xl border border-line bg-white p-5">
                                <p className="text-xs text-muted">
                                    Road checks completed
                                </p>

                                <p className="mt-2 text-3xl font-semibold text-brand">
                                    {result.checks.routingChecks}
                                </p>
                            </div>

                            <div className="rounded-xl border border-line bg-white p-5">
                                <p className="text-xs text-muted">
                                    Search completeness
                                </p>

                                <p className="mt-2 text-sm font-semibold text-ink">
                                    {result.checks.partialResults
                                        ? "Partial search"
                                        : "Checked retrieved candidates"}
                                </p>
                            </div>
                        </div>

                        {result.checks.partialResults && (
                            <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                                <AlertTriangle
                                    size={20}
                                    className="shrink-0 text-amber-700"
                                />

                                <p className="text-sm text-amber-900">
                                    This search is incomplete. Some
                                    candidates were not evaluated because
                                    of the routing limit, unavailable
                                    coordinates, or routing failures.
                                    More compatible trucks may exist.
                                </p>
                            </div>
                        )}

                        <DashboardPanel
                            title="Ranked Eligible Trucks"
                            subtitle="Up to five eligible candidates ordered using estimated route, time, capacity and price scores"
                        >
                            {result.matches.length === 0 ? (
                                <div className="py-8 text-center">
                                    <Truck
                                        size={32}
                                        className="mx-auto text-brand"
                                    />

                                    <h3 className="mt-4 font-semibold text-ink">
                                        No eligible candidates in this search
                                    </h3>

                                    <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">
                                        No evaluated truck passed all the
                                        eligibility checks. Check the cargo
                                        volume, equipment requirement,
                                        pickup windows, and carrier journey
                                        availability.
                                    </p>

                                    {result.checks.partialResults && (
                                        <p className="mt-2 text-xs text-amber-700">
                                            This is not proof that no matching
                                            truck exists in the marketplace.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {result.matches.map((match) => (
                                        <MatchCard
                                            key={match.emptyLegId}
                                            match={match}
                                        />
                                    ))}
                                </div>
                            )}
                        </DashboardPanel>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
