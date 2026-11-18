
export type BookingStatusCounts = {
  PENDING_APPROVAL: number;
  CONFIRMED: number;
  IN_TRANSIT: number;
  COMPLETED: number;
  REJECTED: number;
  CANCELLED: number;
  EXPIRED: number;
};

export function emptyBookingStatusCounts():
  BookingStatusCounts {
  return {
    PENDING_APPROVAL: 0,
    CONFIRMED: 0,
    IN_TRANSIT: 0,
    COMPLETED: 0,
    REJECTED: 0,
    CANCELLED: 0,
    EXPIRED: 0,
  };
}

// An overdue pending request must be treated as
// expired in analytics, even if a booking-list read
// has not yet synchronized the stored status.
export function effectiveBookingStatuses(
  stored: BookingStatusCounts,
  livePendingCount: number
): BookingStatusCounts {
  if (
    !Number.isInteger(livePendingCount) ||
    livePendingCount < 0 ||
    livePendingCount > stored.PENDING_APPROVAL
  ) {
    throw new Error("Invalid pending booking count");
  }

  const overduePending =
    stored.PENDING_APPROVAL - livePendingCount;

  return {
    ...stored,
    PENDING_APPROVAL: livePendingCount,
    EXPIRED: stored.EXPIRED + overduePending,
  };
}

export type MonthWindow = {
  month: string;
  start: Date;
  end: Date;
};

// Six calendar months, including the current one.
// UTC boundaries keep grouping deterministic.
export function lastSixUtcMonths(
  now: Date
): MonthWindow[] {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  return Array.from({ length: 6 }, (_, index) => {
    const start = new Date(
      Date.UTC(year, month - 5 + index, 1)
    );

    const end = new Date(
      Date.UTC(year, month - 4 + index, 1)
    );

    return {
      month: start.toISOString().slice(0, 7),
      start,
      end,
    };
  });
}
