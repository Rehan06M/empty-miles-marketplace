
import { getAccessToken } from "./authApi";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(
    status: number,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data?: T;
  errors?: unknown;
};

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();

  if (!token) {
    throw new ApiError(
      401,
      "Session expired. Please log in again."
    );
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`/api/v1${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      0,
      "Cannot connect to the backend server."
    );
  }

  const result = (await response.json().catch(
    () => null
  )) as ApiEnvelope<T> | null;

  if (!response.ok || !result?.success) {
    throw new ApiError(
      response.status,
      result?.message ?? "Request failed",
      result?.errors
    );
  }

  // Some successful endpoints, such as truck
  // deactivation, return no data field.
  return result.data as T;
}
