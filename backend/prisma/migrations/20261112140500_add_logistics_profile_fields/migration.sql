-- Keep the existing logistics profile data while bringing it in line with
-- the current Prisma schema.
ALTER TABLE "LogisticsProfile"
  ADD COLUMN IF NOT EXISTS "partnerType" TEXT NOT NULL DEFAULT 'VEHICLE_OWNER',
  ADD COLUMN IF NOT EXISTS "ownerName" TEXT,
  ADD COLUMN IF NOT EXISTS "dob" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "emergencyContact" TEXT,
  ADD COLUMN IF NOT EXISTS "profilePhotoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "drivingLicenceNo" TEXT,
  ADD COLUMN IF NOT EXISTS "licenceExpiry" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "permittedClasses" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "licenceFrontUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "licenceBackUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "driverVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "panNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "gstin" TEXT,
  ADD COLUMN IF NOT EXISTS "businessRegNo" TEXT,
  ADD COLUMN IF NOT EXISTS "businessCertUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "ownershipType" TEXT DEFAULT 'Individual',
  ADD COLUMN IF NOT EXISTS "accountHolderName" TEXT,
  ADD COLUMN IF NOT EXISTS "bankName" TEXT,
  ADD COLUMN IF NOT EXISTS "accountNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "ifscCode" TEXT,
  ADD COLUMN IF NOT EXISTS "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "adminRemarks" TEXT,
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
  ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "LogisticsProfile_partnerType_idx"
  ON "LogisticsProfile"("partnerType");

CREATE INDEX IF NOT EXISTS "LogisticsProfile_verificationStatus_idx"
  ON "LogisticsProfile"("verificationStatus");
