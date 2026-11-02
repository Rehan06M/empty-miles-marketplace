
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Package, Pencil, XCircle } from "lucide-react";

import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { DashboardPanel } from "../../components/dashboard/DashboardPanel";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

import {
  getLoads,
  createLoad,
  updateLoad,
  cancelLoad,
} from "../../services/loadApi";

import type {
  ShipmentLoad,
  CreateLoadInput,
} from "../../types/load";

import type { EquipmentType } from "../../types/carrier";

const locations = [
  "Mumbai",
  "Panvel",
  "Lonavala",
  "Pune",
  "Bhiwandi",
  "Chakan",
  "Nashik",
];

const equipmentOptions: EquipmentType[] = [
  "OPEN_BODY",
  "CONTAINER",
  "FLATBED",
  "REFRIGERATED",
  "OTHER",
];

const inputStyle =
  "min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15";

const labelStyle =
  "mb-2 block text-xs font-semibold text-ink";

type FormValues = {
  pickupName: string;
  deliveryName: string;
  cargoDescription: string;
  cargoType: string;
  weightKg: string;
  volumeM3: string;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
  requiredEquipment: EquipmentType | "";
  status: "DRAFT" | "ACTIVE";
};

const initialForm: FormValues = {
  pickupName: "Mumbai",
  deliveryName: "Pune",
  cargoDescription: "",
  cargoType: "",
  weightKg: "",
  volumeM3: "",
  pickupWindowStart: "",
  pickupWindowEnd: "",
  deliveryWindowStart: "",
  deliveryWindowEnd: "",
  requiredEquipment: "",
  status: "ACTIVE",
};

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unexpected error. Please try again.";
}

function dateForInput(iso: string | null): string {
  if (!iso) return "";

  const date = new Date(iso);

  const adjusted = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );

  return adjusted.toISOString().slice(0, 16);
}

function toIso(value: string): string {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    throw new Error("Enter a valid date and time.");
  }

  return date.toISOString();
}

function displayDate(iso: string | null): string {
  if (!iso) return "Not specified";

  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ShipperLoadsPage() {
  const [loads, setLoads] = useState<ShipmentLoad[]>([]);
  const [form, setForm] = useState<FormValues>(initialForm);

  const [editingId, setEditingId] = useState<string | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function change<K extends keyof FormValues>(
    field: K,
    value: FormValues[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function refreshLoads() {
    const data = await getLoads();
    setLoads(data);
  }

  useEffect(() => {
    let mounted = true;

    getLoads()
      .then((data) => {
        if (mounted) setLoads(data);
      })
      .catch((err: unknown) => {
        if (mounted) setError(errorMessage(err));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function beginEdit(load: ShipmentLoad) {
    setEditingId(load.id);
    setForm({
      pickupName: load.pickupName,
      deliveryName: load.deliveryName,
      cargoDescription: load.cargoDescription,
      cargoType: load.cargoType,
      weightKg: load.weightKg,
      volumeM3: load.volumeM3 ?? "",
      pickupWindowStart:
        dateForInput(load.pickupWindowStart),
      pickupWindowEnd:
        dateForInput(load.pickupWindowEnd),
      deliveryWindowStart:
        dateForInput(load.deliveryWindowStart),
      deliveryWindowEnd:
        dateForInput(load.deliveryWindowEnd),
      requiredEquipment: load.requiredEquipment ?? "",
      status:
        load.status === "DRAFT" ? "DRAFT" : "ACTIVE",
    });

    setError("");
    setNotice("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function buildPayload(): CreateLoadInput {
    const weight = Number(form.weightKg);

    const volume =
      form.volumeM3.trim() === ""
        ? null
        : Number(form.volumeM3);

    if (
      form.pickupName.trim().toLowerCase() ===
      form.deliveryName.trim().toLowerCase()
    ) {
      throw new Error(
        "Pickup and delivery locations must differ."
      );
    }

    if (
      !form.weightKg.trim() ||
      !Number.isFinite(weight) ||
      weight <= 0
    ) {
      throw new Error("Enter a valid positive weight.");
    }

    if (
      volume !== null &&
      (!Number.isFinite(volume) || volume <= 0)
    ) {
      throw new Error("Enter a valid volume.");
    }

    const pickupStart = toIso(form.pickupWindowStart);
    const pickupEnd = toIso(form.pickupWindowEnd);

    const deliveryStart = form.deliveryWindowStart
      ? toIso(form.deliveryWindowStart)
      : null;

    const deliveryEnd = form.deliveryWindowEnd
      ? toIso(form.deliveryWindowEnd)
      : null;

    if (
      new Date(pickupEnd) <= new Date(pickupStart)
    ) {
      throw new Error(
        "Pickup window end must be after its start."
      );
    }

    if (
      form.status === "ACTIVE" &&
      new Date(pickupStart) <= new Date()
    ) {
      throw new Error(
        "Active loads require a future pickup window."
      );
    }

    if (
      deliveryStart &&
      new Date(deliveryStart) <
        new Date(pickupStart)
    ) {
      throw new Error(
        "Delivery cannot begin before pickup."
      );
    }

    if (
      deliveryStart &&
      deliveryEnd &&
      new Date(deliveryEnd) <=
        new Date(deliveryStart)
    ) {
      throw new Error(
        "Delivery window end must be after its start."
      );
    }

    if (
      deliveryEnd &&
      new Date(deliveryEnd) <=
        new Date(pickupStart)
    ) {
      throw new Error(
        "Delivery must end after pickup begins."
      );
    }

    return {
      pickupName: form.pickupName.trim(),
      deliveryName: form.deliveryName.trim(),
      cargoDescription: form.cargoDescription.trim(),
      cargoType: form.cargoType.trim(),
      weightKg: weight,
      volumeM3: volume,
      pickupWindowStart: pickupStart,
      pickupWindowEnd: pickupEnd,
      deliveryWindowStart: deliveryStart,
      deliveryWindowEnd: deliveryEnd,
      requiredEquipment:
        form.requiredEquipment || null,
      status: form.status,
    };
  }

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    if (saving) return;

    setError("");
    setNotice("");

    let payload: CreateLoadInput;

    try {
      payload = buildPayload();
    } catch (err) {
      setError(errorMessage(err));
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        await updateLoad(editingId, payload);
        setNotice("Shipment updated successfully.");
      } else {
        await createLoad(payload);
        setNotice(
          payload.status === "DRAFT"
            ? "Shipment draft saved successfully."
            : "Shipment published successfully."
        );
      }

      resetForm();

      try {
        await refreshLoads();
      } catch (err) {
        setError(
          "Saved successfully, but list refresh failed: " +
          errorMessage(err)
        );
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function cancel(load: ShipmentLoad) {
    if (saving) return;

    const confirmed = window.confirm(
      `Cancel shipment from ${load.pickupName} to ${load.deliveryName}?`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await cancelLoad(load.id);

      if (editingId === load.id) {
        resetForm();
      }

      setNotice("Shipment cancelled successfully.");

      try {
        await refreshLoads();
      } catch (err) {
        setError(
          "Cancelled, but list refresh failed: " +
          errorMessage(err)
        );
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout
      role="shipper"
      title="MANAGE YOUR SHIPMENTS."
      description="Publish freight requirements and manage your saved loads."
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <DashboardPanel
          title={
            editingId
              ? "Edit Shipment"
              : "Post a Shipment"
          }
          subtitle="Enter real freight requirements"
        >
          <form
            onSubmit={(event) => void submit(event)}
            className="space-y-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={labelStyle}>
                  Pickup Location
                </span>
                <select
                  className={inputStyle}
                  value={form.pickupName}
                  onChange={(event) =>
                    change(
                      "pickupName",
                      event.target.value
                    )
                  }
                >
                  {locations.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className={labelStyle}>
                  Delivery Location
                </span>
                <select
                  className={inputStyle}
                  value={form.deliveryName}
                  onChange={(event) =>
                    change(
                      "deliveryName",
                      event.target.value
                    )
                  }
                >
                  {locations.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className={labelStyle}>
                Cargo Description
              </span>
              <input
                className={inputStyle}
                value={form.cargoDescription}
                onChange={(event) =>
                  change(
                    "cargoDescription",
                    event.target.value
                  )
                }
                placeholder="Industrial components"
                maxLength={500}
                required
              />
            </label>

            <label className="block">
              <span className={labelStyle}>
                Cargo Type
              </span>
              <input
                className={inputStyle}
                value={form.cargoType}
                onChange={(event) =>
                  change("cargoType", event.target.value)
                }
                placeholder="General goods"
                maxLength={60}
                required
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={labelStyle}>
                  Weight (kg)
                </span>
                <input
                  className={inputStyle}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.weightKg}
                  onChange={(event) =>
                    change("weightKg", event.target.value)
                  }
                  required
                />
              </label>

              <label>
                <span className={labelStyle}>
                  Volume (m³, optional)
                </span>
                <input
                  className={inputStyle}
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={form.volumeM3}
                  onChange={(event) =>
                    change("volumeM3", event.target.value)
                  }
                />
              </label>
            </div>

            <label className="block">
              <span className={labelStyle}>
                Required Truck Equipment
              </span>
              <select
                className={inputStyle}
                value={form.requiredEquipment}
                onChange={(event) =>
                  change(
                    "requiredEquipment",
                    event.target.value as
                      EquipmentType | ""
                  )
                }
              >
                <option value="">No specific requirement</option>
                {equipmentOptions.map((equipment) => (
                  <option
                    key={equipment}
                    value={equipment}
                  >
                    {equipment.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={labelStyle}>
                  Pickup Window Start
                </span>
                <input
                  className={inputStyle}
                  type="datetime-local"
                  required
                  value={form.pickupWindowStart}
                  onChange={(event) =>
                    change(
                      "pickupWindowStart",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                <span className={labelStyle}>
                  Pickup Window End
                </span>
                <input
                  className={inputStyle}
                  type="datetime-local"
                  required
                  value={form.pickupWindowEnd}
                  onChange={(event) =>
                    change(
                      "pickupWindowEnd",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                <span className={labelStyle}>
                  Delivery Window Start
                  (optional)
                </span>
                <input
                  className={inputStyle}
                  type="datetime-local"
                  value={form.deliveryWindowStart}
                  onChange={(event) =>
                    change(
                      "deliveryWindowStart",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                <span className={labelStyle}>
                  Delivery Window End
                  (optional)
                </span>
                <input
                  className={inputStyle}
                  type="datetime-local"
                  value={form.deliveryWindowEnd}
                  onChange={(event) =>
                    change(
                      "deliveryWindowEnd",
                      event.target.value
                    )
                  }
                />
              </label>
            </div>

            <label className="block">
              <span className={labelStyle}>
                Listing Status
              </span>
              <select
                className={inputStyle}
                value={form.status}
                disabled={
                  editingId !== null &&
                  loads.find(
                    (load) => load.id === editingId
                  )?.status === "ACTIVE"
                }
                onChange={(event) =>
                  change(
                    "status",
                    event.target.value as
                      "DRAFT" | "ACTIVE"
                  )
                }
              >
                <option value="DRAFT">
                  Save Draft
                </option>
                <option value="ACTIVE">
                  Publish Active
                </option>
              </select>
            </label>

            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Save Shipment"}
              </Button>

              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={resetForm}
                >
                  Cancel Edit
                </Button>
              )}
            </div>

            {error && (
              <p
                role="alert"
                className="text-sm text-red-700"
              >
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
          title="My Loads"
          subtitle="Shipments saved in PostgreSQL"
        >
          {loading ? (
            <p className="text-sm text-muted">
              Loading shipments...
            </p>
          ) : loads.length === 0 ? (
            <div className="py-8 text-center">
              <Package
                size={32}
                className="mx-auto text-brand"
              />
              <p className="mt-4 text-sm text-muted">
                No shipments yet. Create your first
                load using the form.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {loads.map((load) => (
                <div
                  key={load.id}
                  className="rounded-lg border border-line p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] text-muted">
                      {load.id.slice(0, 8)}
                    </span>

                    <Badge
                      variant={
                        load.status === "ACTIVE"
                          ? "success"
                          : load.status === "DRAFT"
                            ? "info"
                            : "neutral"
                      }
                    >
                      {load.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 font-semibold text-ink">
                    <span>{load.pickupName}</span>
                    <ArrowRight
                      size={16}
                      className="text-brand"
                    />
                    <span>{load.deliveryName}</span>
                  </div>

                  <p className="mt-3 text-sm text-muted">
                    {load.cargoDescription}
                  </p>

                  <p className="mt-1 text-sm text-muted">
                    {load.cargoType}
                    {" · "}
                    {Number(
                      load.weightKg
                    ).toLocaleString("en-IN")} kg
                    {" · "}
                    {load.volumeM3
                      ? `${Number(load.volumeM3)} m³`
                      : "Volume unspecified"}
                  </p>

                  <p className="mt-2 text-xs text-muted">
                    Pickup:{" "}
                    {displayDate(
                      load.pickupWindowStart
                    )}
                    {" – "}
                    {displayDate(
                      load.pickupWindowEnd
                    )}
                  </p>

                  {load.requiredEquipment && (
                    <p className="mt-1 text-xs text-muted">
                      Equipment:{" "}
                      {load.requiredEquipment.replaceAll(
                        "_",
                        " "
                      )}
                    </p>
                  )}

                  {(load.status === "DRAFT" ||
                    load.status === "ACTIVE") && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={saving}
                        onClick={() =>
                          beginEdit(load)
                        }
                      >
                        <Pencil size={14} />
                        Edit
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={saving}
                        onClick={() =>
                          void cancel(load)
                        }
                      >
                        <XCircle size={14} />
                        Cancel Load
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>
      </div>
    </DashboardLayout>
  );
}
