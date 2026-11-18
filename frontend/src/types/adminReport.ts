
export type AdminReportDataset =
  | "bookings"
  | "loads"
  | "journeys"
  | "moderation";

export type AdminReportDays = 7 | 30 | 90;

export type AdminReport = {
  dataset: AdminReportDataset;
  days: AdminReportDays;

  generatedAt: string;
  from: string;
  to: string;

  filename: string;

  totalRows: number;
  exportedRows: number;
  truncated: boolean;

  headers: string[];
  preview: string[][];

  csv: string;
};
