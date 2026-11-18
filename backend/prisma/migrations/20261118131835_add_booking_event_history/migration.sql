-- CreateTable
CREATE TABLE "BookingEvent" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "fromStatus" "BookingStatus",
    "toStatus" "BookingStatus" NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" UUID,
    "description" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingEvent_bookingId_occurredAt_idx" ON "BookingEvent"("bookingId", "occurredAt");

-- AddForeignKey
ALTER TABLE "BookingEvent" ADD CONSTRAINT "BookingEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
