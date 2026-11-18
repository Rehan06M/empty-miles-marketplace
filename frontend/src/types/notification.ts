
import type {
  BookingStatus,
} from "./booking";

export type BookingNotification = {
  id: string;
  bookingId: string;

  title: string;
  description: string;

  toStatus: BookingStatus;
  actorType: "SHIPPER" | "CARRIER" | "SYSTEM";

  occurredAt: string;
  readAt: string | null;

  pickupName: string;
  deliveryName: string;
  truckRegistration: string;
};

export type NotificationPage = {
  items: BookingNotification[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  unreadCount: number;
};

export type NotificationReadReceipt = {
  eventId: string;
  readAt: string;
};
