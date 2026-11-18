import assert from "node:assert/strict";
import test from "node:test";
import { checkModerationPolicy } from "./adminPolicy.js";

const base = {
  actorId: "admin-1",
  targetId: "shipper-1",
  targetRole: "SHIPPER" as const,
  currentStatus: "ACTIVE" as const,
  requestedStatus: "SUSPENDED" as const,
  liveBookingCount: 0,
};

test("allows suspension without live bookings", () => {
  assert.equal(checkModerationPolicy(base), null);
});

test("rejects self-moderation", () => {
  assert.match(
    checkModerationPolicy({
      ...base,
      targetId: "admin-1",
    }) ?? "",
    /own account/
  );
});

test("rejects admin target", () => {
  assert.match(
    checkModerationPolicy({
      ...base,
      targetRole: "ADMIN",
    }) ?? "",
    /Admin accounts/
  );
});

test("rejects duplicate status", () => {
  assert.match(
    checkModerationPolicy({
      ...base,
      requestedStatus: "ACTIVE",
    }) ?? "",
    /already/
  );
});

test("blocks suspension with active bookings", () => {
  assert.match(
    checkModerationPolicy({
      ...base,
      liveBookingCount: 1,
    }) ?? "",
    /live bookings/
  );
});

test("allows reactivation even with historical bookings", () => {
  assert.equal(
    checkModerationPolicy({
      ...base,
      currentStatus: "SUSPENDED",
      requestedStatus: "ACTIVE",
    }),
    null
  );
});