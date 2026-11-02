
import { apiRequest } from "./apiClient";

import type {
  ShipmentLoad,
  CreateLoadInput,
  UpdateLoadInput,
} from "../types/load";

export function getLoads(): Promise<ShipmentLoad[]> {
  return apiRequest<ShipmentLoad[]>("/loads");
}

export function getLoad(
  id: string
): Promise<ShipmentLoad> {
  return apiRequest<ShipmentLoad>(`/loads/${id}`);
}

export function createLoad(
  input: CreateLoadInput
): Promise<ShipmentLoad> {
  return apiRequest<ShipmentLoad>("/loads", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateLoad(
  id: string,
  input: UpdateLoadInput
): Promise<ShipmentLoad> {
  return apiRequest<ShipmentLoad>(`/loads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function cancelLoad(
  id: string
): Promise<ShipmentLoad> {
  return apiRequest<ShipmentLoad>(
    `/loads/${id}/cancel`,
    { method: "PATCH" }
  );
}
