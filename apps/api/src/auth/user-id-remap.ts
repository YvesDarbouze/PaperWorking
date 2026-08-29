import type { ApiPrismaClient } from '@paperworking/database';

/**
 * Remap Wave-1 `User.id` (and FK columns) from a legacy Firebase UID to
 * Supabase `auth.users.id`. AppUser / REIL tables are intentionally untouched.
 */
export async function remapUserPrimaryKey(
  prisma: ApiPrismaClient,
  oldId: string,
  newId: string,
): Promise<void> {
  if (oldId === newId) return;

  const conflict = await prisma.user.findUnique({ where: { id: newId } });
  if (conflict) {
    throw new Error(`Cannot remap User ${oldId} → ${newId}: target id already exists`);
  }

  await prisma.$transaction(async (tx: ApiPrismaClient) => {
    await tx.$executeRawUnsafe(
      `UPDATE "Organization" SET "ownerId" = $1 WHERE "ownerId" = $2`,
      newId,
      oldId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "OrganizationMember" SET "userId" = $1 WHERE "userId" = $2`,
      newId,
      oldId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "Project" SET "userId" = $1 WHERE "userId" = $2`,
      newId,
      oldId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "Project" SET "investorId" = $1 WHERE "investorId" = $2`,
      newId,
      oldId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "ProjectMember" SET "userId" = $1 WHERE "userId" = $2`,
      newId,
      oldId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "InboxItem" SET "recipientUid" = $1 WHERE "recipientUid" = $2`,
      newId,
      oldId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "InboxItem" SET "senderUid" = $1 WHERE "senderUid" = $2`,
      newId,
      oldId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "InvestorFollower" SET "followerUid" = $1 WHERE "followerUid" = $2`,
      newId,
      oldId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "InvestorFollower" SET "targetUid" = $1 WHERE "targetUid" = $2`,
      newId,
      oldId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "TaskAssignment" SET "assigneeId" = $1 WHERE "assigneeId" = $2`,
      newId,
      oldId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "MarketplaceListing" SET "userId" = $1 WHERE "userId" = $2`,
      newId,
      oldId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "Message" SET "senderId" = $1 WHERE "senderId" = $2`,
      newId,
      oldId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "Message" SET "recipientId" = $1 WHERE "recipientId" = $2`,
      newId,
      oldId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "Subscription" SET "userId" = $1 WHERE "userId" = $2`,
      newId,
      oldId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "Deal" SET "creatorId" = $1 WHERE "creatorId" = $2`,
      newId,
      oldId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "DealBroadcast" SET "senderId" = $1 WHERE "senderId" = $2`,
      newId,
      oldId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "DealInvitation" SET "inviteeUserId" = $1 WHERE "inviteeUserId" = $2`,
      newId,
      oldId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "InvestmentCommitment" SET "investorId" = $1 WHERE "investorId" = $2`,
      newId,
      oldId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "DealMessage" SET "senderId" = $1 WHERE "senderId" = $2`,
      newId,
      oldId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "BusinessCard" SET "userId" = $1 WHERE "userId" = $2`,
      newId,
      oldId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "User" SET id = $1, "legacyFirebaseUid" = COALESCE("legacyFirebaseUid", $2) WHERE id = $2`,
      newId,
      oldId,
    );
  });
}
