import type { Prisma } from '../../generated/client/index.js';
import type { MigrationPrismaClient } from '../client.js';
import { sanitizeDbRecord } from '../sanitize.js';

const PROJECT_READ_INCLUDE = {
  propertyFacts: true,
  comps: { orderBy: { soldDate: 'desc' as const } },
  purchaseTerms: true,
  statusEvents: { orderBy: { occurredAt: 'desc' as const } },
  collaborators: { include: { user: true } },
} satisfies Prisma.ReilProjectInclude;

export type ReilProjectReadResult = Prisma.ReilProjectGetPayload<{
  include: typeof PROJECT_READ_INCLUDE;
}>;

export class ReilProjectRepository {
  constructor(private readonly db: MigrationPrismaClient) {}

  async findById(id: string): Promise<ReilProjectReadResult | null> {
    const project = await this.db.reilProject.findUnique({
      where: { id },
      include: PROJECT_READ_INCLUDE,
    });

    return project ? (sanitizeDbRecord(project) as ReilProjectReadResult) : null;
  }

  async findManyForUser(
    userId: string,
    options?: { take?: number; skip?: number },
  ): Promise<ReilProjectReadResult[]> {
    const projects = await this.db.reilProject.findMany({
      where: {
        OR: [{ createdById: userId }, { collaborators: { some: { userId } } }],
      },
      include: PROJECT_READ_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      take: options?.take,
      skip: options?.skip,
    });

    return sanitizeDbRecord(projects) as ReilProjectReadResult[];
  }

  async findManyByCreator(
    createdById: string,
    options?: { take?: number },
  ): Promise<ReilProjectReadResult[]> {
    const projects = await this.db.reilProject.findMany({
      where: { createdById },
      include: PROJECT_READ_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      take: options?.take,
    });

    return sanitizeDbRecord(projects) as ReilProjectReadResult[];
  }
}
