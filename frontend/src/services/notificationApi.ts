
import {
  apiRequest,
} from "./apiClient";

import type {
  NotificationPage,
  NotificationReadReceipt,
} from "../types/notification";

export function getNotifications(
  page = 1
): Promise<NotificationPage> {
  return apiRequest<NotificationPage>(
    `/notifications?page=${page}`
  );
}

export function markNotificationRead(
  eventId: string
): Promise<NotificationReadReceipt> {
  return apiRequest<NotificationReadReceipt>(
    `/notifications/${encodeURIComponent(eventId)}/read`,
    {
      method: "PATCH",
    }
  );
}
