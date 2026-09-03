import { AuthorizationService, validateCsrf } from '@paperworking/authz';
import { buildHandlerDeps, resetHandlerDepsForTests } from '../../lib/api/handler-deps.js';

describe('phase 9a — Next handler-deps wiring', () => {
  beforeAll(() => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL || 'postgresql://test:test@127.0.0.1:5432/test';
  });

  afterEach(() => {
    resetHandlerDepsForTests();
  });

  it('creates AuthorizationService from @paperworking/authz', () => {
    const deps = buildHandlerDeps();
    expect(deps.authorization).toBeInstanceOf(AuthorizationService);
    expect(
      deps.authorization.hasPermission(
        { uid: 'u1', accountType: 'admin', isAdmin: true },
        'projects.read',
      ),
    ).toBe(true);
  });

  it('wires validateCsrf to @paperworking/authz implementation', () => {
    const deps = buildHandlerDeps();
    expect(deps.validateCsrf).toBe(validateCsrf);
  });

  it('wires session resolver dependencies', () => {
    const deps = buildHandlerDeps();
    expect(deps.sessionStore).toBeDefined();
    expect(deps.sessionResolver.identity).toBe(deps.identity);
    expect(deps.sessionResolver.store).toBe(deps.sessionStore);
    expect(typeof deps.resolveAuthUserFromCredentials).toBe('function');
  });

  it('wires Prisma authz store', () => {
    const deps = buildHandlerDeps();
    expect(deps.authzStore).toBeDefined();
    expect(typeof deps.authzStore.findOrganizationsOwnedBy).toBe('function');
  });
});
