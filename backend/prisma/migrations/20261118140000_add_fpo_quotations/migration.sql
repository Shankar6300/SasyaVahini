-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'QUOTATION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'QUOTATION_ACCEPTED';
ALTER TYPE "AuditAction" ADD VALUE 'QUOTATION_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'QUOTATION_EXPIRED';
ALTER TYPE "AuditAction" ADD VALUE 'QUOTATION_WITHDRAWN';

-- CreateTable
CREATE TABLE "FpoQuotation" (
    "id" TEXT NOT NULL,
    "quotationNumber" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "fpoId" TEXT NOT NULL,
    "produceLotId" TEXT,
    "orderId" TEXT,
    "proposalId" TEXT,
    "offeredQuantityKg" DOUBLE PRECISION NOT NULL,
    "offeredPricePerKg" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "estimatedDeliveryDate" TIMESTAMP(3) NOT NULL,
    "validityDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" "QuotationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FpoQuotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FpoQuotation_quotationNumber_key" ON "FpoQuotation"("quotationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "FpoQuotation_orderId_key" ON "FpoQuotation"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "FpoQuotation_proposalId_key" ON "FpoQuotation"("proposalId");

-- CreateIndex
CREATE INDEX "FpoQuotation_requirementId_idx" ON "FpoQuotation"("requirementId");

-- CreateIndex
CREATE INDEX "FpoQuotation_fpoId_idx" ON "FpoQuotation"("fpoId");

-- CreateIndex
CREATE INDEX "FpoQuotation_produceLotId_idx" ON "FpoQuotation"("produceLotId");

-- CreateIndex
CREATE INDEX "FpoQuotation_status_idx" ON "FpoQuotation"("status");

-- CreateIndex
CREATE INDEX "FpoQuotation_quotationNumber_idx" ON "FpoQuotation"("quotationNumber");

-- AddForeignKey
ALTER TABLE "FpoQuotation" ADD CONSTRAINT "FpoQuotation_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "BuyerRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FpoQuotation" ADD CONSTRAINT "FpoQuotation_fpoId_fkey" FOREIGN KEY ("fpoId") REFERENCES "FPOProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FpoQuotation" ADD CONSTRAINT "FpoQuotation_produceLotId_fkey" FOREIGN KEY ("produceLotId") REFERENCES "ProduceLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FpoQuotation" ADD CONSTRAINT "FpoQuotation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FpoQuotation" ADD CONSTRAINT "FpoQuotation_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "AllocationProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
