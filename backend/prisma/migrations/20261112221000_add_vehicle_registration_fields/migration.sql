-- AlterTable
ALTER TABLE "PlanQuote" ALTER COLUMN "maxBudget" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ProduceListing" ADD COLUMN "locationAccuracy" TEXT DEFAULT 'GPS_PIN',
ADD COLUMN "pickupAddress" TEXT,
ADD COLUMN "pincode" TEXT;

-- AlterTable
ALTER TABLE "ShipmentLeg" ADD COLUMN "actualCostRs" DOUBLE PRECISION,
ADD COLUMN "deviationReason" TEXT,
ADD COLUMN "legPayoutRs" DOUBLE PRECISION,
ADD COLUMN "plannedCostRs" DOUBLE PRECISION,
ADD COLUMN "plannedEtaMin" INTEGER,
ADD COLUMN "plannedFuelLitres" DOUBLE PRECISION,
ADD COLUMN "routeLockedAt" TIMESTAMP(3),
ADD COLUMN "routeOptionsJson" JSONB,
ADD COLUMN "selectedRouteIndex" INTEGER;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "adminRemarks" TEXT,
ADD COLUMN "baseHub" TEXT,
ADD COLUMN "category" TEXT NOT NULL DEFAULT 'MCV',
ADD COLUMN "dimensions" TEXT,
ADD COLUMN "fitnessVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "fuelType" TEXT NOT NULL DEFAULT 'DIESEL',
ADD COLUMN "gvwKg" DOUBLE PRECISION,
ADD COLUMN "isRefrigerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "make" TEXT,
ADD COLUMN "manufacturingYear" INTEGER,
ADD COLUMN "maxTempC" DOUBLE PRECISION,
ADD COLUMN "mileageKmpl" DOUBLE PRECISION,
ADD COLUMN "minTempC" DOUBLE PRECISION,
ADD COLUMN "model" TEXT,
ADD COLUMN "operatingDistricts" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "permitVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "pucVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "rejectionReason" TEXT,
ADD COLUMN "taxVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "verifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "VehicleDocument" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "docNumber" TEXT,
    "fileUrl" TEXT NOT NULL,
    "frontUrl" TEXT,
    "backUrl" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "adminRemarks" TEXT,
    "rejectionReason" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleDocument_vehicleId_idx" ON "VehicleDocument"("vehicleId");
CREATE INDEX "VehicleDocument_docType_idx" ON "VehicleDocument"("docType");
CREATE INDEX "VehicleDocument_verificationStatus_idx" ON "VehicleDocument"("verificationStatus");
CREATE INDEX "OutboxEvent_status_scheduledFor_idx" ON "OutboxEvent"("status", "scheduledFor");
CREATE INDEX "OutboxEvent_aggregateType_aggregateId_idx" ON "OutboxEvent"("aggregateType", "aggregateId");
CREATE INDEX "OutboxEvent_createdAt_idx" ON "OutboxEvent"("createdAt");
CREATE INDEX "Vehicle_verificationStatus_idx" ON "Vehicle"("verificationStatus");
CREATE INDEX "Vehicle_category_idx" ON "Vehicle"("category");

-- AddForeignKey
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_vehicleId_fkey"
FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
