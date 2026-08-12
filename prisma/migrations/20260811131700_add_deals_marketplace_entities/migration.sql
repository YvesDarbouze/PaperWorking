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

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "dealId" TEXT,
ADD COLUMN     "investorId" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "status" TEXT DEFAULT 'active';

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
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "Deal_slug_key" ON "Deal"("slug");

-- CreateIndex
CREATE INDEX "Deal_creatorId_idx" ON "Deal"("creatorId");

-- CreateIndex
CREATE INDEX "Deal_status_idx" ON "Deal"("status");

-- CreateIndex
CREATE INDEX "Deal_slug_idx" ON "Deal"("slug");

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

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
