import { apiRequest } from "./apiClient";

import type {
  AdminOverview,
  AdminUser,
  AdminUserRole,
  AdminUserStatus,
  AdminModerationAction,
  AdminPage,
} from "../types/admin";

export function getAdminOverview():
  Promise<AdminOverview> {
  return apiRequest<AdminOverview>(
    "/admin/overview"
  );
}

export function getAdminUsers(filters: {
  page: number;
  search?: string;
  role?: AdminUserRole | "";
  status?: AdminUserStatus | "";
}): Promise<AdminPage<AdminUser>> {
  const params = new URLSearchParams();

  params.set("page", String(filters.page));

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.role) {
    params.set("role", filters.role);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  return apiRequest<AdminPage<AdminUser>>(
    `/admin/users?${params}`
  );
}

export function getAdminActions(
  page = 1
): Promise<AdminPage<AdminModerationAction>> {
  return apiRequest<
    AdminPage<AdminModerationAction>
  >(`/admin/actions?page=${page}`);
}

export function changeAdminUserStatus(
  userId: string,
  status: AdminUserStatus,
  reason: string
): Promise<AdminUser> {
  return apiRequest<AdminUser>(
    `/admin/users/${encodeURIComponent(userId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status,
        reason,
      }),
    }
  );
}