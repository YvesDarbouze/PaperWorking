-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('investor', 'investment_team', 'vendor', 'admin');

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

-- CreateEnum
CREATE TYPE "RenovationTier" AS ENUM ('STAGE', 'REFURBISH', 'RENOVATE', 'GUT', 'DEVELOP');

-- CreateEnum
CREATE TYPE "HoldExpenseCategory" AS ENUM ('tax', 'insurance', 'security', 'maintenance', 'utilities', 'management', 'HOA', 'capex');

-- CreateEnum
CREATE TYPE "OccupancyDuringHold" AS ENUM ('VACANT_FULL_REHAB', 'OCCUPIED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "UtilitiesResponsibility" AS ENUM ('LANDLORD', 'TENANT', 'SPLIT');

-- CreateEnum
CREATE TYPE "PlaidConnectionPurpose" AS ENUM ('RENT_COLLECTION', 'OPERATING_EXPENSES', 'MORTGAGE_LIABILITY', 'RESERVE_ACCOUNT', 'CAPX_ACCOUNT');

-- CreateEnum
CREATE TYPE "PlaidConnectionStatus" AS ENUM ('NOT_CONNECTED', 'ACTIVE', 'PENDING_AUTH', 'ERROR', 'DISCONNECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PlaidConsentEventType" AS ENUM ('INITIAL_CONSENT', 'ADDITIONAL_CONSENT', 'CONSENT_REVOKED', 'CONSENT_UPDATED');

-- CreateEnum
CREATE TYPE "PlaidLiabilityType" AS ENUM ('MORTGAGE', 'STUDENT_LOAN', 'CREDIT_CARD', 'AUTO_LOAN', 'PERSONAL_LOAN');

-- CreateEnum
CREATE TYPE "LoanInterestRateType" AS ENUM ('FIXED', 'VARIABLE');

-- CreateEnum
CREATE TYPE "FinancialTransactionSource" AS ENUM ('MANUAL', 'PLAID_TRANSACTIONS', 'PLAID_LIABILITIES', 'IMPORT_CSV', 'RULE_GENERATED', 'RECONCILIATION_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "FinancialTransactionDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "FinancialTransactionCategory" AS ENUM ('RENT_INCOME', 'LATE_FEE_INCOME', 'PET_RENT_INCOME', 'PARKING_INCOME', 'LAUNDRY_VENDING_INCOME', 'APPLICATION_FEE_INCOME', 'LEASE_TERMINATION_FEE', 'UTILITY_REIMBURSEMENT', 'INSURANCE_CLAIM_INCOME', 'INTEREST_INCOME', 'MISC_INCOME', 'PROPERTY_TAX', 'PROPERTY_INSURANCE', 'HOA_FEES', 'MANAGEMENT_FEES', 'LEASING_FEES', 'MAINTENANCE_REPAIR', 'UTILITIES', 'LANDSCAPING_SNOW', 'PEST_CONTROL', 'CLEANING_TURNOVER', 'MARKETING_ADVERTISING', 'LEGAL_PROFESSIONAL', 'ACCOUNTING_BOOKKEEPING', 'TRAVEL_MILEAGE', 'BANK_CREDIT_CARD_FEES', 'SOFTWARE_TECHNOLOGY', 'LICENSES_PERMITS', 'TURNOVER_COSTS', 'SUPPLIES', 'MISC_EXPENSE', 'MORTGAGE_PRINCIPAL', 'MORTGAGE_INTEREST', 'MORTGAGE_ESCROW_PAYMENT', 'CAPITAL_EXPENDITURE', 'SECURITY_DEPOSIT_RECEIVED', 'SECURITY_DEPOSIT_RETURNED', 'OWNER_DISTRIBUTION', 'CAPITAL_CONTRIBUTION', 'RESERVE_TRANSFER', 'INTER_ACCOUNT_TRANSFER', 'UNCATEGORIZED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "TaxTreatment" AS ENUM ('DEDUCTIBLE', 'DEPRECIABLE', 'NON_DEDUCTIBLE', 'CAPITAL_IMPROVEMENT', 'LIABILITY');

-- CreateEnum
CREATE TYPE "FinancialTransactionStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'AUTO_APPROVED', 'MANUALLY_APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TransactionRuleType" AS ENUM ('PLAID_AUTO_CATEGORIZE', 'RECURRING_MANUAL_ENTRY', 'REMINDER');

-- CreateEnum
CREATE TYPE "TransactionRuleFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "RuleConditionField" AS ENUM ('AMOUNT', 'AMOUNT_RANGE', 'PAYEE_NAME', 'DESCRIPTION', 'MERCHANT_NAME', 'ACCOUNT_ID', 'DATE_RANGE', 'DAY_OF_MONTH', 'TRANSACTION_TYPE', 'PLAID_PERSONAL_FINANCE_CATEGORY', 'PLAID_COUNTERPARTY_NAME');

-- CreateEnum
CREATE TYPE "RuleConditionOperator" AS ENUM ('EQUALS', 'NOT_EQUALS', 'CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'REGEX_MATCH', 'GREATER_THAN', 'LESS_THAN', 'BETWEEN', 'IN_LIST');

-- CreateEnum
CREATE TYPE "EmailDigestMode" AS ENUM ('IMMEDIATE', 'HOURLY_BATCH', 'DAILY_DIGEST');

-- CreateEnum
CREATE TYPE "EmailAlertThreshold" AS ENUM ('ALL', 'HIGH_CONFIDENCE_ONLY', 'MANUAL_APPROVAL_ONLY');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RECONCILED', 'DISCREPANCY_FOUND');

-- CreateEnum
CREATE TYPE "ReconciliationItemType" AS ENUM ('BANK_ONLY', 'PAPERWORKING_ONLY', 'MATCHED', 'DISCREPANCY');

-- CreateEnum
CREATE TYPE "ReconciliationItemStatus" AS ENUM ('PENDING', 'VERIFIED', 'ADJUSTED', 'IGNORED');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('draft', 'published', 'funding', 'closed', 'archived');

-- CreateEnum
CREATE TYPE "DealInvitationStatus" AS ENUM ('pending', 'declined', 'interested');

-- CreateEnum
CREATE TYPE "InvestmentCommitmentCurrency" AS ENUM ('USD', 'CAD', 'EUR', 'GBP');

-- CreateEnum
CREATE TYPE "InvestmentCommitmentType" AS ENUM ('percentage', 'fixed');

-- CreateEnum
CREATE TYPE "InvestmentCommitmentStatus" AS ENUM ('pending', 'confirmed', 'withdrawn');

-- CreateEnum
CREATE TYPE "DealMessageSource" AS ENUM ('platform', 'email_inbound');

-- CreateEnum
CREATE TYPE "DealVisibility" AS ENUM ('marketplace', 'invitation_only', 'private');

-- CreateTable
CREATE TABLE "DealFinancials" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "linkedDealId" TEXT,
    "purchasePrice" BIGINT NOT NULL DEFAULT 0,
    "salePrice" BIGINT NOT NULL DEFAULT 0,
    "closingCosts" BIGINT NOT NULL DEFAULT 0,
    "renovationCosts" BIGINT NOT NULL DEFAULT 0,
    "holdingCosts" BIGINT NOT NULL DEFAULT 0,
    "totalPayouts" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "actualRehabCost" BIGINT,
    "actualRentalIncome" BIGINT,
    "capitalRaiseTarget" BIGINT,
    "committedCapital" BIGINT,
    "daysOccupied" INTEGER,
    "targetPurchasePrice" BIGINT,
    "totalHoldDays" INTEGER,

    CONSTRAINT "DealFinancials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutWaterfall" (
    "id" TEXT NOT NULL,
    "financialsId" TEXT NOT NULL,
    "payeeName" TEXT NOT NULL,
    "payeeRole" TEXT NOT NULL,
    "payoutAmount" BIGINT NOT NULL,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "linkedItemId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoutWaterfall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhaseTransition" (
    "id" TEXT NOT NULL,
    "linkedProjectId" TEXT NOT NULL,
    "fromPhase" TEXT NOT NULL,
    "toPhase" TEXT NOT NULL,
    "transitionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userUid" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "PhaseTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationLog" (
    "id" TEXT NOT NULL,
    "linkedProjectId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "threadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "providerMessageId" TEXT,

    CONSTRAINT "CommunicationLog_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "listingKey" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "standardStatus" TEXT,
    "listPrice" BIGINT,
    "unparsedAddress" TEXT,
    "bedroomsTotal" INTEGER,
    "bathroomsFull" INTEGER,
    "bathroomsHalf" INTEGER,
    "livingArea" INTEGER,
    "lotSizeAcres" DOUBLE PRECISION,
    "yearBuilt" INTEGER,
    "publicRemarks" TEXT,
    "media" TEXT,
    "bridgeModificationTimestamp" TIMESTAMP(3) NOT NULL,
    "coordinates" TEXT,
    "feedTypes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BridgeSyncState" (
    "id" TEXT NOT NULL,
    "mostRecentModificationTimestamp" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BridgeSyncState_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "JobRecord" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payload" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "enqueuedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRecord_pkey" PRIMARY KEY ("id")
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
    "role" TEXT,
    "accountType" "AccountType" NOT NULL DEFAULT 'investor',
    "stripeCustomerId" TEXT,
    "syntheticAgent" BOOLEAN NOT NULL DEFAULT false,
    "agentPersona" TEXT,
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
    "syntheticAgent" BOOLEAN NOT NULL DEFAULT false,
    "listedByAgent" TEXT,
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

-- CreateTable
CREATE TABLE "HoldCostRecord" (
    "id" TEXT NOT NULL,
    "linkedProjectId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "category" "HoldExpenseCategory" NOT NULL,
    "monthlyAmount" BIGINT NOT NULL,
    "periodMonth" TEXT NOT NULL,
    "sourceTag" TEXT NOT NULL DEFAULT 'user_actual',
    "carriedFromFund" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HoldCostRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HoldRehabSpend" (
    "id" TEXT NOT NULL,
    "linkedProjectId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "spendDate" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "vendorRef" TEXT,
    "receiptRef" TEXT,
    "sourceTag" TEXT NOT NULL DEFAULT 'user_actual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HoldRehabSpend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HoldValueEntry" (
    "id" TEXT NOT NULL,
    "linkedProjectId" TEXT NOT NULL,
    "value" BIGINT NOT NULL,
    "valueDate" TIMESTAMP(3) NOT NULL,
    "sourceTag" TEXT NOT NULL DEFAULT 'user_assumption',
    "documentRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HoldValueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "accessToken" TEXT NOT NULL,
    "itemId" TEXT,
    "lastSyncCursor" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "connectionType" TEXT NOT NULL DEFAULT 'rent_deposits',
    "institutionName" TEXT,
    "institutionId" TEXT,
    "accountId" TEXT,
    "accountName" TEXT,
    "accountMask" TEXT,
    "webhookUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "plaidAccountId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mask" TEXT,
    "officialName" TEXT,
    "type" TEXT NOT NULL,
    "subtype" TEXT,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "limit" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "plaidId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT[],
    "merchantName" TEXT,
    "pending" BOOLEAN NOT NULL DEFAULT false,
    "reiCategory" TEXT,
    "confidence" DOUBLE PRECISION,
    "projectId" TEXT,
    "reviewedByUser" BOOLEAN NOT NULL DEFAULT false,
    "attributedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MortgageLiability" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "lender" TEXT,
    "balance" BIGINT NOT NULL,
    "originalBalance" BIGINT,
    "interestRatePct" DOUBLE PRECISION,
    "apr" DOUBLE PRECISION,
    "nextPaymentDueDate" TIMESTAMP(3),
    "nextPaymentAmount" BIGINT,
    "ytdInterestPaid" BIGINT,
    "escrowBalance" BIGINT,
    "lastPaymentAmount" BIGINT,
    "lastPaymentDate" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MortgageLiability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaidConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "accessToken" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "accountId" TEXT,
    "institutionName" TEXT,
    "institutionId" TEXT,
    "institutionLogoUrl" TEXT,
    "accountName" TEXT,
    "accountMask" TEXT,
    "accountSubtype" TEXT,
    "connectionPurpose" "PlaidConnectionPurpose" NOT NULL DEFAULT 'OPERATING_EXPENSES',
    "status" "PlaidConnectionStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
    "lastSyncCursor" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "syncErrorCount" INTEGER NOT NULL DEFAULT 0,
    "lastSyncErrorMessage" TEXT,
    "webhookUrl" TEXT,
    "consentedProducts" JSONB,
    "consentedDataScopes" JSONB,
    "consentedUseCases" JSONB,
    "consentTimestamp" TIMESTAMP(3),
    "consentVersion" TEXT,
    "additionalConsentedProducts" JSONB,
    "requestId" TEXT,
    "linkSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaidConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaidConsentEvent" (
    "id" TEXT NOT NULL,
    "plaidConnectionId" TEXT NOT NULL,
    "eventType" "PlaidConsentEventType" NOT NULL,
    "productsBefore" JSONB,
    "productsAfter" JSONB,
    "dataScopesBefore" JSONB,
    "dataScopesAfter" JSONB,
    "useCasesBefore" JSONB,
    "useCasesAfter" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggeredBy" TEXT NOT NULL,
    "plaidEventId" TEXT,
    "requestId" TEXT,
    "linkSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaidConsentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaidRawTransaction" (
    "id" TEXT NOT NULL,
    "plaidConnectionId" TEXT NOT NULL,
    "plaidTransactionId" TEXT NOT NULL,
    "plaidAccountId" TEXT NOT NULL,
    "rawPlaidData" JSONB NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "isoCurrencyCode" TEXT DEFAULT 'USD',
    "direction" "FinancialTransactionDirection" NOT NULL,
    "name" TEXT NOT NULL,
    "merchantName" TEXT,
    "originalDescription" TEXT,
    "paymentChannel" TEXT,
    "pending" BOOLEAN NOT NULL DEFAULT false,
    "pendingTransactionId" TEXT,
    "authorizedDate" TIMESTAMP(3),
    "postedDate" TIMESTAMP(3),
    "category" TEXT[],
    "personalFinanceCategory" JSONB,
    "counterparties" JSONB,
    "location" JSONB,
    "paymentMeta" JSONB,
    "removed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaidRawTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaidLiability" (
    "id" TEXT NOT NULL,
    "plaidConnectionId" TEXT NOT NULL,
    "projectId" TEXT,
    "liabilityType" "PlaidLiabilityType" NOT NULL DEFAULT 'MORTGAGE',
    "accountId" TEXT NOT NULL,
    "loanName" TEXT,
    "loanType" TEXT,
    "originationDate" TIMESTAMP(3),
    "originationPrincipalAmount" DECIMAL(14,2),
    "interestRateType" "LoanInterestRateType",
    "apr" DECIMAL(6,4),
    "loanTermMonths" INTEGER,
    "maturityDate" TIMESTAMP(3),
    "nextPaymentDueDate" TIMESTAMP(3),
    "nextPaymentAmount" DECIMAL(12,2),
    "lastPaymentDate" TIMESTAMP(3),
    "lastPaymentAmount" DECIMAL(12,2),
    "lastStatementBalance" DECIMAL(14,2),
    "lastStatementIssueDate" TIMESTAMP(3),
    "ytdInterestPaid" DECIMAL(12,2),
    "ytdPrincipalPaid" DECIMAL(12,2),
    "escrowBalance" DECIMAL(12,2),
    "propertyAddress" JSONB,
    "rawLiabilityData" JSONB NOT NULL,
    "lastFetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaidLiability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "FinancialTransactionSource" NOT NULL DEFAULT 'MANUAL',
    "plaidTransactionId" TEXT,
    "plaidLiabilityId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "direction" "FinancialTransactionDirection" NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "postedDate" TIMESTAMP(3),
    "payee" TEXT NOT NULL,
    "description" TEXT,
    "category" "FinancialTransactionCategory" NOT NULL DEFAULT 'UNCATEGORIZED',
    "subCategory" TEXT,
    "matchedLeaseId" TEXT,
    "matchedTenantId" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringRuleId" TEXT,
    "isSplit" BOOLEAN NOT NULL DEFAULT false,
    "parentTransactionId" TEXT,
    "taxTreatment" "TaxTreatment",
    "receiptUrl" TEXT,
    "notes" TEXT,
    "status" "FinancialTransactionStatus" NOT NULL DEFAULT 'DRAFT',
    "confidenceScore" DOUBLE PRECISION,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "plaidPersonalFinanceCategory" TEXT,
    "plaidPrimaryCategory" TEXT,
    "plaidDetailedCategory" TEXT,
    "kpiImpactSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionRule" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ruleType" "TransactionRuleType" NOT NULL,
    "frequency" "TransactionRuleFrequency",
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "conditions" JSONB NOT NULL,
    "action" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "lastMatchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionSplit" (
    "id" TEXT NOT NULL,
    "parentTransactionId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "category" "FinancialTransactionCategory" NOT NULL DEFAULT 'UNCATEGORIZED',
    "subCategory" TEXT,
    "matchedLeaseId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaidWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "processingResult" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaidWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotificationPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailTransactionAlerts" BOOLEAN NOT NULL DEFAULT true,
    "emailAlertCategories" TEXT[],
    "emailAlertMinAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "emailDigestMode" "EmailDigestMode" NOT NULL DEFAULT 'IMMEDIATE',
    "emailAlertThreshold" "EmailAlertThreshold" NOT NULL DEFAULT 'ALL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentEmailLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionId" TEXT,
    "templateType" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "messageId" TEXT,

    CONSTRAINT "SentEmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationPeriod" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "plaidConnectionId" TEXT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'OPEN',
    "bankStatementBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paperWorkingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "difference" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reconciledAt" TIMESTAMP(3),
    "reconciledBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconciliationPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationItem" (
    "id" TEXT NOT NULL,
    "reconciliationPeriodId" TEXT NOT NULL,
    "financialTransactionId" TEXT,
    "plaidTransactionId" TEXT,
    "itemType" "ReconciliationItemType" NOT NULL,
    "bankAmount" DECIMAL(12,2),
    "paperWorkingAmount" DECIMAL(12,2),
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "ReconciliationItemStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconciliationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firebaseUid" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "displayName" TEXT,
    "phone" TEXT,
    "role" TEXT DEFAULT 'investor',
    "accountType" TEXT DEFAULT 'investor',
    "timezone" TEXT,
    "avatarUrl" TEXT,
    "companyName" TEXT,
    "twoFaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB,
    "syntheticAgent" BOOLEAN NOT NULL DEFAULT false,
    "agentPersona" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "settings" JSONB,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'Contributor',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationInvite" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Contributor',
    "invitedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "name" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "status" TEXT DEFAULT 'active',
    "currentPhase" INTEGER NOT NULL DEFAULT 1,
    "purchasePrice" DOUBLE PRECISION,
    "visibility" TEXT DEFAULT 'private',
    "phaseData" JSONB,
    "subcollections" JSONB,
    "organizationId" TEXT,
    "syntheticAgent" BOOLEAN NOT NULL DEFAULT false,
    "listedByAgent" TEXT,
    "userId" TEXT,
    "investorId" TEXT,
    "dealId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT,
    "storageKey" TEXT,
    "sizeBytes" INTEGER,
    "uploadedBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxItem" (
    "id" TEXT NOT NULL,
    "recipientUid" TEXT NOT NULL,
    "senderUid" TEXT,
    "type" TEXT NOT NULL DEFAULT 'notification',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboxItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorFollower" (
    "id" TEXT NOT NULL,
    "followerUid" TEXT NOT NULL,
    "targetUid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestorFollower_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskAssignment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "assigneeId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "dueAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppConfig" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "MarketplaceListing" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "syntheticAgent" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentProjectId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "syntheticAgent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "plan" TEXT,
    "status" TEXT,
    "syntheticAgent" BOOLEAN NOT NULL DEFAULT false,
    "stripeTestMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "purchasePrice" DECIMAL(14,2) NOT NULL,
    "rehabCost" DECIMAL(14,2) NOT NULL,
    "arv" DECIMAL(14,2) NOT NULL,
    "holdingCosts" DECIMAL(14,2) NOT NULL,
    "projectedRoi" DECIMAL(8,4) NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'draft',
    "visibility" "DealVisibility" NOT NULL DEFAULT 'private',
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealBroadcast" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientEmails" JSONB NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "includeBusinessCard" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealInvitation" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "inviteeEmail" TEXT NOT NULL,
    "inviteeUserId" TEXT,
    "status" "DealInvitationStatus" NOT NULL DEFAULT 'pending',
    "businessCardShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentCommitment" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" "InvestmentCommitmentCurrency" NOT NULL DEFAULT 'USD',
    "type" "InvestmentCommitmentType" NOT NULL DEFAULT 'fixed',
    "status" "InvestmentCommitmentStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestmentCommitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealMessage" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "senderId" TEXT,
    "senderEmail" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" "DealMessageSource" NOT NULL DEFAULT 'platform',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "investmentCriteria" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "sequenceNumber" BIGSERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUid" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetResource" TEXT NOT NULL,
    "targetResourceId" TEXT,
    "status" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL DEFAULT '127.0.0.1',
    "userAgent" TEXT,
    "reasonCode" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "previousHash" TEXT NOT NULL DEFAULT 'GENESIS',
    "entryHash" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DealFinancials_linkedDealId_key" ON "DealFinancials"("linkedDealId");

-- CreateIndex
CREATE INDEX "DealFinancials_organizationId_idx" ON "DealFinancials"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutWaterfall_linkedItemId_key" ON "PayoutWaterfall"("linkedItemId");

-- CreateIndex
CREATE INDEX "PayoutWaterfall_financialsId_idx" ON "PayoutWaterfall"("financialsId");

-- CreateIndex
CREATE INDEX "PhaseTransition_linkedProjectId_idx" ON "PhaseTransition"("linkedProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationLog_providerMessageId_key" ON "CommunicationLog"("providerMessageId");

-- CreateIndex
CREATE INDEX "CommunicationLog_linkedProjectId_idx" ON "CommunicationLog"("linkedProjectId");

-- CreateIndex
CREATE INDEX "CommunicationLog_organizationId_idx" ON "CommunicationLog"("organizationId");

-- CreateIndex
CREATE INDEX "CommunicationLog_threadId_idx" ON "CommunicationLog"("threadId");

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
CREATE UNIQUE INDEX "Property_listingKey_key" ON "Property"("listingKey");

-- CreateIndex
CREATE UNIQUE INDEX "Property_listingId_key" ON "Property"("listingId");

-- CreateIndex
CREATE INDEX "Property_standardStatus_idx" ON "Property"("standardStatus");

-- CreateIndex
CREATE INDEX "Property_bridgeModificationTimestamp_idx" ON "Property"("bridgeModificationTimestamp");

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
CREATE INDEX "JobRecord_type_status_idx" ON "JobRecord"("type", "status");

-- CreateIndex
CREATE INDEX "JobRecord_enqueuedAt_idx" ON "JobRecord"("enqueuedAt");

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
CREATE UNIQUE INDEX "AppUser_stripeCustomerId_key" ON "AppUser"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "ReilProject_createdById_idx" ON "ReilProject"("createdById");

-- CreateIndex
CREATE INDEX "ReilProject_acquisitionStatus_idx" ON "ReilProject"("acquisitionStatus");

-- CreateIndex
CREATE INDEX "ReilProject_createdById_currentPhase_idx" ON "ReilProject"("createdById", "currentPhase");

-- CreateIndex
CREATE INDEX "ReilProject_createdById_acquisitionStatus_idx" ON "ReilProject"("createdById", "acquisitionStatus");

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
CREATE INDEX "HoldCostRecord_linkedProjectId_idx" ON "HoldCostRecord"("linkedProjectId");

-- CreateIndex
CREATE INDEX "HoldCostRecord_organizationId_idx" ON "HoldCostRecord"("organizationId");

-- CreateIndex
CREATE INDEX "HoldCostRecord_category_idx" ON "HoldCostRecord"("category");

-- CreateIndex
CREATE UNIQUE INDEX "HoldCostRecord_linkedProjectId_category_periodMonth_key" ON "HoldCostRecord"("linkedProjectId", "category", "periodMonth");

-- CreateIndex
CREATE INDEX "HoldRehabSpend_linkedProjectId_idx" ON "HoldRehabSpend"("linkedProjectId");

-- CreateIndex
CREATE INDEX "HoldRehabSpend_organizationId_idx" ON "HoldRehabSpend"("organizationId");

-- CreateIndex
CREATE INDEX "HoldValueEntry_linkedProjectId_idx" ON "HoldValueEntry"("linkedProjectId");

-- CreateIndex
CREATE INDEX "HoldValueEntry_valueDate_idx" ON "HoldValueEntry"("valueDate");

-- CreateIndex
CREATE UNIQUE INDEX "BankConnection_itemId_key" ON "BankConnection"("itemId");

-- CreateIndex
CREATE INDEX "BankConnection_userId_idx" ON "BankConnection"("userId");

-- CreateIndex
CREATE INDEX "BankConnection_projectId_idx" ON "BankConnection"("projectId");

-- CreateIndex
CREATE INDEX "BankConnection_connectionType_idx" ON "BankConnection"("connectionType");

-- CreateIndex
CREATE INDEX "BankConnection_userId_status_idx" ON "BankConnection"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_plaidAccountId_key" ON "BankAccount"("plaidAccountId");

-- CreateIndex
CREATE INDEX "BankAccount_connectionId_idx" ON "BankAccount"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_plaidId_key" ON "Transaction"("plaidId");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_projectId_idx" ON "Transaction"("projectId");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");

-- CreateIndex
CREATE INDEX "Transaction_reiCategory_idx" ON "Transaction"("reiCategory");

-- CreateIndex
CREATE INDEX "Transaction_plaidId_idx" ON "Transaction"("plaidId");

-- CreateIndex
CREATE INDEX "Transaction_connectionId_idx" ON "Transaction"("connectionId");

-- CreateIndex
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

-- CreateIndex
CREATE INDEX "Transaction_projectId_reiCategory_idx" ON "Transaction"("projectId", "reiCategory");

-- CreateIndex
CREATE INDEX "MortgageLiability_connectionId_idx" ON "MortgageLiability"("connectionId");

-- CreateIndex
CREATE INDEX "MortgageLiability_accountId_idx" ON "MortgageLiability"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "MortgageLiability_connectionId_accountId_key" ON "MortgageLiability"("connectionId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaidConnection_itemId_key" ON "PlaidConnection"("itemId");

-- CreateIndex
CREATE INDEX "PlaidConnection_userId_idx" ON "PlaidConnection"("userId");

-- CreateIndex
CREATE INDEX "PlaidConnection_projectId_idx" ON "PlaidConnection"("projectId");

-- CreateIndex
CREATE INDEX "PlaidConnection_status_idx" ON "PlaidConnection"("status");

-- CreateIndex
CREATE INDEX "PlaidConnection_userId_status_idx" ON "PlaidConnection"("userId", "status");

-- CreateIndex
CREATE INDEX "PlaidConsentEvent_plaidConnectionId_idx" ON "PlaidConsentEvent"("plaidConnectionId");

-- CreateIndex
CREATE INDEX "PlaidConsentEvent_plaidConnectionId_eventType_idx" ON "PlaidConsentEvent"("plaidConnectionId", "eventType");

-- CreateIndex
CREATE INDEX "PlaidConsentEvent_timestamp_idx" ON "PlaidConsentEvent"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "PlaidRawTransaction_plaidTransactionId_key" ON "PlaidRawTransaction"("plaidTransactionId");

-- CreateIndex
CREATE INDEX "PlaidRawTransaction_plaidConnectionId_idx" ON "PlaidRawTransaction"("plaidConnectionId");

-- CreateIndex
CREATE INDEX "PlaidRawTransaction_plaidAccountId_idx" ON "PlaidRawTransaction"("plaidAccountId");

-- CreateIndex
CREATE INDEX "PlaidRawTransaction_postedDate_idx" ON "PlaidRawTransaction"("postedDate");

-- CreateIndex
CREATE INDEX "PlaidRawTransaction_pending_idx" ON "PlaidRawTransaction"("pending");

-- CreateIndex
CREATE INDEX "PlaidRawTransaction_removed_idx" ON "PlaidRawTransaction"("removed");

-- CreateIndex
CREATE INDEX "PlaidRawTransaction_plaidConnectionId_postedDate_idx" ON "PlaidRawTransaction"("plaidConnectionId", "postedDate");

-- CreateIndex
CREATE INDEX "PlaidLiability_plaidConnectionId_idx" ON "PlaidLiability"("plaidConnectionId");

-- CreateIndex
CREATE INDEX "PlaidLiability_projectId_idx" ON "PlaidLiability"("projectId");

-- CreateIndex
CREATE INDEX "PlaidLiability_liabilityType_idx" ON "PlaidLiability"("liabilityType");

-- CreateIndex
CREATE INDEX "PlaidLiability_nextPaymentDueDate_idx" ON "PlaidLiability"("nextPaymentDueDate");

-- CreateIndex
CREATE UNIQUE INDEX "PlaidLiability_plaidConnectionId_accountId_key" ON "PlaidLiability"("plaidConnectionId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialTransaction_plaidTransactionId_key" ON "FinancialTransaction"("plaidTransactionId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_projectId_idx" ON "FinancialTransaction"("projectId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_userId_idx" ON "FinancialTransaction"("userId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_source_idx" ON "FinancialTransaction"("source");

-- CreateIndex
CREATE INDEX "FinancialTransaction_category_idx" ON "FinancialTransaction"("category");

-- CreateIndex
CREATE INDEX "FinancialTransaction_status_idx" ON "FinancialTransaction"("status");

-- CreateIndex
CREATE INDEX "FinancialTransaction_transactionDate_idx" ON "FinancialTransaction"("transactionDate");

-- CreateIndex
CREATE INDEX "FinancialTransaction_projectId_transactionDate_idx" ON "FinancialTransaction"("projectId", "transactionDate");

-- CreateIndex
CREATE INDEX "FinancialTransaction_projectId_category_idx" ON "FinancialTransaction"("projectId", "category");

-- CreateIndex
CREATE INDEX "FinancialTransaction_projectId_status_idx" ON "FinancialTransaction"("projectId", "status");

-- CreateIndex
CREATE INDEX "FinancialTransaction_matchedLeaseId_idx" ON "FinancialTransaction"("matchedLeaseId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_matchedTenantId_idx" ON "FinancialTransaction"("matchedTenantId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_recurringRuleId_idx" ON "FinancialTransaction"("recurringRuleId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_parentTransactionId_idx" ON "FinancialTransaction"("parentTransactionId");

-- CreateIndex
CREATE INDEX "TransactionRule_projectId_idx" ON "TransactionRule"("projectId");

-- CreateIndex
CREATE INDEX "TransactionRule_userId_idx" ON "TransactionRule"("userId");

-- CreateIndex
CREATE INDEX "TransactionRule_isActive_idx" ON "TransactionRule"("isActive");

-- CreateIndex
CREATE INDEX "TransactionRule_projectId_isActive_priority_idx" ON "TransactionRule"("projectId", "isActive", "priority");

-- CreateIndex
CREATE INDEX "TransactionSplit_parentTransactionId_idx" ON "TransactionSplit"("parentTransactionId");

-- CreateIndex
CREATE INDEX "PlaidWebhookEvent_itemId_idx" ON "PlaidWebhookEvent"("itemId");

-- CreateIndex
CREATE INDEX "PlaidWebhookEvent_eventType_idx" ON "PlaidWebhookEvent"("eventType");

-- CreateIndex
CREATE INDEX "PlaidWebhookEvent_createdAt_idx" ON "PlaidWebhookEvent"("createdAt");

-- CreateIndex
CREATE INDEX "PlaidWebhookEvent_itemId_eventType_idx" ON "PlaidWebhookEvent"("itemId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationPreferences_userId_key" ON "UserNotificationPreferences"("userId");

-- CreateIndex
CREATE INDEX "UserNotificationPreferences_userId_idx" ON "UserNotificationPreferences"("userId");

-- CreateIndex
CREATE INDEX "SentEmailLog_userId_idx" ON "SentEmailLog"("userId");

-- CreateIndex
CREATE INDEX "SentEmailLog_userId_sentAt_idx" ON "SentEmailLog"("userId", "sentAt");

-- CreateIndex
CREATE INDEX "SentEmailLog_templateType_idx" ON "SentEmailLog"("templateType");

-- CreateIndex
CREATE UNIQUE INDEX "SentEmailLog_transactionId_templateType_key" ON "SentEmailLog"("transactionId", "templateType");

-- CreateIndex
CREATE INDEX "ReconciliationPeriod_projectId_idx" ON "ReconciliationPeriod"("projectId");

-- CreateIndex
CREATE INDEX "ReconciliationPeriod_plaidConnectionId_idx" ON "ReconciliationPeriod"("plaidConnectionId");

-- CreateIndex
CREATE INDEX "ReconciliationPeriod_status_idx" ON "ReconciliationPeriod"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ReconciliationPeriod_projectId_month_year_key" ON "ReconciliationPeriod"("projectId", "month", "year");

-- CreateIndex
CREATE INDEX "ReconciliationItem_reconciliationPeriodId_idx" ON "ReconciliationItem"("reconciliationPeriodId");

-- CreateIndex
CREATE INDEX "ReconciliationItem_financialTransactionId_idx" ON "ReconciliationItem"("financialTransactionId");

-- CreateIndex
CREATE INDEX "ReconciliationItem_plaidTransactionId_idx" ON "ReconciliationItem"("plaidTransactionId");

-- CreateIndex
CREATE INDEX "ReconciliationItem_itemType_idx" ON "ReconciliationItem"("itemType");

-- CreateIndex
CREATE INDEX "ReconciliationItem_status_idx" ON "ReconciliationItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE INDEX "OrganizationMember_email_idx" ON "OrganizationMember"("email");

-- CreateIndex
CREATE INDEX "OrganizationInvite_organizationId_idx" ON "OrganizationInvite"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationInvite_email_idx" ON "OrganizationInvite"("email");

-- CreateIndex
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "ProjectDocument_projectId_idx" ON "ProjectDocument"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

-- CreateIndex
CREATE INDEX "InboxItem_recipientUid_idx" ON "InboxItem"("recipientUid");

-- CreateIndex
CREATE INDEX "InboxItem_read_idx" ON "InboxItem"("read");

-- CreateIndex
CREATE INDEX "InvestorFollower_targetUid_idx" ON "InvestorFollower"("targetUid");

-- CreateIndex
CREATE UNIQUE INDEX "InvestorFollower_followerUid_targetUid_key" ON "InvestorFollower"("followerUid", "targetUid");

-- CreateIndex
CREATE INDEX "TaskAssignment_projectId_idx" ON "TaskAssignment"("projectId");

-- CreateIndex
CREATE INDEX "TaskAssignment_assigneeId_idx" ON "TaskAssignment"("assigneeId");

-- CreateIndex
CREATE INDEX "Message_threadId_idx" ON "Message"("threadId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_recipientId_idx" ON "Message"("recipientId");

-- CreateIndex
CREATE INDEX "Message_attachmentProjectId_idx" ON "Message"("attachmentProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_slug_key" ON "Deal"("slug");

-- CreateIndex
CREATE INDEX "Deal_creatorId_idx" ON "Deal"("creatorId");

-- CreateIndex
CREATE INDEX "Deal_status_idx" ON "Deal"("status");

-- CreateIndex
CREATE INDEX "Deal_visibility_idx" ON "Deal"("visibility");

-- CreateIndex
CREATE INDEX "Deal_slug_idx" ON "Deal"("slug");

-- CreateIndex
CREATE INDEX "DealBroadcast_dealId_idx" ON "DealBroadcast"("dealId");

-- CreateIndex
CREATE INDEX "DealBroadcast_senderId_idx" ON "DealBroadcast"("senderId");

-- CreateIndex
CREATE INDEX "DealInvitation_dealId_idx" ON "DealInvitation"("dealId");

-- CreateIndex
CREATE INDEX "DealInvitation_inviteeEmail_idx" ON "DealInvitation"("inviteeEmail");

-- CreateIndex
CREATE INDEX "DealInvitation_status_idx" ON "DealInvitation"("status");

-- CreateIndex
CREATE INDEX "InvestmentCommitment_dealId_idx" ON "InvestmentCommitment"("dealId");

-- CreateIndex
CREATE INDEX "InvestmentCommitment_investorId_idx" ON "InvestmentCommitment"("investorId");

-- CreateIndex
CREATE INDEX "InvestmentCommitment_status_idx" ON "InvestmentCommitment"("status");

-- CreateIndex
CREATE INDEX "DealMessage_dealId_idx" ON "DealMessage"("dealId");

-- CreateIndex
CREATE INDEX "DealMessage_senderId_idx" ON "DealMessage"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessCard_userId_key" ON "BusinessCard"("userId");

-- CreateIndex
CREATE INDEX "BusinessCard_userId_idx" ON "BusinessCard"("userId");

-- CreateIndex
CREATE INDEX "BusinessCard_email_idx" ON "BusinessCard"("email");

-- CreateIndex
CREATE INDEX "AdminAuditLog_timestamp_idx" ON "AdminAuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AdminAuditLog_actorUid_idx" ON "AdminAuditLog"("actorUid");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");

-- CreateIndex
CREATE INDEX "AdminAuditLog_severity_idx" ON "AdminAuditLog"("severity");

-- CreateIndex
CREATE INDEX "AdminAuditLog_sequenceNumber_idx" ON "AdminAuditLog"("sequenceNumber");

-- AddForeignKey
ALTER TABLE "PayoutWaterfall" ADD CONSTRAINT "PayoutWaterfall_financialsId_fkey" FOREIGN KEY ("financialsId") REFERENCES "DealFinancials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "BankConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "BankConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MortgageLiability" ADD CONSTRAINT "MortgageLiability_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "BankConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaidConnection" ADD CONSTRAINT "PlaidConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaidConnection" ADD CONSTRAINT "PlaidConnection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ReilProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaidConsentEvent" ADD CONSTRAINT "PlaidConsentEvent_plaidConnectionId_fkey" FOREIGN KEY ("plaidConnectionId") REFERENCES "PlaidConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaidRawTransaction" ADD CONSTRAINT "PlaidRawTransaction_plaidConnectionId_fkey" FOREIGN KEY ("plaidConnectionId") REFERENCES "PlaidConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaidLiability" ADD CONSTRAINT "PlaidLiability_plaidConnectionId_fkey" FOREIGN KEY ("plaidConnectionId") REFERENCES "PlaidConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaidLiability" ADD CONSTRAINT "PlaidLiability_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ReilProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ReilProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_plaidTransactionId_fkey" FOREIGN KEY ("plaidTransactionId") REFERENCES "PlaidRawTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_plaidLiabilityId_fkey" FOREIGN KEY ("plaidLiabilityId") REFERENCES "PlaidLiability"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_recurringRuleId_fkey" FOREIGN KEY ("recurringRuleId") REFERENCES "TransactionRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_parentTransactionId_fkey" FOREIGN KEY ("parentTransactionId") REFERENCES "FinancialTransaction"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TransactionRule" ADD CONSTRAINT "TransactionRule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ReilProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionRule" ADD CONSTRAINT "TransactionRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionSplit" ADD CONSTRAINT "TransactionSplit_parentTransactionId_fkey" FOREIGN KEY ("parentTransactionId") REFERENCES "FinancialTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotificationPreferences" ADD CONSTRAINT "UserNotificationPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentEmailLog" ADD CONSTRAINT "SentEmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationPeriod" ADD CONSTRAINT "ReconciliationPeriod_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ReilProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationPeriod" ADD CONSTRAINT "ReconciliationPeriod_plaidConnectionId_fkey" FOREIGN KEY ("plaidConnectionId") REFERENCES "PlaidConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationPeriod" ADD CONSTRAINT "ReconciliationPeriod_reconciledBy_fkey" FOREIGN KEY ("reconciledBy") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationItem" ADD CONSTRAINT "ReconciliationItem_reconciliationPeriodId_fkey" FOREIGN KEY ("reconciliationPeriodId") REFERENCES "ReconciliationPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationItem" ADD CONSTRAINT "ReconciliationItem_financialTransactionId_fkey" FOREIGN KEY ("financialTransactionId") REFERENCES "FinancialTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationItem" ADD CONSTRAINT "ReconciliationItem_plaidTransactionId_fkey" FOREIGN KEY ("plaidTransactionId") REFERENCES "PlaidRawTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvite" ADD CONSTRAINT "OrganizationInvite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_recipientUid_fkey" FOREIGN KEY ("recipientUid") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_senderUid_fkey" FOREIGN KEY ("senderUid") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorFollower" ADD CONSTRAINT "InvestorFollower_followerUid_fkey" FOREIGN KEY ("followerUid") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorFollower" ADD CONSTRAINT "InvestorFollower_targetUid_fkey" FOREIGN KEY ("targetUid") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_attachmentProjectId_fkey" FOREIGN KEY ("attachmentProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealBroadcast" ADD CONSTRAINT "DealBroadcast_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealBroadcast" ADD CONSTRAINT "DealBroadcast_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealInvitation" ADD CONSTRAINT "DealInvitation_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealInvitation" ADD CONSTRAINT "DealInvitation_inviteeUserId_fkey" FOREIGN KEY ("inviteeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentCommitment" ADD CONSTRAINT "InvestmentCommitment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentCommitment" ADD CONSTRAINT "InvestmentCommitment_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealMessage" ADD CONSTRAINT "DealMessage_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealMessage" ADD CONSTRAINT "DealMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessCard" ADD CONSTRAINT "BusinessCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
