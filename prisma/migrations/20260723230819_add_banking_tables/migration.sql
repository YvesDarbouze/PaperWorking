-- CreateEnum
CREATE TYPE "RenovationTier" AS ENUM ('STAGE', 'REFURBISH', 'RENOVATE', 'GUT', 'DEVELOP');

-- CreateEnum
CREATE TYPE "HoldExpenseCategory" AS ENUM ('tax', 'insurance', 'security', 'maintenance', 'utilities', 'management', 'HOA', 'capex');

-- CreateEnum
CREATE TYPE "OccupancyDuringHold" AS ENUM ('VACANT_FULL_REHAB', 'OCCUPIED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "UtilitiesResponsibility" AS ENUM ('LANDLORD', 'TENANT', 'SPLIT');

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
    "accessToken" TEXT NOT NULL,
    "syncCursor" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

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
CREATE INDEX "BankConnection_userId_idx" ON "BankConnection"("userId");

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

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "BankConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "BankConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
