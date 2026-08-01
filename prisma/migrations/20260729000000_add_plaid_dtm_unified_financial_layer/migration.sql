-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add_plaid_dtm_unified_financial_layer
-- Created:   2026-07-29
-- Summary:   Adds Plaid Data Transparency Messaging (DTM) consent tracking
--            and a unified financial ledger with optional Plaid integration.
--
--  NEW ENUMS  (17):
--    PlaidConnectionPurpose, PlaidConnectionStatus, PlaidConsentEventType,
--    PlaidLiabilityType, LoanInterestRateType, FinancialTransactionSource,
--    FinancialTransactionDirection, FinancialTransactionCategory,
--    TaxTreatment, FinancialTransactionStatus, TransactionRuleType,
--    TransactionRuleFrequency, RuleConditionField, RuleConditionOperator
--
--  NEW TABLES (8):
--    PlaidConnection, PlaidConsentEvent, PlaidRawTransaction,
--    PlaidLiability, FinancialTransaction, TransactionRule,
--    TransactionSplit, PlaidWebhookEvent
--
--  ADDITIVE ONLY: Existing tables (BankConnection, BankAccount,
--    Transaction, MortgageLiability) are UNCHANGED.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Enums ────────────────────────────────────────────────────────────────────

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
CREATE TYPE "FinancialTransactionCategory" AS ENUM (
  'RENT_INCOME', 'LATE_FEE_INCOME', 'PET_RENT_INCOME', 'PARKING_INCOME',
  'LAUNDRY_VENDING_INCOME', 'APPLICATION_FEE_INCOME', 'LEASE_TERMINATION_FEE',
  'UTILITY_REIMBURSEMENT', 'INSURANCE_CLAIM_INCOME', 'INTEREST_INCOME', 'MISC_INCOME',
  'PROPERTY_TAX', 'PROPERTY_INSURANCE', 'HOA_FEES', 'MANAGEMENT_FEES', 'LEASING_FEES',
  'MAINTENANCE_REPAIR', 'UTILITIES', 'LANDSCAPING_SNOW', 'PEST_CONTROL',
  'CLEANING_TURNOVER', 'MARKETING_ADVERTISING', 'LEGAL_PROFESSIONAL',
  'ACCOUNTING_BOOKKEEPING', 'TRAVEL_MILEAGE', 'BANK_CREDIT_CARD_FEES',
  'SOFTWARE_TECHNOLOGY', 'LICENSES_PERMITS', 'TURNOVER_COSTS', 'SUPPLIES',
  'MISC_EXPENSE',
  'MORTGAGE_PRINCIPAL', 'MORTGAGE_INTEREST', 'MORTGAGE_ESCROW_PAYMENT',
  'CAPITAL_EXPENDITURE',
  'SECURITY_DEPOSIT_RECEIVED', 'SECURITY_DEPOSIT_RETURNED', 'OWNER_DISTRIBUTION',
  'CAPITAL_CONTRIBUTION', 'RESERVE_TRANSFER', 'INTER_ACCOUNT_TRANSFER',
  'UNCATEGORIZED', 'NEEDS_REVIEW'
);

-- CreateEnum
CREATE TYPE "TaxTreatment" AS ENUM ('DEDUCTIBLE', 'DEPRECIABLE', 'NON_DEDUCTIBLE', 'CAPITAL_IMPROVEMENT', 'LIABILITY');

-- CreateEnum
CREATE TYPE "FinancialTransactionStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'AUTO_APPROVED', 'MANUALLY_APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TransactionRuleType" AS ENUM ('PLAID_AUTO_CATEGORIZE', 'RECURRING_MANUAL_ENTRY', 'REMINDER');

-- CreateEnum
CREATE TYPE "TransactionRuleFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "RuleConditionField" AS ENUM (
  'AMOUNT', 'AMOUNT_RANGE', 'PAYEE_NAME', 'DESCRIPTION', 'MERCHANT_NAME',
  'ACCOUNT_ID', 'DATE_RANGE', 'DAY_OF_MONTH', 'TRANSACTION_TYPE',
  'PLAID_PERSONAL_FINANCE_CATEGORY', 'PLAID_COUNTERPARTY_NAME'
);

-- CreateEnum
CREATE TYPE "RuleConditionOperator" AS ENUM (
  'EQUALS', 'NOT_EQUALS', 'CONTAINS', 'STARTS_WITH', 'ENDS_WITH',
  'REGEX_MATCH', 'GREATER_THAN', 'LESS_THAN', 'BETWEEN', 'IN_LIST'
);

-- ── Tables ────────────────────────────────────────────────────────────────────

-- CreateTable: PlaidConnection
-- DTM-aware connection record. accessToken is encrypted at app layer.
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaidConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PlaidConsentEvent
-- Immutable DTM consent audit trail — INSERT ONLY, never UPDATE.
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaidConsentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PlaidRawTransaction
-- Write-only sink for raw Plaid transaction payloads.
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

-- CreateTable: PlaidLiability
-- Mortgage and loan data from Plaid /liabilities/get.
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

-- CreateTable: FinancialTransaction
-- Unified financial ledger — source of truth for all P&L. Plaid is optional.
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

-- CreateTable: TransactionRule
-- Auto-categorization and recurring entry rule engine.
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

-- CreateTable: TransactionSplit
-- Line items for split transactions.
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

-- CreateTable: PlaidWebhookEvent
-- Idempotency log for all incoming Plaid webhook payloads.
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

-- ── Unique Indexes ────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX "PlaidConnection_itemId_key" ON "PlaidConnection"("itemId");
CREATE UNIQUE INDEX "PlaidRawTransaction_plaidTransactionId_key" ON "PlaidRawTransaction"("plaidTransactionId");
CREATE UNIQUE INDEX "PlaidLiability_plaidConnectionId_accountId_key" ON "PlaidLiability"("plaidConnectionId", "accountId");
CREATE UNIQUE INDEX "FinancialTransaction_plaidTransactionId_key" ON "FinancialTransaction"("plaidTransactionId");

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- PlaidConnection
CREATE INDEX "PlaidConnection_userId_idx" ON "PlaidConnection"("userId");
CREATE INDEX "PlaidConnection_projectId_idx" ON "PlaidConnection"("projectId");
CREATE INDEX "PlaidConnection_status_idx" ON "PlaidConnection"("status");
CREATE INDEX "PlaidConnection_userId_status_idx" ON "PlaidConnection"("userId", "status");

-- PlaidConsentEvent
CREATE INDEX "PlaidConsentEvent_plaidConnectionId_idx" ON "PlaidConsentEvent"("plaidConnectionId");
CREATE INDEX "PlaidConsentEvent_plaidConnectionId_eventType_idx" ON "PlaidConsentEvent"("plaidConnectionId", "eventType");
CREATE INDEX "PlaidConsentEvent_timestamp_idx" ON "PlaidConsentEvent"("timestamp");

-- PlaidRawTransaction
CREATE INDEX "PlaidRawTransaction_plaidConnectionId_idx" ON "PlaidRawTransaction"("plaidConnectionId");
CREATE INDEX "PlaidRawTransaction_plaidAccountId_idx" ON "PlaidRawTransaction"("plaidAccountId");
CREATE INDEX "PlaidRawTransaction_postedDate_idx" ON "PlaidRawTransaction"("postedDate");
CREATE INDEX "PlaidRawTransaction_pending_idx" ON "PlaidRawTransaction"("pending");
CREATE INDEX "PlaidRawTransaction_removed_idx" ON "PlaidRawTransaction"("removed");
CREATE INDEX "PlaidRawTransaction_plaidConnectionId_postedDate_idx" ON "PlaidRawTransaction"("plaidConnectionId", "postedDate");

-- PlaidLiability
CREATE INDEX "PlaidLiability_plaidConnectionId_idx" ON "PlaidLiability"("plaidConnectionId");
CREATE INDEX "PlaidLiability_projectId_idx" ON "PlaidLiability"("projectId");
CREATE INDEX "PlaidLiability_liabilityType_idx" ON "PlaidLiability"("liabilityType");
CREATE INDEX "PlaidLiability_nextPaymentDueDate_idx" ON "PlaidLiability"("nextPaymentDueDate");

-- FinancialTransaction
CREATE INDEX "FinancialTransaction_projectId_idx" ON "FinancialTransaction"("projectId");
CREATE INDEX "FinancialTransaction_userId_idx" ON "FinancialTransaction"("userId");
CREATE INDEX "FinancialTransaction_source_idx" ON "FinancialTransaction"("source");
CREATE INDEX "FinancialTransaction_category_idx" ON "FinancialTransaction"("category");
CREATE INDEX "FinancialTransaction_status_idx" ON "FinancialTransaction"("status");
CREATE INDEX "FinancialTransaction_transactionDate_idx" ON "FinancialTransaction"("transactionDate");
CREATE INDEX "FinancialTransaction_projectId_transactionDate_idx" ON "FinancialTransaction"("projectId", "transactionDate");
CREATE INDEX "FinancialTransaction_projectId_category_idx" ON "FinancialTransaction"("projectId", "category");
CREATE INDEX "FinancialTransaction_projectId_status_idx" ON "FinancialTransaction"("projectId", "status");
CREATE INDEX "FinancialTransaction_matchedLeaseId_idx" ON "FinancialTransaction"("matchedLeaseId");
CREATE INDEX "FinancialTransaction_matchedTenantId_idx" ON "FinancialTransaction"("matchedTenantId");
CREATE INDEX "FinancialTransaction_recurringRuleId_idx" ON "FinancialTransaction"("recurringRuleId");
CREATE INDEX "FinancialTransaction_parentTransactionId_idx" ON "FinancialTransaction"("parentTransactionId");

-- TransactionRule
CREATE INDEX "TransactionRule_projectId_idx" ON "TransactionRule"("projectId");
CREATE INDEX "TransactionRule_userId_idx" ON "TransactionRule"("userId");
CREATE INDEX "TransactionRule_isActive_idx" ON "TransactionRule"("isActive");
CREATE INDEX "TransactionRule_projectId_isActive_priority_idx" ON "TransactionRule"("projectId", "isActive", "priority");

-- TransactionSplit
CREATE INDEX "TransactionSplit_parentTransactionId_idx" ON "TransactionSplit"("parentTransactionId");

-- PlaidWebhookEvent
CREATE INDEX "PlaidWebhookEvent_itemId_idx" ON "PlaidWebhookEvent"("itemId");
CREATE INDEX "PlaidWebhookEvent_eventType_idx" ON "PlaidWebhookEvent"("eventType");
CREATE INDEX "PlaidWebhookEvent_createdAt_idx" ON "PlaidWebhookEvent"("createdAt");
CREATE INDEX "PlaidWebhookEvent_itemId_eventType_idx" ON "PlaidWebhookEvent"("itemId", "eventType");

-- ── Foreign Keys ──────────────────────────────────────────────────────────────

-- PlaidConnection → AppUser / ReilProject
ALTER TABLE "PlaidConnection" ADD CONSTRAINT "PlaidConnection_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlaidConnection" ADD CONSTRAINT "PlaidConnection_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ReilProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PlaidConsentEvent → PlaidConnection
ALTER TABLE "PlaidConsentEvent" ADD CONSTRAINT "PlaidConsentEvent_plaidConnectionId_fkey"
    FOREIGN KEY ("plaidConnectionId") REFERENCES "PlaidConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PlaidRawTransaction → PlaidConnection
ALTER TABLE "PlaidRawTransaction" ADD CONSTRAINT "PlaidRawTransaction_plaidConnectionId_fkey"
    FOREIGN KEY ("plaidConnectionId") REFERENCES "PlaidConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PlaidLiability → PlaidConnection / ReilProject
ALTER TABLE "PlaidLiability" ADD CONSTRAINT "PlaidLiability_plaidConnectionId_fkey"
    FOREIGN KEY ("plaidConnectionId") REFERENCES "PlaidConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaidLiability" ADD CONSTRAINT "PlaidLiability_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ReilProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FinancialTransaction → ReilProject / AppUser / PlaidRawTransaction / PlaidLiability / TransactionRule / self
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ReilProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_plaidTransactionId_fkey"
    FOREIGN KEY ("plaidTransactionId") REFERENCES "PlaidRawTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_plaidLiabilityId_fkey"
    FOREIGN KEY ("plaidLiabilityId") REFERENCES "PlaidLiability"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_recurringRuleId_fkey"
    FOREIGN KEY ("recurringRuleId") REFERENCES "TransactionRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_parentTransactionId_fkey"
    FOREIGN KEY ("parentTransactionId") REFERENCES "FinancialTransaction"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- TransactionRule → ReilProject / AppUser
ALTER TABLE "TransactionRule" ADD CONSTRAINT "TransactionRule_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ReilProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransactionRule" ADD CONSTRAINT "TransactionRule_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- TransactionSplit → FinancialTransaction
ALTER TABLE "TransactionSplit" ADD CONSTRAINT "TransactionSplit_parentTransactionId_fkey"
    FOREIGN KEY ("parentTransactionId") REFERENCES "FinancialTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
