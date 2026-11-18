
import assert from "node:assert/strict";
import test from "node:test";

import {
  emptyBookingStatusCounts,
  effectiveBookingStatuses,
  lastSixUtcMonths,
} from "./analyticsMath.js";

test("all booking statuses begin at zero", () => {
  const counts = emptyBookingStatusCounts();

  assert.equal(Object.keys(counts).length, 7);

  for (const count of Object.values(counts)) {
    assert.equal(count, 0);
  }
});

test("only overdue pending requests become effective expirations", () => {
  const counts = {
    ...emptyBookingStatusCounts(),
    PENDING_APPROVAL: 5,
    CONFIRMED: 2,
    EXPIRED: 3,
  };

  const result = effectiveBookingStatuses(
    counts,
    2
  );

  assert.equal(result.PENDING_APPROVAL, 2);
  assert.equal(result.EXPIRED, 6);
  assert.equal(result.CONFIRMED, 2);
});

test("effective statuses preserve total booking count", () => {
  const counts = {
    ...emptyBookingStatusCounts(),
    PENDING_APPROVAL: 4,
    COMPLETED: 7,
    CANCELLED: 2,
  };

  const result = effectiveBookingStatuses(
    counts,
    1
  );

  const total = (value: typeof counts) =>
    Object.values(value).reduce(
      (sum, count) => sum + count,
      0
    );

  assert.equal(total(result), total(counts));
});

test("invalid live pending counts are rejected", () => {
  const counts = {
    ...emptyBookingStatusCounts(),
    PENDING_APPROVAL: 2,
  };

  assert.throws(() =>
    effectiveBookingStatuses(counts, 3)
  );

  assert.throws(() =>
    effectiveBookingStatuses(counts, -1)
  );
});

test("month windows include current month", () => {
  const result = lastSixUtcMonths(
    new Date("2026-11-18T10:00:00Z")
  );

  assert.equal(result.length, 6);
  assert.equal(result[0].month, "2026-06");
  assert.equal(result[5].month, "2026-11");
});

test("month windows work across year boundaries", () => {
  const result = lastSixUtcMonths(
    new Date("2027-01-05T00:00:00Z")
  );

  assert.equal(result[0].month, "2026-08");
  assert.equal(result[5].month, "2027-01");
});

test("month windows are consecutive and nonoverlapping", () => {
  const result = lastSixUtcMonths(
    new Date("2026-11-18T10:00:00Z")
  );

  for (let index = 0; index < result.length; index++) {
    assert.ok(
      result[index].start < result[index].end
    );

    if (index > 0) {
      assert.equal(
        result[index - 1].end.getTime(),
        result[index].start.getTime()
      );
    }
  }
});
