/*
  Warnings:

  - You are about to drop the column `syncCursor` on the `BankConnection` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BankConnection" DROP COLUMN "syncCursor",
ADD COLUMN     "lastSyncCursor" TEXT;
