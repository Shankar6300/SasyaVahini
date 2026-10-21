-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FARMER', 'FPO', 'BUYER', 'LOGISTICS', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "QualityGrade" AS ENUM ('GRADE_A', 'GRADE_B', 'GRADE_C', 'ORGANIC_PREMIUM');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('AVAILABLE', 'PARTIALLY_RESERVED', 'RESERVED', 'SOLD', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PLACED', 'MATCHED', 'RESERVED', 'CONFIRMED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'DELIVERY_VERIFIED', 'SETTLED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "RequirementStatus" AS ENUM ('OPEN', 'MATCHING', 'PARTIALLY_MATCHED', 'FULLY_MATCHED', 'FULFILLED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('ESCROW_HELD', 'RELEASED', 'REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'ORDER_UPDATE', 'PROPOSAL', 'PAYMENT', 'ALERT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'IN_TRANSIT', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "DeliveryProofType" AS ENUM ('OTP', 'PHOTO', 'BOTH');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('USER_REGISTERED', 'USER_APPROVED', 'USER_SUSPENDED', 'LISTING_CREATED', 'LISTING_UPDATED', 'REQUIREMENT_POSTED', 'PROPOSAL_CREATED', 'PROPOSAL_ACCEPTED', 'PROPOSAL_REJECTED', 'RESERVATION_CREATED', 'RESERVATION_RELEASED', 'ORDER_STATUS_CHANGED', 'DELIVERY_VERIFIED', 'PAYMENT_RELEASED', 'ADMIN_ACTION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "preferredLocale" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fpoId" TEXT,
    "landSizeAcres" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "produceTypes" TEXT[],
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "village" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "aadhaarVerified" BOOLEAN NOT NULL DEFAULT false,
    "bankAccountVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FPOProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fpoName" TEXT NOT NULL,
    "registrationNo" TEXT NOT NULL,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "registrationCertVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FPOProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "buyerType" TEXT NOT NULL,
    "gstNumber" TEXT,
    "deliveryState" TEXT,
    "deliveryDistrict" TEXT,
    "deliveryAddress" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogisticsProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "licenseNo" TEXT,
    "serviceStates" TEXT[],
    "serviceDistricts" TEXT[],
    "licenseVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT 'DoCA',
    "designation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProduceListing" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "fpoId" TEXT,
    "cropName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "qualityGrade" "QualityGrade" NOT NULL DEFAULT 'GRADE_A',
    "isOrganic" BOOLEAN NOT NULL DEFAULT false,
    "totalQuantityKg" DOUBLE PRECISION NOT NULL,
    "reservedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "soldQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "askingPricePerKg" DOUBLE PRECISION NOT NULL,
    "minPricePerKg" DOUBLE PRECISION NOT NULL,
    "harvestDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "village" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "description" TEXT,
    "status" "ListingStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProduceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerRequirement" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "quantityKg" DOUBLE PRECISION NOT NULL,
    "maxPricePerKg" DOUBLE PRECISION NOT NULL,
    "requiredByDate" TIMESTAMP(3) NOT NULL,
    "qualityGrade" "QualityGrade",
    "deliveryState" TEXT NOT NULL,
    "deliveryDistrict" TEXT NOT NULL,
    "deliveryAddress" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,
    "status" "RequirementStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationProposal" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "totalAllocatedKg" DOUBLE PRECISION NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "consentDeadline" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllocationProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationItem" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "farmerId" TEXT,
    "fpoId" TEXT,
    "allocatedQtyKg" DOUBLE PRECISION NOT NULL,
    "proposedPricePerKg" DOUBLE PRECISION NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "consentAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllocationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "orderId" TEXT,
    "totalReservedKg" DOUBLE PRECISION NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "totalQuantityKg" DOUBLE PRECISION NOT NULL,
    "agreedPriceTotal" DOUBLE PRECISION NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PLACED',
    "deliveryAddress" TEXT NOT NULL,
    "deliveryLatitude" DOUBLE PRECISION,
    "deliveryLongitude" DOUBLE PRECISION,
    "scheduledDelivery" TIMESTAMP(3),
    "actualDelivery" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "logisticsId" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "capacityKg" DOUBLE PRECISION NOT NULL,
    "driverName" TEXT NOT NULL,
    "driverPhone" TEXT NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "currentLatitude" DOUBLE PRECISION,
    "currentLongitude" DOUBLE PRECISION,
    "lastLocationAt" TIMESTAMP(3),
    "rcVerified" BOOLEAN NOT NULL DEFAULT false,
    "insuranceVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryRecord" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "logisticsId" TEXT,
    "routeJson" JSONB,
    "totalDistanceKm" DOUBLE PRECISION,
    "estimatedMinutes" INTEGER,
    "estimatedFuelCost" DOUBLE PRECISION,
    "pickedUpAt" TIMESTAMP(3),
    "pickedUpProof" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "proofType" "DeliveryProofType",
    "proofValue" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "gpsTrackJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "platformFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netFarmerPayout" DOUBLE PRECISION NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'ESCROW_HELD',
    "providerName" TEXT,
    "providerRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "sentViaSms" BOOLEAN NOT NULL DEFAULT false,
    "sentViaEmail" BOOLEAN NOT NULL DEFAULT false,
    "sentViaWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandForecast" (
    "id" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "predictedDemandKg" DOUBLE PRECISION NOT NULL,
    "currentSupplyKg" DOUBLE PRECISION NOT NULL,
    "demandGapKg" DOUBLE PRECISION NOT NULL,
    "demandLevel" TEXT NOT NULL,
    "recommendedPricePerKg" DOUBLE PRECISION,
    "confidenceScore" DOUBLE PRECISION,
    "explainabilityJson" JSONB,
    "forecastPeriodStart" TIMESTAMP(3) NOT NULL,
    "forecastPeriodEnd" TIMESTAMP(3) NOT NULL,
    "modelVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandForecast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "OtpCode_userId_idx" ON "OtpCode"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FarmerProfile_userId_key" ON "FarmerProfile"("userId");

-- CreateIndex
CREATE INDEX "FarmerProfile_fpoId_idx" ON "FarmerProfile"("fpoId");

-- CreateIndex
CREATE INDEX "FarmerProfile_district_idx" ON "FarmerProfile"("district");

-- CreateIndex
CREATE UNIQUE INDEX "FPOProfile_userId_key" ON "FPOProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FPOProfile_registrationNo_key" ON "FPOProfile"("registrationNo");

-- CreateIndex
CREATE INDEX "FPOProfile_district_idx" ON "FPOProfile"("district");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerProfile_userId_key" ON "BuyerProfile"("userId");

-- CreateIndex
CREATE INDEX "BuyerProfile_buyerType_idx" ON "BuyerProfile"("buyerType");

-- CreateIndex
CREATE UNIQUE INDEX "LogisticsProfile_userId_key" ON "LogisticsProfile"("userId");

-- CreateIndex
CREATE INDEX "LogisticsProfile_licenseNo_idx" ON "LogisticsProfile"("licenseNo");

-- CreateIndex
CREATE UNIQUE INDEX "AdminProfile_userId_key" ON "AdminProfile"("userId");

-- CreateIndex
CREATE INDEX "ProduceListing_cropName_idx" ON "ProduceListing"("cropName");

-- CreateIndex
CREATE INDEX "ProduceListing_status_idx" ON "ProduceListing"("status");

-- CreateIndex
CREATE INDEX "ProduceListing_district_idx" ON "ProduceListing"("district");

-- CreateIndex
CREATE INDEX "ProduceListing_harvestDate_idx" ON "ProduceListing"("harvestDate");

-- CreateIndex
CREATE INDEX "ProduceListing_farmerId_idx" ON "ProduceListing"("farmerId");

-- CreateIndex
CREATE INDEX "BuyerRequirement_cropName_idx" ON "BuyerRequirement"("cropName");

-- CreateIndex
CREATE INDEX "BuyerRequirement_status_idx" ON "BuyerRequirement"("status");

-- CreateIndex
CREATE INDEX "BuyerRequirement_buyerId_idx" ON "BuyerRequirement"("buyerId");

-- CreateIndex
CREATE INDEX "BuyerRequirement_requiredByDate_idx" ON "BuyerRequirement"("requiredByDate");

-- CreateIndex
CREATE INDEX "AllocationProposal_requirementId_idx" ON "AllocationProposal"("requirementId");

-- CreateIndex
CREATE INDEX "AllocationProposal_status_idx" ON "AllocationProposal"("status");

-- CreateIndex
CREATE INDEX "AllocationItem_proposalId_idx" ON "AllocationItem"("proposalId");

-- CreateIndex
CREATE INDEX "AllocationItem_listingId_idx" ON "AllocationItem"("listingId");

-- CreateIndex
CREATE INDEX "AllocationItem_farmerId_idx" ON "AllocationItem"("farmerId");

-- CreateIndex
CREATE INDEX "AllocationItem_fpoId_idx" ON "AllocationItem"("fpoId");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_proposalId_key" ON "Reservation"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_orderId_key" ON "Reservation"("orderId");

-- CreateIndex
CREATE INDEX "Reservation_proposalId_idx" ON "Reservation"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_requirementId_key" ON "Order"("requirementId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_buyerId_idx" ON "Order"("buyerId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "OrderStatusEvent_orderId_idx" ON "OrderStatusEvent"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vehicleNumber_key" ON "Vehicle"("vehicleNumber");

-- CreateIndex
CREATE INDEX "Vehicle_status_idx" ON "Vehicle"("status");

-- CreateIndex
CREATE INDEX "Vehicle_logisticsId_idx" ON "Vehicle"("logisticsId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryRecord_orderId_key" ON "DeliveryRecord"("orderId");

-- CreateIndex
CREATE INDEX "DeliveryRecord_orderId_idx" ON "DeliveryRecord"("orderId");

-- CreateIndex
CREATE INDEX "DeliveryRecord_vehicleId_idx" ON "DeliveryRecord"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "DemandForecast_cropName_district_idx" ON "DemandForecast"("cropName", "district");

-- CreateIndex
CREATE INDEX "DemandForecast_forecastPeriodStart_idx" ON "DemandForecast"("forecastPeriodStart");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmerProfile" ADD CONSTRAINT "FarmerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmerProfile" ADD CONSTRAINT "FarmerProfile_fpoId_fkey" FOREIGN KEY ("fpoId") REFERENCES "FPOProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FPOProfile" ADD CONSTRAINT "FPOProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerProfile" ADD CONSTRAINT "BuyerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsProfile" ADD CONSTRAINT "LogisticsProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminProfile" ADD CONSTRAINT "AdminProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProduceListing" ADD CONSTRAINT "ProduceListing_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "FarmerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProduceListing" ADD CONSTRAINT "ProduceListing_fpoId_fkey" FOREIGN KEY ("fpoId") REFERENCES "FPOProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerRequirement" ADD CONSTRAINT "BuyerRequirement_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "BuyerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationProposal" ADD CONSTRAINT "AllocationProposal_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "BuyerRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationItem" ADD CONSTRAINT "AllocationItem_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "AllocationProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationItem" ADD CONSTRAINT "AllocationItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ProduceListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationItem" ADD CONSTRAINT "AllocationItem_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "FarmerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationItem" ADD CONSTRAINT "AllocationItem_fpoId_fkey" FOREIGN KEY ("fpoId") REFERENCES "FPOProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "AllocationProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "BuyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "BuyerRequirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusEvent" ADD CONSTRAINT "OrderStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_logisticsId_fkey" FOREIGN KEY ("logisticsId") REFERENCES "LogisticsProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryRecord" ADD CONSTRAINT "DeliveryRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryRecord" ADD CONSTRAINT "DeliveryRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryRecord" ADD CONSTRAINT "DeliveryRecord_logisticsId_fkey" FOREIGN KEY ("logisticsId") REFERENCES "LogisticsProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "BuyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
