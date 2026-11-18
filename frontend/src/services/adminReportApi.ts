
import { apiRequest } from "./apiClient";

import type {
  AdminReport,
  AdminReportDataset,
  AdminReportDays,
} from "../types/adminReport";

export function getAdminReport(
  dataset: AdminReportDataset,
  days: AdminReportDays
): Promise<AdminReport> {
  return apiRequest<AdminReport>(
    `/admin/reports?dataset=${encodeURIComponent(dataset)}&days=${days}`
  );
}
