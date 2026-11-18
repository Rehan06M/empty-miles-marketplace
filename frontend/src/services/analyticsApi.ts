
import { apiRequest } from "./apiClient";

import type {
  AnalyticsOverview,
} from "../types/analytics";

export function getOperationalAnalytics():
  Promise<AnalyticsOverview> {
  return apiRequest<AnalyticsOverview>(
    "/analytics/overview"
  );
}
