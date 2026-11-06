
import { apiRequest } from "./apiClient";

import type {
  MatchingResponse,
} from "../types/matching";

export function findEligibleTrucks(
  loadId: string
): Promise<MatchingResponse> {
  return apiRequest<MatchingResponse>(
    `/matching/loads/${encodeURIComponent(loadId)}`
  );
}
