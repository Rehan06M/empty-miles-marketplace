
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  CalendarCheck,
  CircleAlert,
  IndianRupee,
  MapPinned,
  Package,
  Plus,
  Truck,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { DashboardLayout } from "../layout/DashboardLayout";
import { DashboardPanel } from "../dashboard/DashboardPanel";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import {
  formatINR,
  sampleBookings,
  sampleLegs,
  sampleLoads,
  sampleMatches,
} from "../../data/marketplaceDemo";
import type {
  DemoLeg,
  DemoLoad,
} from "../../data/marketplaceDemo";

import {
  getTrucks,
  createTruck,
  updateTruck,
  deactivateTruck,
} from "../../services/truckApi";

import {
  getEmptyLegs,
  createEmptyLeg,
  updateEmptyLeg,
  closeEmptyLeg,
} from "../../services/emptyLegApi";

import type {
  Truck as CarrierTruck,
  EmptyLeg,
  EquipmentType,
  CreateTruckInput,
  CreateEmptyLegInput,
} from "../../types/carrier";

export type MarketplaceScreenType =
  | "loads"
  | "matches"
  | "bookings"
  | "trucks"
  | "empty-legs"
  | "requests";

type MarketplaceScreenProps = {
  screen: MarketplaceScreenType;
};

const locations = [
  "Mumbai",
  "Panvel",
  "Lonavala",
  "Pune",
  "Bhiwandi",
  "Chakan",
  "Nashik",
];

const inputStyle =
  "min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15";

const labelStyle =
  "mb-2 block text-xs font-semibold text-ink";

function DemoNotice({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="note"
      className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900"
    >
      <CircleAlert className="mt-1 shrink-0" size={17} />
      <p>{children}</p>
    </div>
  );
}

function RouteLabel({
  origin,
  destination,
}: {
  origin: string;
  destination: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 font-semibold text-ink">
      <span>{origin}</span>
      <ArrowRight size={16} className="text-brand" />
      <span>{destination}</span>
    </div>
  );
}

function LoadForm() {
  const [loads, setLoads] = useState<DemoLoad[]>(sampleLoads);
  const [pickup, setPickup] = useState("Mumbai");
  const [delivery, setDelivery] = useState("Lonavala");
  const [cargo, setCargo] = useState("");
  const [weight, setWeight] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [message, setMessage] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const weightKg = Number(weight);

    if (pickup === delivery) {
      setMessage("Pickup and delivery must be different.");
      return;
    }

    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      setMessage("Enter a valid cargo weight.");
      return;
    }

    const newLoad: DemoLoad = {
      id: `DEMO-LOAD-${Date.now()}`,
      pickup,
      delivery,
      cargo: cargo.trim(),
      weightKg,
      pickupDate,
    };

    setLoads((previous) => [newLoad, ...previous]);
    setCargo("");
    setWeight("");
    setPickupDate("");
    setMessage(
      "Load added to this page preview only. It has not been published."
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <DashboardPanel
        title="Post a Shipment"
        subtitle="Enter the freight requirements"
      >
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className={labelStyle}>Pickup Location</span>
              <select
                className={inputStyle}
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
              >
                {locations.map((city) => (
                  <option key={city}>{city}</option>
                ))}
              </select>
            </label>

            <label>
              <span className={labelStyle}>Delivery Location</span>
              <select
                className={inputStyle}
                value={delivery}
                onChange={(e) => setDelivery(e.target.value)}
              >
                {locations.map((city) => (
                  <option key={city}>{city}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className={labelStyle}>Cargo Description</span>
            <input
              className={inputStyle}
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="e.g. Industrial components"
              maxLength={120}
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className={labelStyle}>Weight (kg)</span>
              <input
                className={inputStyle}
                type="number"
                min="1"
                step="any"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                required
              />
            </label>

            <label>
              <span className={labelStyle}>Pickup Date</span>
              <input
                className={inputStyle}
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                required
              />
            </label>
          </div>

          <Button type="submit" className="w-full">
            <Plus size={17} />
            Add Demo Load
          </Button>

          {message && (
            <p role="status" className="text-sm text-brand">
              {message}
            </p>
          )}
        </form>
      </DashboardPanel>

      <DashboardPanel
        title="My Loads"
        subtitle="Sample loads plus entries created in this preview"
      >
        <div className="space-y-4">
          {loads.map((load) => (
            <div
              key={load.id}
              className="rounded-lg border border-line p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-muted">
                  {load.id}
                </span>
                <Badge variant="info">Demo</Badge>
              </div>

              <RouteLabel
                origin={load.pickup}
                destination={load.delivery}
              />

              <p className="mt-3 text-sm text-muted">
                {load.cargo} · {load.weightKg.toLocaleString("en-IN")} kg
              </p>

              <p className="mt-1 text-xs text-muted">
                Pickup: {load.pickupDate}
              </p>
            </div>
          ))}
        </div>

        <Link
          to="/demo/shipper/matches"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand"
        >
          Explore example matches <ArrowRight size={16} />
        </Link>
      </DashboardPanel>
    </div>
  );
}

function EmptyLegForm() {
  const [legs, setLegs] = useState<DemoLeg[]>(sampleLegs);
  const [truck, setTruck] = useState("MH-12-AB-1234");
  const [origin, setOrigin] = useState("Mumbai");
  const [destination, setDestination] = useState("Pune");
  const [capacity, setCapacity] = useState("");
  const [departure, setDeparture] = useState("");
  const [message, setMessage] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const capacityKg = Number(capacity);

    if (origin === destination) {
      setMessage("Origin and destination must be different.");
      return;
    }

    if (!Number.isFinite(capacityKg) || capacityKg <= 0) {
      setMessage("Enter a valid available capacity.");
      return;
    }

    const newLeg: DemoLeg = {
      id: `DEMO-LEG-${Date.now()}`,
      truck: truck.trim(),
      origin,
      destination,
      capacityKg,
      departure,
    };

    setLegs((previous) => [newLeg, ...previous]);
    setCapacity("");
    setDeparture("");
    setMessage(
      "Empty leg added to this page preview only. It is not published."
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <DashboardPanel
        title="Publish an Empty Leg"
        subtitle="Describe an existing truck journey"
      >
        <form onSubmit={submit} className="space-y-5">
          <label className="block">
            <span className={labelStyle}>Truck Registration</span>
            <input
              className={inputStyle}
              value={truck}
              onChange={(e) => setTruck(e.target.value)}
              placeholder="MH-12-AB-1234"
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className={labelStyle}>Origin</span>
              <select
                className={inputStyle}
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              >
                {locations.map((city) => (
                  <option key={city}>{city}</option>
                ))}
              </select>
            </label>

            <label>
              <span className={labelStyle}>Destination</span>
              <select
                className={inputStyle}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              >
                {locations.map((city) => (
                  <option key={city}>{city}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className={labelStyle}>
                Available Capacity (kg)
              </span>
              <input
                className={inputStyle}
                type="number"
                min="1"
                step="any"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
              />
            </label>

            <label>
              <span className={labelStyle}>Departure</span>
              <input
                className={inputStyle}
                type="datetime-local"
                value={departure}
                onChange={(e) => setDeparture(e.target.value)}
                required
              />
            </label>
          </div>

          <Button type="submit" className="w-full">
            <Plus size={17} />
            Add Demo Empty Leg
          </Button>

          {message && (
            <p role="status" className="text-sm text-brand">
              {message}
            </p>
          )}
        </form>
      </DashboardPanel>

      <DashboardPanel
        title="My Empty Legs"
        subtitle="Illustrative capacity listings"
      >
        <div className="space-y-4">
          {legs.map((leg) => (
            <div
              key={leg.id}
              className="rounded-lg border border-line p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] text-muted">
                  {leg.id}
                </span>
                <Badge variant="success">Demo Listing</Badge>
              </div>

              <RouteLabel
                origin={leg.origin}
                destination={leg.destination}
              />

              <p className="mt-3 text-sm text-muted">
                {leg.truck} ·{" "}
                {leg.capacityKg.toLocaleString("en-IN")} kg
              </p>

              <p className="mt-1 text-xs text-muted">
                Departure: {leg.departure}
              </p>
            </div>
          ))}
        </div>
      </DashboardPanel>
    </div>
  );
}


const equipmentOptions: EquipmentType[] = [
  "OPEN_BODY",
  "CONTAINER",
  "FLATBED",
  "REFRIGERATED",
  "OTHER",
];

function equipmentLabel(value: string) {
  return value.replaceAll("_", " ");
}

function messageFrom(error: unknown) {
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred";
}

function decimalValue(value: string | null) {
  return value === null
    ? "Not specified"
    : Number(value).toLocaleString("en-IN");
}

function dateForInput(iso: string) {
  const date = new Date(iso);
  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );
  return local.toISOString().slice(0, 16);
}

function toIso(value: string) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    throw new Error("Enter a valid date and time");
  }

  return date.toISOString();
}

function RealTrucksList() {
  const [trucks, setTrucks] = useState<CarrierTruck[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [editing, setEditing] = useState<string | null>(null);
  const [registrationNumber, setRegistrationNumber] =
    useState("");
  const [equipmentType, setEquipmentType] =
    useState<EquipmentType>("OPEN_BODY");
  const [maxWeightKg, setMaxWeightKg] = useState("");
  const [maxVolumeM3, setMaxVolumeM3] = useState("");

  async function refresh() {
    const data = await getTrucks();
    setTrucks(data);
  }

  useEffect(() => {
    let live = true;

    getTrucks()
      .then((data) => {
        if (live) setTrucks(data);
      })
      .catch((err: unknown) => {
        if (live) setError(messageFrom(err));
      })
      .finally(() => {
        if (live) setLoading(false);
      });

    return () => {
      live = false;
    };
  }, []);

  function clearForm() {
    setEditing(null);
    setRegistrationNumber("");
    setEquipmentType("OPEN_BODY");
    setMaxWeightKg("");
    setMaxVolumeM3("");
  }

  function edit(truck: CarrierTruck) {
    setEditing(truck.id);
    setRegistrationNumber(truck.registrationNumber);
    setEquipmentType(truck.equipmentType);
    setMaxWeightKg(truck.maxWeightKg);
    setMaxVolumeM3(truck.maxVolumeM3 ?? "");
    setError("");
    setNotice("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const weight = Number(maxWeightKg);
    const volume =
      maxVolumeM3.trim() === ""
        ? null
        : Number(maxVolumeM3);

    if (
      !Number.isFinite(weight) ||
      weight <= 0 ||
      (volume !== null &&
        (!Number.isFinite(volume) || volume <= 0))
    ) {
      setError("Enter valid positive capacities");
      return;
    }

    const input: CreateTruckInput = {
      registrationNumber,
      equipmentType,
      maxWeightKg: weight,
      maxVolumeM3: volume,
    };

    setSaving(true);

    try {
      if (editing) {
        await updateTruck(editing, input);
      } else {
        await createTruck(input);
      }

      clearForm();
      setNotice("Truck saved in PostgreSQL successfully.");

      try {
        await refresh();
      } catch (err) {
        setError(
          `Saved, but list refresh failed: ${messageFrom(err)}`
        );
      }
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(truck: CarrierTruck) {
    if (
      !window.confirm(
        `Deactivate ${truck.registrationNumber}?`
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await deactivateTruck(truck.id);
      setNotice("Truck deactivated.");

      try {
        await refresh();
      } catch (err) {
        setError(
          `Deactivated, but list refresh failed: ${messageFrom(err)}`
        );
      }
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
      <DashboardPanel
        title={editing ? "Edit Truck" : "Register Truck"}
        subtitle="Real carrier fleet management"
      >
        <form
          onSubmit={(event) => void submit(event)}
          className="space-y-4"
        >
          <label className="block">
            <span className={labelStyle}>
              Registration Number
            </span>
            <input
              className={inputStyle}
              required
              value={registrationNumber}
              onChange={(event) =>
                setRegistrationNumber(event.target.value)
              }
              placeholder="MH12AB1234"
            />
          </label>

          <label className="block">
            <span className={labelStyle}>Equipment</span>
            <select
              className={inputStyle}
              value={equipmentType}
              onChange={(event) =>
                setEquipmentType(
                  event.target.value as EquipmentType
                )
              }
            >
              {equipmentOptions.map((value) => (
                <option key={value} value={value}>
                  {equipmentLabel(value)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelStyle}>
              Maximum Weight (kg)
            </span>
            <input
              className={inputStyle}
              type="number"
              min="0.01"
              step="0.01"
              required
              value={maxWeightKg}
              onChange={(event) =>
                setMaxWeightKg(event.target.value)
              }
            />
          </label>

          <label className="block">
            <span className={labelStyle}>
              Maximum Volume (m³, optional)
            </span>
            <input
              className={inputStyle}
              type="number"
              min="0.001"
              step="0.001"
              value={maxVolumeM3}
              onChange={(event) =>
                setMaxVolumeM3(event.target.value)
              }
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>
              {saving
                ? "Saving…"
                : editing
                  ? "Save Changes"
                  : "Register Truck"}
            </Button>

            {editing && (
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={clearForm}
              >
                Cancel Edit
              </Button>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}

          {notice && (
            <p
              role="status"
              className="text-sm text-emerald-700"
            >
              {notice}
            </p>
          )}
        </form>
      </DashboardPanel>

      <DashboardPanel
        title="My Trucks"
        subtitle="Your PostgreSQL-backed fleet"
      >
        {loading ? (
          <p className="text-sm text-muted">
            Loading trucks…
          </p>
        ) : trucks.length === 0 ? (
          <p className="text-sm text-muted">
            No trucks registered yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {trucks.map((truck) => (
              <div
                key={truck.id}
                className="rounded-lg border border-line p-5"
              >
                <Truck size={27} className="text-brand" />

                <h3 className="mt-4 font-semibold text-ink">
                  {truck.registrationNumber}
                </h3>

                <p className="mt-2 text-sm text-muted">
                  {equipmentLabel(truck.equipmentType)}
                </p>

                <p className="mt-1 text-sm text-muted">
                  Max load: {decimalValue(truck.maxWeightKg)} kg
                </p>

                <p className="mt-1 text-sm text-muted">
                  Max volume: {decimalValue(truck.maxVolumeM3)} m³
                </p>

                <div className="mt-3">
                  <Badge
                    variant={
                      truck.status === "ACTIVE"
                        ? "success"
                        : "neutral"
                    }
                  >
                    {truck.status}
                  </Badge>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => edit(truck)}
                  >
                    Edit
                  </Button>

                  {truck.status === "ACTIVE" && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving}
                      onClick={() => void deactivate(truck)}
                    >
                      Deactivate
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardPanel>
    </div>
  );
}


function RealEmptyLegForm() {
  const [legs, setLegs] = useState<EmptyLeg[]>([]);
  const [trucks, setTrucks] = useState<CarrierTruck[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [editing, setEditing] = useState<string | null>(null);
  const [truckId, setTruckId] = useState("");
  const [origin, setOrigin] = useState("Mumbai");
  const [destination, setDestination] = useState("Pune");
  const [departure, setDeparture] = useState("");
  const [arrival, setArrival] = useState("");
  const [capacity, setCapacity] = useState("");
  const [volume, setVolume] = useState("");
  const [detour, setDetour] = useState("0");
  const [cargo, setCargo] = useState("");

  const [status, setStatus] =
    useState<"DRAFT" | "ACTIVE">("ACTIVE");

  const activeTrucks = trucks.filter(
    (truck) => truck.status === "ACTIVE"
  );

  async function refresh() {
    const [newLegs, newTrucks] = await Promise.all([
      getEmptyLegs(),
      getTrucks(),
    ]);

    setLegs(newLegs);
    setTrucks(newTrucks);
  }

  useEffect(() => {
    let live = true;

    Promise.all([getEmptyLegs(), getTrucks()])
      .then(([journeys, truckRecords]) => {
        if (live) {
          setLegs(journeys);
          setTrucks(truckRecords);
        }
      })
      .catch((err: unknown) => {
        if (live) setError(messageFrom(err));
      })
      .finally(() => {
        if (live) setLoading(false);
      });

    return () => {
      live = false;
    };
  }, []);

  function reset() {
    setEditing(null);
    setTruckId("");
    setOrigin("Mumbai");
    setDestination("Pune");
    setDeparture("");
    setArrival("");
    setCapacity("");
    setVolume("");
    setDetour("0");
    setCargo("");
    setStatus("ACTIVE");
  }

  function edit(leg: EmptyLeg) {
    setEditing(leg.id);
    setTruckId(leg.truckId);
    setOrigin(leg.originName);
    setDestination(leg.destinationName);
    setDeparture(dateForInput(leg.departureAt));
    setArrival(
      leg.arrivalAt ? dateForInput(leg.arrivalAt) : ""
    );
    setCapacity(leg.availableWeightKg);
    setVolume(leg.availableVolumeM3 ?? "");
    setDetour(leg.maxDetourKm);
    setCargo(leg.acceptedCargoTypes.join(", "));
    setStatus(
      leg.status === "DRAFT" ? "DRAFT" : "ACTIVE"
    );
    setError("");
    setNotice("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    try {
      const weight = Number(capacity);
      const volumeValue =
        volume.trim() === "" ? null : Number(volume);
      const detourValue = Number(detour);

      if (
        !truckId ||
        origin === destination ||
        !Number.isFinite(weight) ||
        weight <= 0 ||
        !Number.isFinite(detourValue) ||
        detourValue < 0 ||
        (volumeValue !== null &&
          (!Number.isFinite(volumeValue) ||
            volumeValue <= 0))
      ) {
        throw new Error(
          "Check truck selection, route, capacity and detour fields."
        );
      }

      const selectedTruck = trucks.find(
        (truck) => truck.id === truckId
      );

      if (
        !selectedTruck ||
        selectedTruck.status !== "ACTIVE"
      ) {
        throw new Error("Choose an active truck.");
      }

      if (
        weight > Number(selectedTruck.maxWeightKg)
      ) {
        throw new Error(
          "Available weight exceeds truck capacity."
        );
      }

      if (
        volumeValue !== null &&
        (
          selectedTruck.maxVolumeM3 === null ||
          volumeValue > Number(selectedTruck.maxVolumeM3)
        )
      ) {
        throw new Error(
          "Available volume exceeds truck capacity."
        );
      }

      const payload: CreateEmptyLegInput = {
        truckId,
        originName: origin,
        destinationName: destination,
        departureAt: toIso(departure),
        arrivalAt: arrival ? toIso(arrival) : null,
        availableWeightKg: weight,
        availableVolumeM3: volumeValue,
        maxDetourKm: detourValue,
        acceptedCargoTypes: cargo
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        status,
      };

      if (
        payload.arrivalAt &&
        new Date(payload.arrivalAt) <=
          new Date(payload.departureAt)
      ) {
        throw new Error(
          "Arrival must be after departure."
        );
      }

      if (
        status === "ACTIVE" &&
        new Date(payload.departureAt) <= new Date()
      ) {
        throw new Error(
          "Active journeys require a future departure."
        );
      }

      setSaving(true);

      try {
        if (editing) {
          // truckId is intentionally excluded.
          // A journey cannot switch trucks on update.
          const { truckId: originalTruckId, ...changes } =
            payload;

          void originalTruckId;

          await updateEmptyLeg(editing, changes);
        } else {
          await createEmptyLeg(payload);
        }

        reset();

        setNotice(
          status === "DRAFT"
            ? "Draft saved in PostgreSQL."
            : "Journey published in PostgreSQL."
        );

        try {
          await refresh();
        } catch (err) {
          setError(
            `Saved, but list refresh failed: ${messageFrom(err)}`
          );
        }
      } finally {
        setSaving(false);
      }
    } catch (err) {
      setError(messageFrom(err));
    }
  }

  async function close(leg: EmptyLeg) {
    if (
      !window.confirm(
        `Close journey ${leg.originName} → ${leg.destinationName}?`
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await closeEmptyLeg(leg.id);
      setNotice("Journey closed.");

      try {
        await refresh();
      } catch (err) {
        setError(
          `Closed, but list refresh failed: ${messageFrom(err)}`
        );
      }
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <DashboardPanel
        title={
          editing
            ? "Edit Empty Leg"
            : "Publish an Empty Leg"
        }
        subtitle="Describe an existing truck journey"
      >
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : activeTrucks.length === 0 && !editing ? (
          <p className="text-sm text-muted">
            No active truck found. Register one in My Trucks
            first.
          </p>
        ) : (
          <form
            onSubmit={(event) => void submit(event)}
            className="space-y-4"
          >
            <label className="block">
              <span className={labelStyle}>
                Truck Registration
              </span>
              <select
                className={inputStyle}
                required
                disabled={editing !== null}
                value={truckId}
                onChange={(event) =>
                  setTruckId(event.target.value)
                }
              >
                <option value="">Select your truck</option>
                {activeTrucks.map((truck) => (
                  <option key={truck.id} value={truck.id}>
                    {truck.registrationNumber} —{" "}
                    {equipmentLabel(truck.equipmentType)}
                  </option>
                ))}
                {editing &&
                  !activeTrucks.some(
                    (truck) => truck.id === truckId
                  ) && (
                    <option value={truckId}>
                      Original truck (inactive)
                    </option>
                  )}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={labelStyle}>Origin</span>
                <select
                  className={inputStyle}
                  value={origin}
                  onChange={(event) =>
                    setOrigin(event.target.value)
                  }
                >
                  {locations.map((city) => (
                    <option key={city}>{city}</option>
                  ))}
                </select>
              </label>

              <label>
                <span className={labelStyle}>
                  Destination
                </span>
                <select
                  className={inputStyle}
                  value={destination}
                  onChange={(event) =>
                    setDestination(event.target.value)
                  }
                >
                  {locations.map((city) => (
                    <option key={city}>{city}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={labelStyle}>
                  Available Capacity (kg)
                </span>
                <input
                  className={inputStyle}
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={capacity}
                  onChange={(event) =>
                    setCapacity(event.target.value)
                  }
                />
              </label>

              <label>
                <span className={labelStyle}>
                  Available Volume (m³, optional)
                </span>
                <input
                  className={inputStyle}
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={volume}
                  onChange={(event) =>
                    setVolume(event.target.value)
                  }
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={labelStyle}>
                  Departure
                </span>
                <input
                  className={inputStyle}
                  required
                  type="datetime-local"
                  value={departure}
                  onChange={(event) =>
                    setDeparture(event.target.value)
                  }
                />
              </label>

              <label>
                <span className={labelStyle}>
                  Arrival (optional)
                </span>
                <input
                  className={inputStyle}
                  type="datetime-local"
                  value={arrival}
                  onChange={(event) =>
                    setArrival(event.target.value)
                  }
                />
              </label>
            </div>

            <label className="block">
              <span className={labelStyle}>
                Maximum Detour (km)
              </span>
              <input
                className={inputStyle}
                type="number"
                min="0"
                max="1000"
                step="0.01"
                value={detour}
                onChange={(event) =>
                  setDetour(event.target.value)
                }
              />
            </label>

            <label className="block">
              <span className={labelStyle}>
                Accepted Cargo Types
                (comma separated)
              </span>
              <input
                className={inputStyle}
                value={cargo}
                onChange={(event) =>
                  setCargo(event.target.value)
                }
                placeholder="General goods, textiles"
              />
            </label>

            <label className="block">
              <span className={labelStyle}>
                Listing Status
              </span>
              <select
                className={inputStyle}
                value={status}
                disabled={
                  editing !== null &&
                  legs.find(
                    (leg) => leg.id === editing
                  )?.status === "ACTIVE"
                }
                onChange={(event) =>
                  setStatus(
                    event.target.value as
                      | "DRAFT"
                      | "ACTIVE"
                  )
                }
              >
                <option value="DRAFT">Save Draft</option>
                <option value="ACTIVE">
                  Publish Active
                </option>
              </select>
            </label>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving…"
                  : editing
                    ? "Save Changes"
                    : "Save Journey"}
              </Button>

              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={reset}
                >
                  Cancel Edit
                </Button>
              )}
            </div>
          </form>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {notice && (
          <p
            role="status"
            className="mt-4 text-sm text-emerald-700"
          >
            {notice}
          </p>
        )}
      </DashboardPanel>

      <DashboardPanel
        title="My Empty Legs"
        subtitle="Saved truck journeys"
      >
        {loading ? (
          <p className="text-sm text-muted">
            Loading journeys…
          </p>
        ) : legs.length === 0 ? (
          <p className="text-sm text-muted">
            No journeys published yet.
          </p>
        ) : (
          <div className="space-y-4">
            {legs.map((leg) => (
              <div
                key={leg.id}
                className="rounded-lg border border-line p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] text-muted">
                    {leg.id.slice(0, 8)}
                  </span>

                  <Badge
                    variant={
                      leg.status === "ACTIVE"
                        ? "success"
                        : leg.status === "DRAFT"
                          ? "info"
                          : "neutral"
                    }
                  >
                    {leg.status}
                  </Badge>
                </div>

                <RouteLabel
                  origin={leg.originName}
                  destination={leg.destinationName}
                />

                <p className="mt-3 text-sm text-muted">
                  {leg.truck?.registrationNumber ??
                    leg.truckId}
                  {" · "}
                  {decimalValue(leg.availableWeightKg)} kg
                  {" · "}
                  {decimalValue(leg.availableVolumeM3)} m³
                </p>

                <p className="mt-1 text-xs text-muted">
                  Departure:{" "}
                  {new Date(
                    leg.departureAt
                  ).toLocaleString("en-IN")}
                </p>

                <p className="mt-1 text-xs text-muted">
                  Detour:{" "}
                  {decimalValue(leg.maxDetourKm)} km
                </p>

                {(leg.status === "ACTIVE" ||
                  leg.status === "DRAFT") && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving}
                      onClick={() => edit(leg)}
                    >
                      Edit
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving}
                      onClick={() => void close(leg)}
                    >
                      Close
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DashboardPanel>
    </div>
  );
}


function MatchResults() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">
            Example Route Matches
          </h2>
          <p className="mt-1 text-sm text-muted">
            Fixed examples, not search results for submitted loads.
          </p>
        </div>

        <Badge variant="info">3 Example Matches</Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {sampleMatches.map((match) => (
          <div
            key={match.id}
            className="rounded-xl border border-line bg-white p-6"
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <Badge variant="info">{match.matchType}</Badge>
              <span className="font-mono text-xs text-muted">
                DEMO SCORE: {match.score}/100
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs text-muted">
                  Truck Journey
                </p>
                <p className="font-semibold text-ink">
                  {match.truckRoute}
                </p>
              </div>

              <div>
                <p className="mb-1 text-xs text-muted">
                  Shipment Journey
                </p>
                <p className="font-semibold text-brand">
                  {match.loadRoute}
                </p>
              </div>
            </div>

            <div className="my-5 border-t border-line pt-5">
              <p className="text-xs text-muted">
                Example Available / Requested Weight
              </p>

              <p className="mt-1 text-sm font-semibold">
                {match.capacityKg.toLocaleString("en-IN")} kg /{" "}
                {match.requestedKg.toLocaleString("en-IN")} kg
              </p>

              <p className="mt-4 text-sm leading-6 text-muted">
                {match.explanation}
              </p>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line pt-5">
              <div>
                <p className="text-xs text-muted">
                  Example Marketplace Price
                </p>
                <p className="font-display text-3xl text-ink">
                  {formatINR(match.price)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Example dedicated-trip baseline:{" "}
                  {formatINR(match.baseline)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-emerald-700">
                  Illustrative savings:{" "}
                  {formatINR(match.baseline - match.price)}
                </p>
                <button
                  type="button"
                  disabled
                  title="Real booking requests are not implemented yet"
                  className="mt-3 rounded-full bg-neutral-200 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500"
                >
                  Booking in Step 21
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BookingList({ carrierView }: { carrierView: boolean }) {
  return (
    <DashboardPanel
      title={
        carrierView
          ? "Booking Requests for Approval"
          : "My Booking Requests"
      }
      subtitle="Demonstration booking records"
    >
      <div className="space-y-4">
        {sampleBookings.map((booking) => (
          <div
            key={booking.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line p-4"
          >
            <div>
              <p className="font-mono text-[10px] text-muted">
                {booking.id}
              </p>
              <h3 className="mt-2 font-semibold text-ink">
                {booking.route}
              </h3>
              <p className="mt-1 text-xs text-muted">
                {booking.carrier} · {booking.weight}
              </p>
            </div>

            <div className="flex flex-col items-start gap-2">
              <Badge variant={booking.variant}>
                {booking.status}
              </Badge>

              <span className="text-xs text-muted">
                {carrierView
                  ? "Approval action unavailable in demo"
                  : "Status preview only"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg bg-canvas p-4 text-sm leading-6 text-muted">
        Planned behavior: A pending booking request immediately
        reserves its requested truck capacity. The request
        expires after 24 hours or before truck departure,
        whichever occurs first. Rejecting, canceling, or
        expiring a request releases the reservation.
        <strong className="text-ink">
          {" "}No capacity is actually reserved on this demo page.
        </strong>
      </div>
    </DashboardPanel>
  );
}

function TrucksList() {
  const trucks = [
    {
      number: "MH-12-AB-1234",
      type: "Open Body Truck",
      maxWeight: "6,000 kg",
    },
    {
      number: "MH-14-CD-5678",
      type: "Container Truck",
      maxWeight: "8,000 kg",
    },
  ];

  return (
    <DashboardPanel
      title="My Trucks"
      subtitle="Sample fleet records — truck management API comes in Step 13"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {trucks.map((truck) => (
          <div
            key={truck.number}
            className="rounded-lg border border-line p-5"
          >
            <Truck size={27} className="text-brand" />
            <h3 className="mt-4 font-semibold text-ink">
              {truck.number}
            </h3>
            <p className="mt-2 text-sm text-muted">
              {truck.type}
            </p>
            <p className="mt-1 text-sm text-muted">
              Max load: {truck.maxWeight}
            </p>
            <div className="mt-4">
              <Badge variant="info">Demo Vehicle</Badge>
            </div>
          </div>
        ))}
      </div>
    </DashboardPanel>
  );
}

const screenConfig: Record<
  MarketplaceScreenType,
  {
    role: "shipper" | "carrier";
    title: string;
    description: string;
    icon: typeof Package;
  }
> = {
  loads: {
    role: "shipper",
    title: "MANAGE SHIPMENTS.",
    description: "Describe the cargo you need transported.",
    icon: Package,
  },
  matches: {
    role: "shipper",
    title: "DISCOVER MATCHES.",
    description: "Explore examples of route-compatible truck capacity.",
    icon: MapPinned,
  },
  bookings: {
    role: "shipper",
    title: "YOUR BOOKINGS.",
    description: "Preview shipment booking statuses.",
    icon: CalendarCheck,
  },
  trucks: {
    role: "carrier",
    title: "MANAGE YOUR FLEET.",
    description: "View your example truck inventory.",
    icon: Truck,
  },
  "empty-legs": {
    role: "carrier",
    title: "AVAILABLE JOURNEYS.",
    description: "List unused capacity on existing routes.",
    icon: Package,
  },
  requests: {
    role: "carrier",
    title: "BOOKING REQUESTS.",
    description: "Review the carrier approval workflow.",
    icon: IndianRupee,
  },
};


export function MarketplaceScreen({
  screen,
}: MarketplaceScreenProps) {
  const config = screenConfig[screen];

  const isDemo = useLocation().pathname.startsWith(
    "/demo/"
  );

  const realCarrierScreen =
    !isDemo &&
    (screen === "trucks" || screen === "empty-legs");

  return (
    <DashboardLayout
      role={config.role}
      title={config.title}
      description={config.description}
    >
      {!realCarrierScreen && (
        <DemoNotice>
          Step 9 frontend prototype. Data is temporary,
          example matches and prices are illustrative,
          and no records are saved to the backend.
        </DemoNotice>
      )}

      {screen === "loads" && <LoadForm />}

      {screen === "matches" && <MatchResults />}

      {screen === "bookings" && (
        <BookingList carrierView={false} />
      )}

      {screen === "trucks" &&
        (isDemo ? <TrucksList /> : <RealTrucksList />)}

      {screen === "empty-legs" &&
        (isDemo ? (
          <EmptyLegForm />
        ) : (
          <RealEmptyLegForm />
        ))}

      {screen === "requests" && (
        <BookingList carrierView={true} />
      )}
    </DashboardLayout>
  );
}

