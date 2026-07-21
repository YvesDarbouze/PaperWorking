-- CreateEnum
CREATE TYPE "AcquisitionStatus" AS ENUM ('PROSPECT', 'UNDERWRITING', 'OFFER_MADE', 'UNDER_CONTRACT', 'DUE_DILIGENCE', 'CLEAR_TO_CLOSE', 'CLOSED', 'DEAD', 'PRE_POSSESSION', 'OWNED');

-- CreateEnum
CREATE TYPE "OwnershipStructure" AS ENUM ('SOLE_OWNER', 'JOINT_VENTURE', 'LLC', 'LP', 'TRUST', 'SYNDICATION', 'SOLE_SEVERALTY', 'JOINT_TENANCY', 'TENANCY_IN_COMMON', 'TENANCY_BY_ENTIRETY', 'COMMUNITY_PROPERTY', 'ENTITY');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'PARTNER', 'ANALYST', 'VIEWER');

-- CreateEnum
CREATE TYPE "SellerResponse" AS ENUM ('PENDING', 'ACCEPTED', 'COUNTERED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FieldStatus" AS ENUM ('OPEN', 'FILLED');

-- AlterTable
ALTER TABLE "BridgeSyncState" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DealFinancials" ADD COLUMN     "actualRehabCost" BIGINT,
ADD COLUMN     "actualRentalIncome" BIGINT,
ADD COLUMN     "capitalRaiseTarget" BIGINT,
ADD COLUMN     "committedCapital" BIGINT,
ADD COLUMN     "daysOccupied" INTEGER,
ADD COLUMN     "targetPurchasePrice" BIGINT,
ADD COLUMN     "totalHoldDays" INTEGER;

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "recipientId" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "templateSlug" TEXT NOT NULL,
    "linkedProjectId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Sent',
    "subject" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "messageId" TEXT NOT NULL,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "memberKey" TEXT NOT NULL,
    "memberMlsId" TEXT,
    "memberFullName" TEXT,
    "memberFirstName" TEXT,
    "memberLastName" TEXT,
    "memberEmail" TEXT,
    "memberDirectPhone" TEXT,
    "memberMobilePhone" TEXT,
    "memberStateLicense" TEXT,
    "memberDesignation" TEXT,
    "officeName" TEXT,
    "officeKey" TEXT,
    "officeMlsId" TEXT,
    "media" TEXT,
    "modificationTimestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Office" (
    "id" TEXT NOT NULL,
    "officeKey" TEXT NOT NULL,
    "officeMlsId" TEXT,
    "officeName" TEXT,
    "officePhone" TEXT,
    "officeEmail" TEXT,
    "officeAddress1" TEXT,
    "officeCity" TEXT,
    "officeStateOrProvince" TEXT,
    "officePostalCode" TEXT,
    "officeType" TEXT,
    "officeStatus" TEXT,
    "modificationTimestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourcingLead" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceVendor" TEXT NOT NULL,
    "sourceReferenceId" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "propertyType" TEXT,
    "estimatedValue" BIGINT,
    "ownerName" TEXT,
    "ownerContact" TEXT,
    "criteriaVersion" TEXT NOT NULL DEFAULT 'v1',
    "costPerLead" BIGINT,
    "estimatedMargin" BIGINT,
    "ownershipShares" JSONB,
    "status" TEXT NOT NULL DEFAULT 'New',
    "convertedProjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourcingLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RehabProject" (
    "id" TEXT NOT NULL,
    "linkedProjectId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Planning',
    "estimatedBudget" BIGINT NOT NULL DEFAULT 0,
    "actualCost" BIGINT NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "ownershipShares" JSONB,
    "criteriaVersion" TEXT NOT NULL DEFAULT 'v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RehabProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RehabMilestone" (
    "id" TEXT NOT NULL,
    "rehabProjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "estimatedCost" BIGINT NOT NULL DEFAULT 0,
    "actualCost" BIGINT NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RehabMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBid" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "bidAmount" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorBid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RehabInvoice" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RehabInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeOrder" (
    "id" TEXT NOT NULL,
    "rehabProjectId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requestedCost" BIGINT NOT NULL,
    "approvedCost" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RehabDocument" (
    "id" TEXT NOT NULL,
    "rehabProjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RehabDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReilProject" (
    "id" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "zip" TEXT NOT NULL DEFAULT '',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "placeId" TEXT,
    "displayName" TEXT,
    "acquisitionStatus" "AcquisitionStatus" NOT NULL DEFAULT 'PROSPECT',
    "ownershipStructure" "OwnershipStructure",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "coOwners" TEXT[],
    "entityName" TEXT,
    "entityType" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "marketSyncedAt" TIMESTAMP(3),
    "rentSyncedAt" TIMESTAMP(3),
    "valueSyncedAt" TIMESTAMP(3),
    "currentPhase" INTEGER NOT NULL DEFAULT 1,
    "dispositionType" TEXT,
    "subStrategy" TEXT,
    "holdHorizon" INTEGER,
    "exitAssumption" TEXT,
    "entryStage" TEXT,
    "lastActiveStage" TEXT,
    "overrideReason" TEXT,
    "propertyType" TEXT,
    "units" INTEGER,
    "condition" TEXT,
    "retrospective" BOOLEAN NOT NULL DEFAULT false,
    "leadSource" TEXT,
    "listingUrl" TEXT,
    "askingPriceCents" BIGINT,
    "subjectDom" INTEGER,
    "leadAgent" TEXT,
    "dateIdentified" TIMESTAMP(3),
    "sellerName" TEXT,
    "sellerType" TEXT,
    "sellerMotivation" TEXT,
    "sellerContact" TEXT,
    "submarket" TEXT,
    "medianSalesPriceCents" BIGINT,
    "medianRentCents" BIGINT,
    "marketVacancyRate" DOUBLE PRECISION,
    "hazardFlag" BOOLEAN NOT NULL DEFAULT false,
    "hazardNote" TEXT,
    "firstPassRentCents" BIGINT,
    "firstPassVerdict" TEXT,
    "arvCents" BIGINT,

    CONSTRAINT "ReilProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReilPropertyFacts" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "apn" TEXT,
    "photoUrl" TEXT,
    "beds" INTEGER,
    "baths" DOUBLE PRECISION,
    "sqft" INTEGER,
    "yearBuilt" INTEGER,
    "lotSqft" INTEGER,
    "propertyType" TEXT,
    "listPriceCents" BIGINT,
    "estRentCents" BIGINT,
    "lastSoldPriceCents" BIGINT,
    "lastSoldDate" TIMESTAMP(3),
    "sourceProvider" TEXT,
    "fetchedAt" TIMESTAMP(3),
    "annualPropertyTaxCents" BIGINT,
    "hoaMonthlyCents" BIGINT,
    "taxAssessedValueCents" BIGINT,
    "taxSource" TEXT,
    "taxYear" INTEGER,
    "avmPriceCents" BIGINT,
    "avmPriceHighCents" BIGINT,
    "avmPriceLowCents" BIGINT,
    "estRentHighCents" BIGINT,
    "estRentLowCents" BIGINT,
    "taxAssessedImprovementsValCents" BIGINT,
    "taxAssessedLandValCents" BIGINT,

    CONSTRAINT "ReilPropertyFacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReilComp" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "soldPriceCents" BIGINT,
    "soldDate" TIMESTAMP(3),
    "beds" INTEGER,
    "baths" DOUBLE PRECISION,
    "sqft" INTEGER,
    "distanceMiles" DOUBLE PRECISION,
    "compType" TEXT NOT NULL DEFAULT 'SALE',
    "correlation" DOUBLE PRECISION,
    "daysOnMarket" INTEGER,
    "listedDate" TIMESTAMP(3),
    "priceCents" BIGINT,
    "status" TEXT,
    "condition" TEXT,

    CONSTRAINT "ReilComp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReilValuationSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "valueCents" BIGINT NOT NULL,
    "valueLowCents" BIGINT NOT NULL,
    "valueHighCents" BIGINT NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReilValuationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReilPurchaseTerms" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "offerMadeCents" BIGINT,
    "offerDate" TIMESTAMP(3),
    "sellerResponse" "SellerResponse" NOT NULL DEFAULT 'PENDING',
    "counterPriceCents" BIGINT,
    "acceptedPriceCents" BIGINT,
    "earnestMoneyCents" BIGINT,
    "estClosingCostsCents" BIGINT,
    "amountPaidCents" BIGINT,

    CONSTRAINT "ReilPurchaseTerms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "AcquisitionStatus" NOT NULL,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT NOT NULL,

    CONSTRAINT "StatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCollaborator" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'VIEWER',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldAssignment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "status" "FieldStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReilFundingPlan" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "modality" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReilFundingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReilCapitalSource" (
    "id" TEXT NOT NULL,
    "fundingPlanId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "seniority" INTEGER NOT NULL,

    CONSTRAINT "ReilCapitalSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReilEquityParty" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "entityType" TEXT NOT NULL,
    "memberId" TEXT,
    "ownershipPct" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "ReilEquityParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReilLoanRecord" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "lenderName" TEXT NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "interestRatePercent" DOUBLE PRECISION NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL,
    "isInterestOnly" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ReilLoanRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReilContributionEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "partyName" TEXT NOT NULL,
    "email" TEXT,
    "amountCents" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "evidenceDocId" TEXT,
    "evidenceDocUrl" TEXT,
    "partyType" TEXT NOT NULL DEFAULT 'Investor',

    CONSTRAINT "ReilContributionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReilTitleHolding" (
    "id" TEXT NOT NULL,
    "fundingPlanId" TEXT NOT NULL,
    "structure" TEXT NOT NULL,
    "documentUrl" TEXT,
    "signatureStatus" TEXT NOT NULL DEFAULT 'unsigned',

    CONSTRAINT "ReilTitleHolding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReilClosingMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "targetOffsetDays" INTEGER NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "actualDate" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "ReilClosingMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReilClosingRecord" (
    "id" TEXT NOT NULL,
    "fundingPlanId" TEXT NOT NULL,
    "closingDate" TIMESTAMP(3),
    "deedRecordedDate" TIMESTAMP(3),
    "instrumentNumber" TEXT,
    "countyName" TEXT,
    "checklistState" TEXT,

    CONSTRAINT "ReilClosingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailLog_organizationId_idx" ON "EmailLog"("organizationId");

-- CreateIndex
CREATE INDEX "EmailLog_recipientEmail_idx" ON "EmailLog"("recipientEmail");

-- CreateIndex
CREATE INDEX "EmailLog_messageId_idx" ON "EmailLog"("messageId");

-- CreateIndex
CREATE INDEX "EmailLog_templateSlug_idx" ON "EmailLog"("templateSlug");

-- CreateIndex
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");

-- CreateIndex
CREATE INDEX "EmailLog_linkedProjectId_idx" ON "EmailLog"("linkedProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_memberKey_key" ON "Member"("memberKey");

-- CreateIndex
CREATE INDEX "Member_memberFullName_idx" ON "Member"("memberFullName");

-- CreateIndex
CREATE INDEX "Member_officeKey_idx" ON "Member"("officeKey");

-- CreateIndex
CREATE INDEX "Member_modificationTimestamp_idx" ON "Member"("modificationTimestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Office_officeKey_key" ON "Office"("officeKey");

-- CreateIndex
CREATE INDEX "Office_officeName_idx" ON "Office"("officeName");

-- CreateIndex
CREATE INDEX "Office_modificationTimestamp_idx" ON "Office"("modificationTimestamp");

-- CreateIndex
CREATE INDEX "SourcingLead_organizationId_idx" ON "SourcingLead"("organizationId");

-- CreateIndex
CREATE INDEX "SourcingLead_status_idx" ON "SourcingLead"("status");

-- CreateIndex
CREATE INDEX "SourcingLead_sourceVendor_idx" ON "SourcingLead"("sourceVendor");

-- CreateIndex
CREATE UNIQUE INDEX "RehabProject_linkedProjectId_key" ON "RehabProject"("linkedProjectId");

-- CreateIndex
CREATE INDEX "RehabProject_organizationId_idx" ON "RehabProject"("organizationId");

-- CreateIndex
CREATE INDEX "RehabProject_status_idx" ON "RehabProject"("status");

-- CreateIndex
CREATE INDEX "RehabMilestone_rehabProjectId_idx" ON "RehabMilestone"("rehabProjectId");

-- CreateIndex
CREATE INDEX "Vendor_organizationId_idx" ON "Vendor"("organizationId");

-- CreateIndex
CREATE INDEX "VendorBid_vendorId_idx" ON "VendorBid"("vendorId");

-- CreateIndex
CREATE INDEX "VendorBid_milestoneId_idx" ON "VendorBid"("milestoneId");

-- CreateIndex
CREATE INDEX "RehabInvoice_vendorId_idx" ON "RehabInvoice"("vendorId");

-- CreateIndex
CREATE INDEX "RehabInvoice_milestoneId_idx" ON "RehabInvoice"("milestoneId");

-- CreateIndex
CREATE INDEX "ChangeOrder_rehabProjectId_idx" ON "ChangeOrder"("rehabProjectId");

-- CreateIndex
CREATE INDEX "RehabDocument_rehabProjectId_idx" ON "RehabDocument"("rehabProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_email_key" ON "AppUser"("email");

-- CreateIndex
CREATE INDEX "ReilProject_createdById_idx" ON "ReilProject"("createdById");

-- CreateIndex
CREATE INDEX "ReilProject_acquisitionStatus_idx" ON "ReilProject"("acquisitionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ReilPropertyFacts_projectId_key" ON "ReilPropertyFacts"("projectId");

-- CreateIndex
CREATE INDEX "ReilComp_projectId_idx" ON "ReilComp"("projectId");

-- CreateIndex
CREATE INDEX "ReilValuationSnapshot_projectId_fetchedAt_idx" ON "ReilValuationSnapshot"("projectId", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReilPurchaseTerms_projectId_key" ON "ReilPurchaseTerms"("projectId");

-- CreateIndex
CREATE INDEX "StatusEvent_projectId_idx" ON "StatusEvent"("projectId");

-- CreateIndex
CREATE INDEX "ProjectCollaborator_projectId_idx" ON "ProjectCollaborator"("projectId");

-- CreateIndex
CREATE INDEX "ProjectCollaborator_userId_idx" ON "ProjectCollaborator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCollaborator_projectId_userId_key" ON "ProjectCollaborator"("projectId", "userId");

-- CreateIndex
CREATE INDEX "FieldAssignment_projectId_idx" ON "FieldAssignment"("projectId");

-- CreateIndex
CREATE INDEX "FieldAssignment_assignedToId_idx" ON "FieldAssignment"("assignedToId");

-- CreateIndex
CREATE UNIQUE INDEX "ReilFundingPlan_projectId_key" ON "ReilFundingPlan"("projectId");

-- CreateIndex
CREATE INDEX "ReilCapitalSource_fundingPlanId_idx" ON "ReilCapitalSource"("fundingPlanId");

-- CreateIndex
CREATE INDEX "ReilEquityParty_projectId_idx" ON "ReilEquityParty"("projectId");

-- CreateIndex
CREATE INDEX "ReilLoanRecord_projectId_idx" ON "ReilLoanRecord"("projectId");

-- CreateIndex
CREATE INDEX "ReilContributionEntry_projectId_idx" ON "ReilContributionEntry"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ReilTitleHolding_fundingPlanId_key" ON "ReilTitleHolding"("fundingPlanId");

-- CreateIndex
CREATE INDEX "ReilClosingMilestone_projectId_idx" ON "ReilClosingMilestone"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ReilClosingRecord_fundingPlanId_key" ON "ReilClosingRecord"("fundingPlanId");

-- CreateIndex
CREATE INDEX "PayoutWaterfall_financialsId_idx" ON "PayoutWaterfall"("financialsId");

-- AddForeignKey
ALTER TABLE "RehabMilestone" ADD CONSTRAINT "RehabMilestone_rehabProjectId_fkey" FOREIGN KEY ("rehabProjectId") REFERENCES "RehabProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBid" ADD CONSTRAINT "VendorBid_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "RehabMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBid" ADD CONSTRAINT "VendorBid_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RehabInvoice" ADD CONSTRAINT "RehabInvoice_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "RehabMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RehabInvoice" ADD CONSTRAINT "RehabInvoice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_rehabProjectId_fkey" FOREIGN KEY ("rehabProjectId") REFERENCES "RehabProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RehabDocument" ADD CONSTRAINT "RehabDocument_rehabProjectId_fkey" FOREIGN KEY ("rehabProjectId") REFERENCES "RehabProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReilProject" ADD CONSTRAINT "ReilProject_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReilPropertyFacts" ADD CONSTRAINT "ReilPropertyFacts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ReilProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReilComp" ADD CONSTRAINT "ReilComp_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ReilProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReilValuationSnapshot" ADD CONSTRAINT "ReilValuationSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ReilProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReilPurchaseTerms" ADD CONSTRAINT "ReilPurchaseTerms_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ReilProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusEvent" ADD CONSTRAINT "StatusEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ReilProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusEvent" ADD CONSTRAINT "StatusEvent_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCollaborator" ADD CONSTRAINT "ProjectCollaborator_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ReilProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCollaborator" ADD CONSTRAINT "ProjectCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldAssignment" ADD CONSTRAINT "FieldAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldAssignment" ADD CONSTRAINT "FieldAssignment_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldAssignment" ADD CONSTRAINT "FieldAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ReilProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReilFundingPlan" ADD CONSTRAINT "ReilFundingPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ReilProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReilCapitalSource" ADD CONSTRAINT "ReilCapitalSource_fundingPlanId_fkey" FOREIGN KEY ("fundingPlanId") REFERENCES "ReilFundingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReilEquityParty" ADD CONSTRAINT "ReilEquityParty_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ReilProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReilLoanRecord" ADD CONSTRAINT "ReilLoanRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ReilProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReilContributionEntry" ADD CONSTRAINT "ReilContributionEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ReilProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReilTitleHolding" ADD CONSTRAINT "ReilTitleHolding_fundingPlanId_fkey" FOREIGN KEY ("fundingPlanId") REFERENCES "ReilFundingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReilClosingMilestone" ADD CONSTRAINT "ReilClosingMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ReilProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReilClosingRecord" ADD CONSTRAINT "ReilClosingRecord_fundingPlanId_fkey" FOREIGN KEY ("fundingPlanId") REFERENCES "ReilFundingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
