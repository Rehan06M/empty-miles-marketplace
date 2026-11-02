
import { apiRequest } from "./apiClient";

import type {
  Truck,
  CreateTruckInput,
  UpdateTruckInput,
} from "../types/carrier";

export function getTrucks(): Promise<Truck[]> {
  return apiRequest<Truck[]>("/trucks");
}

export function getTruck(id: string): Promise<Truck> {
  return apiRequest<Truck>(`/trucks/${id}`);
}

export function createTruck(
  input: CreateTruckInput
): Promise<Truck> {
  return apiRequest<Truck>("/trucks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTruck(
  id: string,
  input: UpdateTruckInput
): Promise<Truck> {
  return apiRequest<Truck>(`/trucks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deactivateTruck(
  id: string
): Promise<void> {
  return apiRequest<void>(
    `/trucks/${id}/deactivate`,
    { method: "PATCH" }
  );
}
