CREATE EXTENSION IF NOT EXISTS postgis;
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SHIPPER', 'CARRIER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TruckStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('OPEN_BODY', 'CONTAINER', 'FLATBED', 'REFRIGERATED', 'OTHER');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_APPROVAL', 'CONFIRMED', 'IN_TRANSIT', 'COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "companyName" TEXT,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Truck" (
    "id" UUID NOT NULL,
    "carrierId" UUID NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "equipmentType" "EquipmentType" NOT NULL,
    "maxWeightKg" DECIMAL(12,2) NOT NULL,
    "maxVolumeM3" DECIMAL(12,3),
    "status" "TruckStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Truck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmptyLeg" (
    "id" UUID NOT NULL,
    "truckId" UUID NOT NULL,
    "originName" TEXT NOT NULL,
    "destinationName" TEXT NOT NULL,
    "originLat" DECIMAL(10,7),
    "originLng" DECIMAL(10,7),
    "destinationLat" DECIMAL(10,7),
    "destinationLng" DECIMAL(10,7),
    "departureAt" TIMESTAMP(3) NOT NULL,
    "arrivalAt" TIMESTAMP(3),
    "availableWeightKg" DECIMAL(12,2) NOT NULL,
    "availableVolumeM3" DECIMAL(12,3),
    "maxDetourKm" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "acceptedCargoTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmptyLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegStop" (
    "id" UUID NOT NULL,
    "emptyLegId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "placeName" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "arrivalAt" TIMESTAMP(3),

    CONSTRAINT "LegStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Load" (
    "id" UUID NOT NULL,
    "shipperId" UUID NOT NULL,
    "pickupName" TEXT NOT NULL,
    "deliveryName" TEXT NOT NULL,
    "pickupLat" DECIMAL(10,7),
    "pickupLng" DECIMAL(10,7),
    "deliveryLat" DECIMAL(10,7),
    "deliveryLng" DECIMAL(10,7),
    "cargoDescription" TEXT NOT NULL,
    "cargoType" TEXT NOT NULL,
    "weightKg" DECIMAL(12,2) NOT NULL,
    "volumeM3" DECIMAL(12,3),
    "pickupWindowStart" TIMESTAMP(3) NOT NULL,
    "pickupWindowEnd" TIMESTAMP(3) NOT NULL,
    "deliveryWindowStart" TIMESTAMP(3),
    "deliveryWindowEnd" TIMESTAMP(3),
    "requiredEquipment" "EquipmentType",
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Load_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" UUID NOT NULL,
    "loadId" UUID NOT NULL,
    "emptyLegId" UUID NOT NULL,
    "shipperId" UUID NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "requestedWeightKg" DECIMAL(12,2) NOT NULL,
    "requestedVolumeM3" DECIMAL(12,3),
    "pickupName" TEXT NOT NULL,
    "deliveryName" TEXT NOT NULL,
    "quotedPriceInr" DECIMAL(12,2),
    "dedicatedPriceInr" DECIMAL(12,2),
    "platformFeeInr" DECIMAL(12,2),
    "estimatedCo2SavedKg" DECIMAL(12,3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Truck_registrationNumber_key" ON "Truck"("registrationNumber");

-- CreateIndex
CREATE INDEX "Truck_carrierId_status_idx" ON "Truck"("carrierId", "status");

-- CreateIndex
CREATE INDEX "EmptyLeg_status_departureAt_idx" ON "EmptyLeg"("status", "departureAt");

-- CreateIndex
CREATE INDEX "EmptyLeg_truckId_status_idx" ON "EmptyLeg"("truckId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LegStop_emptyLegId_sequence_key" ON "LegStop"("emptyLegId", "sequence");

-- CreateIndex
CREATE INDEX "Load_shipperId_status_idx" ON "Load"("shipperId", "status");

-- CreateIndex
CREATE INDEX "Load_status_pickupWindowStart_idx" ON "Load"("status", "pickupWindowStart");

-- CreateIndex
CREATE INDEX "Booking_emptyLegId_status_idx" ON "Booking"("emptyLegId", "status");

-- CreateIndex
CREATE INDEX "Booking_shipperId_status_idx" ON "Booking"("shipperId", "status");

-- CreateIndex
CREATE INDEX "Booking_status_expiresAt_idx" ON "Booking"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Booking_loadId_idx" ON "Booking"("loadId");

-- AddForeignKey
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmptyLeg" ADD CONSTRAINT "EmptyLeg_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegStop" ADD CONSTRAINT "LegStop_emptyLegId_fkey" FOREIGN KEY ("emptyLegId") REFERENCES "EmptyLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_emptyLegId_fkey" FOREIGN KEY ("emptyLegId") REFERENCES "EmptyLeg"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
