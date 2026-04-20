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
    "providerMessageId" TEXT,
    "threadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationLog_pkey" PRIMARY KEY ("id")
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
    "id" TEXT NOT NULL DEFAULT 'replication_watermark',
    "mostRecentModificationTimestamp" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BridgeSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DealFinancials_linkedDealId_key" ON "DealFinancials"("linkedDealId");

-- CreateIndex
CREATE INDEX "DealFinancials_organizationId_idx" ON "DealFinancials"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutWaterfall_linkedItemId_key" ON "PayoutWaterfall"("linkedItemId");

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
CREATE UNIQUE INDEX "Property_listingKey_key" ON "Property"("listingKey");

-- CreateIndex
CREATE UNIQUE INDEX "Property_listingId_key" ON "Property"("listingId");

-- CreateIndex
CREATE INDEX "Property_standardStatus_idx" ON "Property"("standardStatus");

-- CreateIndex
CREATE INDEX "Property_bridgeModificationTimestamp_idx" ON "Property"("bridgeModificationTimestamp");

-- AddForeignKey
ALTER TABLE "PayoutWaterfall" ADD CONSTRAINT "PayoutWaterfall_financialsId_fkey" FOREIGN KEY ("financialsId") REFERENCES "DealFinancials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
