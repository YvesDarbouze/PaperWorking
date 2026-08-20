import type { Prisma } from '../../generated/client/index.js';
import type { MigrationPrismaClient } from '../client.js';
import { sanitizeDbRecord } from '../sanitize.js';

export type AppUserReadResult = Prisma.AppUserGetPayload<object>;

export class AppUserRepository {
  constructor(private readonly db: MigrationPrismaClient) {}

  async findById(id: string): Promise<AppUserReadResult | null> {
    const user = await this.db.appUser.findUnique({ where: { id } });
    return user ? (sanitizeDbRecord(user) as AppUserReadResult) : null;
  }

  async findByEmail(email: string): Promise<AppUserReadResult | null> {
    const user = await this.db.appUser.findFirst({ where: { email } });
    return user ? (sanitizeDbRecord(user) as AppUserReadResult) : null;
  }
}
