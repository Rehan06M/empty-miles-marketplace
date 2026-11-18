-- CreateTable
CREATE TABLE "BookingEventRead" (
    "userId" UUID NOT NULL,
    "bookingEventId" UUID NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingEventRead_pkey" PRIMARY KEY ("userId","bookingEventId")
);

-- CreateIndex
CREATE INDEX "BookingEventRead_bookingEventId_idx" ON "BookingEventRead"("bookingEventId");

-- AddForeignKey
ALTER TABLE "BookingEventRead" ADD CONSTRAINT "BookingEventRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEventRead" ADD CONSTRAINT "BookingEventRead_bookingEventId_fkey" FOREIGN KEY ("bookingEventId") REFERENCES "BookingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
