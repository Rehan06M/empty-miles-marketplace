export type ModerationRole = "SHIPPER" | "CARRIER" | "ADMIN";
export type ModerationStatus = "ACTIVE" | "SUSPENDED";

export type ModerationDecision = {
  actorId: string;
  targetId: string;
  targetRole: ModerationRole;
  currentStatus: ModerationStatus;
  requestedStatus: ModerationStatus;
  liveBookingCount: number;
};

export function checkModerationPolicy(
  input: ModerationDecision
): string | null {
  if (input.actorId === input.targetId) {
    return "You cannot change your own account status";
  }

  if (input.targetRole === "ADMIN") {
    return "Admin accounts cannot be changed from this page";
  }

  if (input.currentStatus === input.requestedStatus) {
    return "Account already has the requested status";
  }

  if (
    input.requestedStatus === "SUSPENDED" &&
    input.liveBookingCount > 0
  ) {
    return "Account has live bookings. Resolve them before suspension";
  }

  return null;
}