import type { ApiPrismaClient } from '../client.js';

type CreateMemberData = {
  organizationId: string;
  userId?: string;
  email?: string;
  role: string;
  status: string;
};

type CreateInviteData = {
  organizationId: string;
  email: string;
  role: string;
  invitedBy: string;
};

type UpdateMemberData = {
  role?: string;
  status?: string;
};

/** Prisma-backed team mutations — mirrors Nest TeamService invite/member writes. */
export function createPrismaTeamCommandRepository(prisma: ApiPrismaClient) {
  return {
    async findMemberById(id: string) {
      return prisma.organizationMember.findUnique({ where: { id } });
    },

    async createMember(data: CreateMemberData) {
      return prisma.organizationMember.create({
        data: {
          organizationId: data.organizationId,
          userId: data.userId,
          email: data.email,
          role: data.role,
          status: data.status,
        },
      });
    },

    async updateMember(id: string, data: UpdateMemberData) {
      return prisma.organizationMember.update({
        where: { id },
        data: {
          role: data.role,
          status: data.status,
        },
      });
    },

    async deleteMember(id: string) {
      await prisma.organizationMember.delete({ where: { id } });
    },

    async listInvitesByOrganizationId(organizationId: string) {
      return prisma.organizationInvite.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      });
    },

    async createInvite(data: CreateInviteData) {
      return prisma.organizationInvite.create({
        data: {
          organizationId: data.organizationId,
          email: data.email,
          role: data.role,
          invitedBy: data.invitedBy,
        },
      });
    },
  };
}
