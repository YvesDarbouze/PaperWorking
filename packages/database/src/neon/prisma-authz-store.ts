import type { AuthzStore } from '@paperworking/authz';
import type { ApiPrismaClient } from '../client.js';

/** Neon/Postgres AuthzStore — current V1 implementation until Firestore repos land. */
export function createPrismaAuthzStore(prisma: ApiPrismaClient): AuthzStore {
  return {
    async findOrganizationsOwnedBy(userId) {
      return prisma.organization.findMany({
        where: { ownerId: userId },
        select: { id: true },
      });
    },

    async findActiveOrgMemberships(userId) {
      return prisma.organizationMember.findMany({
        where: { userId, status: 'active' },
        select: { organizationId: true },
      });
    },

    async findProjectById(projectId) {
      return prisma.project.findUnique({
        where: { id: projectId },
      });
    },

    async findActiveProjectMember(projectId, userId, email) {
      return prisma.projectMember.findFirst({
        where: {
          projectId,
          status: 'active',
          OR: [{ userId }, ...(email ? [{ email }] : [])],
        },
        select: { id: true },
      });
    },

    async findDealById(dealId) {
      return prisma.deal.findUnique({
        where: { id: dealId },
      });
    },

    async findActiveProjectMemberByUserId(projectId, userId) {
      return prisma.projectMember.findFirst({
        where: { projectId, userId, status: 'active' },
        select: { id: true },
      });
    },

    async findActiveOrgMember(organizationId, userId) {
      return prisma.organizationMember.findFirst({
        where: { organizationId, userId, status: 'active' },
        select: { role: true },
      });
    },

    async findOrganizationOwnedBy(organizationId, ownerId) {
      return prisma.organization.findFirst({
        where: { id: organizationId, ownerId },
        select: { id: true },
      });
    },

    async findActiveOrgMemberInOrgs(userId, organizationIds) {
      return prisma.organizationMember.findFirst({
        where: {
          userId,
          status: 'active',
          organizationId: { in: organizationIds },
        },
        select: { userId: true },
      });
    },

    async findOrganizationOwnedByUserInOrgs(ownerId, organizationIds) {
      return prisma.organization.findFirst({
        where: {
          ownerId,
          id: { in: organizationIds },
        },
        select: { ownerId: true },
      });
    },

    async findMessageInThreadForUser(threadId, userId) {
      return prisma.message.findFirst({
        where: {
          threadId,
          OR: [{ senderId: userId }, { recipientId: userId }],
        },
        select: { id: true },
      });
    },

    async findAnyMessageInThread(threadId) {
      return prisma.message.findFirst({
        where: { threadId },
        select: { id: true },
      });
    },
  };
}
