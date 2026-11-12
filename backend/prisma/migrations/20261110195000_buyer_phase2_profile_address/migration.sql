-- AlterTable BuyerProfile
ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "verificationStatus" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED';
ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "verificationNotes" TEXT;
ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "businessCategory" TEXT;
ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "contactPerson" TEXT;
ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "billingAddress" TEXT;
ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "billingState" TEXT;
ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "billingDistrict" TEXT;
ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "billingPincode" TEXT;
ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "billingGstin" TEXT;
ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "notificationPreferences" JSONB;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BuyerProfile_verificationStatus_idx" ON "BuyerProfile"("verificationStatus");

-- CreateTable
CREATE TABLE IF NOT EXISTS "BuyerAddress" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "addressType" TEXT NOT NULL DEFAULT 'HOME',
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "locality" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "deliveryInstructions" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerAddress_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BuyerAddress_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "BuyerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BuyerAddress_buyerId_idx" ON "BuyerAddress"("buyerId");
CREATE INDEX IF NOT EXISTS "BuyerAddress_isDefault_idx" ON "BuyerAddress"("isDefault");
