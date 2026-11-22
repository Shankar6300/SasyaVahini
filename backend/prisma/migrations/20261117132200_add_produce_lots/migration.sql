-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('DRAFT', 'AGGREGATED', 'TESTED', 'READY_FOR_SALE', 'ALLOCATED', 'FULFILLED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'LOT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'LOT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'LOT_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'LOT_CANCELLED';

-- CreateTable
CREATE TABLE "ProduceLot" (
    "id" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "fpoId" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Vegetables',
    "variety" TEXT,
    "qualityGrade" "QualityGrade" NOT NULL DEFAULT 'GRADE_A',
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "totalQuantityKg" DOUBLE PRECISION NOT NULL,
    "availableQuantityKg" DOUBLE PRECISION NOT NULL,
    "allocatedQuantityKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weightedAvgPricePerKg" DOUBLE PRECISION NOT NULL,
    "status" "LotStatus" NOT NULL DEFAULT 'AGGREGATED',
    "notes" TEXT,
    "storageLocation" TEXT,
    "harvestDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProduceLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProduceLotContribution" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "notificationId" TEXT,
    "listingId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "allocatedQtyKg" DOUBLE PRECISION NOT NULL,
    "agreedPricePerKg" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProduceLotContribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProduceLot_lotNumber_key" ON "ProduceLot"("lotNumber");

-- CreateIndex
CREATE INDEX "ProduceLot_fpoId_idx" ON "ProduceLot"("fpoId");

-- CreateIndex
CREATE INDEX "ProduceLot_cropName_idx" ON "ProduceLot"("cropName");

-- CreateIndex
CREATE INDEX "ProduceLot_status_idx" ON "ProduceLot"("status");

-- CreateIndex
CREATE INDEX "ProduceLot_lotNumber_idx" ON "ProduceLot"("lotNumber");

-- CreateIndex
CREATE INDEX "ProduceLotContribution_lotId_idx" ON "ProduceLotContribution"("lotId");

-- CreateIndex
CREATE INDEX "ProduceLotContribution_listingId_idx" ON "ProduceLotContribution"("listingId");

-- CreateIndex
CREATE INDEX "ProduceLotContribution_farmerId_idx" ON "ProduceLotContribution"("farmerId");

-- CreateIndex
CREATE INDEX "ProduceLotContribution_notificationId_idx" ON "ProduceLotContribution"("notificationId");

-- AddForeignKey
ALTER TABLE "ProduceLot" ADD CONSTRAINT "ProduceLot_fpoId_fkey" FOREIGN KEY ("fpoId") REFERENCES "FPOProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProduceLotContribution" ADD CONSTRAINT "ProduceLotContribution_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "ProduceLot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProduceLotContribution" ADD CONSTRAINT "ProduceLotContribution_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ProduceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProduceLotContribution" ADD CONSTRAINT "ProduceLotContribution_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "FarmerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
