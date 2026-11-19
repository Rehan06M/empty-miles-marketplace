
import assert from "node:assert/strict";
import test from "node:test";

import {
  validateBookingParticipants,
} from "./bookingParticipantPolicy.js";

const shipper = {
  id: "shipper-1",
  role: "SHIPPER",
  status: "ACTIVE",
};

const carrier = {
  id: "carrier-1",
  role: "CARRIER",
  status: "ACTIVE",
};

test("accepts two active participants with correct roles", () => {
  assert.equal(
    validateBookingParticipants(shipper, carrier),
    null
  );
});

test("rejects suspended shipper", () => {
  const result = validateBookingParticipants(
    { ...shipper, status: "SUSPENDED" },
    carrier
  );

  assert.match(result ?? "", /Shipper account/);
});

test("rejects suspended carrier", () => {
  const result = validateBookingParticipants(
    shipper,
    { ...carrier, status: "SUSPENDED" }
  );

  assert.match(result ?? "", /Carrier account/);
});

test("rejects wrong shipper role", () => {
  assert.match(
    validateBookingParticipants(
      { ...shipper, role: "ADMIN" },
      carrier
    ) ?? "",
    /no longer a shipper/
  );
});

test("rejects wrong carrier role", () => {
  assert.match(
    validateBookingParticipants(
      shipper,
      { ...carrier, role: "SHIPPER" }
    ) ?? "",
    /no longer a carrier/
  );
});

test("rejects missing accounts", () => {
  assert.match(
    validateBookingParticipants(
      undefined,
      carrier
    ) ?? "",
    /no longer exists/
  );

  assert.match(
    validateBookingParticipants(
      shipper,
      undefined
    ) ?? "",
    /no longer exists/
  );
});

test("rejects identical participant IDs", () => {
  assert.match(
    validateBookingParticipants(
      shipper,
      { ...carrier, id: shipper.id }
    ) ?? "",
    /same account/
  );
});
