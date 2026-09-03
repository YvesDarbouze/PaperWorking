import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { NestFactory } from '@nestjs/core';
import { AuthorizationService } from '../authz/authorization.service.js';
import { buildNestBillingServices } from '../payments/payments-factory.js';
import { AppModule } from '../app.module.js';
import { createAuthzStore } from '@paperworking/database';

describe('Nest Firestore-mode boot', () => {
  const previousMode = process.env.DATABASE_READ_MODE;
  const previousDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    process.env.DATABASE_READ_MODE = 'firestore';
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    if (previousMode === undefined) delete process.env.DATABASE_READ_MODE;
    else process.env.DATABASE_READ_MODE = previousMode;
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  });

  it('boots AppModule without PrismaModule', async () => {
    const app = await NestFactory.create(AppModule, { logger: false });
    expect(app.get(AuthorizationService)).toBeDefined();
    await app.close();
  });

  it('constructs AuthorizationService with Firestore authz store', () => {
    const authz = new AuthorizationService();
    expect(
      authz.hasPermission(
        { uid: 'u1', email: 'admin@example.com', accountType: 'admin', isAdmin: true },
        'admin.access',
      ),
    ).toBe(true);
  });

  it('constructs billing webhook services without Prisma client', () => {
    const billing = buildNestBillingServices();
    expect(billing.webhook).toBeDefined();
    expect(billing.read).toBeDefined();
  });

  it('selects Firestore authz via runtime router', () => {
    const store = createAuthzStore();
    expect(store.findOrganizationsOwnedBy).toBeDefined();
  });
});
