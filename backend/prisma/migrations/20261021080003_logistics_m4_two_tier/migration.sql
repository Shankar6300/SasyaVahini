-- CreateEnum
CREATE TYPE "LogisticsLegType" AS ENUM ('FEEDER', 'LINEHAUL', 'LASTMILE', 'DIRECT');

-- CreateEnum
CREATE TYPE "LogisticsOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'DECLINED', 'CANCELLED');

-- CreateTable
CREATE TABLE "VehicleSpec" (
    "id" TEXT NOT NULL,
    "vehicleClass" TEXT NOT NULL,
    "capacityKg" DOUBLE PRECISION NOT NULL,
    "minRoadClass" TEXT NOT NULL,
    "baseFare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "perKmRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgSpeedKmh" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "serviceRadiusKm" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "heavyVehicle" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferPoint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "roadAccess" TEXT NOT NULL,
    "capacityKg" DOUBLE PRECISION NOT NULL,
    "handlingFeePerKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "openHours" TEXT,
    "zone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanQuote" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "crop" TEXT NOT NULL,
    "requestedQtyKg" DOUBLE PRECISION NOT NULL,
    "maxBudget" DOUBLE PRECISION NOT NULL,
    "radiusUsedKm" DOUBLE PRECISION,
    "ringsTried" JSONB NOT NULL,
    "payload" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "priceLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentLeg" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT,
    "planQuoteId" TEXT,
    "transferPointId" TEXT,
    "sequence" INTEGER NOT NULL,
    "type" "LogisticsLegType" NOT NULL,
    "vehicleClass" TEXT NOT NULL,
    "fromJson" JSONB NOT NULL,
    "toJson" JSONB NOT NULL,
    "km" DOUBLE PRECISION NOT NULL,
    "etaMin" INTEGER NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "kg" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogisticsOffer" (
    "id" TEXT NOT NULL,
    "planQuoteId" TEXT,
    "shipmentLegId" TEXT,
    "vehicleId" TEXT NOT NULL,
    "status" "LogisticsOfferStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT,
    "transferPointId" TEXT NOT NULL,
    "feederDriverId" TEXT,
    "linehaulDriverId" TEXT,
    "feederKg" DOUBLE PRECISION NOT NULL,
    "linehaulKg" DOUBLE PRECISION NOT NULL,
    "toleranceKg" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "disputeReason" TEXT,
    "feederConfirmedAt" TIMESTAMP(3),
    "linehaulConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransferEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadAccessCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "roadClass" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'OSM',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadAccessCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleSpec_vehicleClass_key" ON "VehicleSpec"("vehicleClass");

-- CreateIndex
CREATE INDEX "TransferPoint_roadAccess_idx" ON "TransferPoint"("roadAccess");

-- CreateIndex
CREATE INDEX "TransferPoint_isActive_idx" ON "TransferPoint"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PlanQuote_quoteId_key" ON "PlanQuote"("quoteId");

-- CreateIndex
CREATE INDEX "PlanQuote_expiresAt_idx" ON "PlanQuote"("expiresAt");

-- CreateIndex
CREATE INDEX "ShipmentLeg_shipmentId_idx" ON "ShipmentLeg"("shipmentId");

-- CreateIndex
CREATE INDEX "ShipmentLeg_planQuoteId_idx" ON "ShipmentLeg"("planQuoteId");

-- CreateIndex
CREATE INDEX "ShipmentLeg_transferPointId_idx" ON "ShipmentLeg"("transferPointId");

-- CreateIndex
CREATE INDEX "ShipmentLeg_status_idx" ON "ShipmentLeg"("status");

-- CreateIndex
CREATE INDEX "LogisticsOffer_shipmentLegId_status_idx" ON "LogisticsOffer"("shipmentLegId", "status");

-- CreateIndex
CREATE INDEX "LogisticsOffer_vehicleId_status_idx" ON "LogisticsOffer"("vehicleId", "status");

-- CreateIndex
CREATE INDEX "LogisticsOffer_expiresAt_idx" ON "LogisticsOffer"("expiresAt");

-- CreateIndex
CREATE INDEX "TransferEvent_shipmentId_idx" ON "TransferEvent"("shipmentId");

-- CreateIndex
CREATE INDEX "TransferEvent_transferPointId_idx" ON "TransferEvent"("transferPointId");

-- CreateIndex
CREATE INDEX "TransferEvent_status_idx" ON "TransferEvent"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RoadAccessCache_cacheKey_key" ON "RoadAccessCache"("cacheKey");

-- CreateIndex
CREATE INDEX "RoadAccessCache_expiresAt_idx" ON "RoadAccessCache"("expiresAt");

-- AddForeignKey
ALTER TABLE "ShipmentLeg" ADD CONSTRAINT "ShipmentLeg_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentLeg" ADD CONSTRAINT "ShipmentLeg_planQuoteId_fkey" FOREIGN KEY ("planQuoteId") REFERENCES "PlanQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentLeg" ADD CONSTRAINT "ShipmentLeg_transferPointId_fkey" FOREIGN KEY ("transferPointId") REFERENCES "TransferPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsOffer" ADD CONSTRAINT "LogisticsOffer_planQuoteId_fkey" FOREIGN KEY ("planQuoteId") REFERENCES "PlanQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsOffer" ADD CONSTRAINT "LogisticsOffer_shipmentLegId_fkey" FOREIGN KEY ("shipmentLegId") REFERENCES "ShipmentLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferEvent" ADD CONSTRAINT "TransferEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferEvent" ADD CONSTRAINT "TransferEvent_transferPointId_fkey" FOREIGN KEY ("transferPointId") REFERENCES "TransferPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
