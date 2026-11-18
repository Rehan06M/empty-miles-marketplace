
import {
  useState,
} from "react";

import {
  Download,
  FileSpreadsheet,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

import {
  DashboardLayout,
} from "../../components/layout/DashboardLayout";

import {
  DashboardPanel,
} from "../../components/dashboard/DashboardPanel";

import {
  Button,
} from "../../components/ui/Button";

import {
  getAdminReport,
} from "../../services/adminReportApi";

import type {
  AdminReport,
  AdminReportDataset,
  AdminReportDays,
} from "../../types/adminReport";

const datasets: {
  value: AdminReportDataset;
  label: string;
  description: string;
}[] = [
  {
    value: "bookings",
    label: "Bookings",
    description:
      "Booking status, cargo, truck, price and CO₂ snapshots",
  },
  {
    value: "loads",
    label: "Shipper Loads",
    description:
      "Shipment route, cargo, weight and status",
  },
  {
    value: "journeys",
    label: "Carrier Journeys",
    description:
      "Truck, journey, advertised capacity and departure",
  },
  {
    value: "moderation",
    label: "Admin Moderation",
    description:
      "Account status changes, admin IDs and reasons",
  },
];

function formatDate(value: string): string {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Could not generate report";
}

export function AdminReportsPage() {
  const [dataset, setDataset] =
    useState<AdminReportDataset>("bookings");

  const [days, setDays] =
    useState<AdminReportDays>(30);

  const [report, setReport] =
    useState<AdminReport | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateReport() {
    if (loading) return;

    setLoading(true);
    setError("");
    setReport(null);

    try {
      const result = await getAdminReport(
        dataset,
        days
      );

      setReport(result);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function downloadReport() {
    if (!report) return;

    const blob = new Blob(
      [report.csv],
      {
        type: "text/csv;charset=utf-8",
      }
    );

    const url = URL.createObjectURL(blob);

    const anchor =
      document.createElement("a");

    anchor.href = url;
    anchor.download = report.filename;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    // Allow the browser to begin the download
    // before releasing the temporary object URL.
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  return (
    <DashboardLayout
      role="admin"
      title="ADMIN REPORTS."
      description="Generate and export real marketplace records for operational review."
    >
      <div className="space-y-6">
        <DashboardPanel
          title="Generate Marketplace Report"
          subtitle="Choose a dataset and reporting period"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-ink">
                Report Type
              </span>

              <select
                value={dataset}
                disabled={loading}
                onChange={(event) => {
                  setDataset(
                    event.target.value as
                      AdminReportDataset
                  );
                  setReport(null);
                  setError("");
                }}
                className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink"
              >
                {datasets.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-ink">
                Reporting Period
              </span>

              <select
                value={days}
                disabled={loading}
                onChange={(event) => {
                  setDays(
                    Number(event.target.value) as
                      AdminReportDays
                  );
                  setReport(null);
                  setError("");
                }}
                className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink"
              >
                <option value={7}>
                  Last 7 days
                </option>

                <option value={30}>
                  Last 30 days
                </option>

                <option value={90}>
                  Last 90 days
                </option>
              </select>
            </label>
          </div>

          <p className="mt-4 text-xs leading-5 text-muted">
            {
              datasets.find(
                (item) => item.value === dataset
              )?.description
            }
          </p>

          <div className="mt-5">
            <Button
              type="button"
              disabled={loading}
              onClick={() =>
                void generateReport()
              }
            >
              <FileSpreadsheet size={17} />

              {loading
                ? "Generating Report..."
                : "Generate Report"}
            </Button>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-white p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
        </DashboardPanel>

        {report && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-line bg-white p-5">
                <p className="text-xs text-muted">
                  Matching Records
                </p>

                <p className="mt-2 text-3xl font-semibold text-ink">
                  {report.totalRows.toLocaleString(
                    "en-IN"
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-line bg-white p-5">
                <p className="text-xs text-muted">
                  Records in Export
                </p>

                <p className="mt-2 text-3xl font-semibold text-brand">
                  {report.exportedRows.toLocaleString(
                    "en-IN"
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-line bg-white p-5">
                <p className="text-xs text-muted">
                  Generated
                </p>

                <p className="mt-2 text-sm font-semibold text-ink">
                  {formatDate(report.generatedAt)}
                </p>
              </div>
            </div>

            {report.truncated && (
              <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <AlertTriangle
                  size={20}
                  className="shrink-0 text-amber-700"
                />

                <p className="text-sm text-amber-900">
                  This report contains only the latest
                  500 matching records. More records
                  exist in the selected period.
                  Do not treat this CSV as a complete
                  marketplace export.
                </p>
              </div>
            )}

            <DashboardPanel
              title="Report Preview"
              subtitle="First ten exported records"
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted">
                  {formatDate(report.from)}
                  {" to "}
                  {formatDate(report.to)}
                </p>

                <Button
                  type="button"
                  onClick={downloadReport}
                >
                  <Download size={17} />
                  Download CSV
                </Button>
              </div>

              {report.preview.length === 0 ? (
                <div className="rounded-lg bg-canvas p-5">
                  <p className="text-sm text-muted">
                    No matching records were found
                    in this reporting period.
                    The CSV contains column headers
                    only.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="min-w-full border-collapse text-left text-xs">
                    <thead className="bg-canvas">
                      <tr>
                        {report.headers.map(
                          (header) => (
                            <th
                              key={header}
                              scope="col"
                              className="whitespace-nowrap border-b border-line px-4 py-3 font-semibold text-ink"
                            >
                              {header}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {report.preview.map(
                        (row, index) => (
                          <tr
                            key={index}
                            className="border-b border-line last:border-0"
                          >
                            {row.map(
                              (value, cellIndex) => (
                                <td
                                  key={cellIndex}
                                  className="max-w-xs whitespace-nowrap px-4 py-3 text-muted"
                                >
                                  {value || "—"}
                                </td>
                              )
                            )}
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="mt-4 text-xs leading-5 text-muted">
                The preview shows up to ten rows.
                Download CSV exports up to 500
                records from the selected period.
                Spreadsheet values are escaped
                to reduce formula-injection risk.
              </p>
            </DashboardPanel>
          </>
        )}

        <div className="flex items-start gap-3 rounded-xl border border-line bg-white p-4">
          <ShieldCheck
            size={20}
            className="shrink-0 text-brand"
          />

          <p className="text-xs leading-6 text-muted">
            Admin-only report. CSV files may contain
            business and account information.
            Store and share downloads carefully.
            Price values are illustrative estimates,
            not payment confirmations. CO₂ figures
            are modeled estimates, not verified
            environmental reductions.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
