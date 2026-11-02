
import { apiRequest } from "./apiClient";

import type {
  EmptyLeg,
  CreateEmptyLegInput,
  UpdateEmptyLegInput,
} from "../types/carrier";

export function getEmptyLegs(): Promise<EmptyLeg[]> {
  return apiRequest<EmptyLeg[]>("/empty-legs");
}

export function getEmptyLeg(
  id: string
): Promise<EmptyLeg> {
  return apiRequest<EmptyLeg>(`/empty-legs/${id}`);
}

export function createEmptyLeg(
  input: CreateEmptyLegInput
): Promise<EmptyLeg> {
  return apiRequest<EmptyLeg>("/empty-legs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateEmptyLeg(
  id: string,
  input: UpdateEmptyLegInput
): Promise<EmptyLeg> {
  return apiRequest<EmptyLeg>(`/empty-legs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function closeEmptyLeg(
  id: string
): Promise<EmptyLeg> {
  return apiRequest<EmptyLeg>(
    `/empty-legs/${id}/close`,
    { method: "PATCH" }
  );
}
