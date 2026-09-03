export type DatabaseAdapterMode = 'default' | 'neon';

export class DatabaseAdapterConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseAdapterConfigError';
  }
}

/**
 * Resolve Prisma driver adapter from DATABASE_ADAPTER.
 * Safe default: existing Supabase/pg path (`default`).
 *
 * Accepted values:
 * - unset, `default`, `pg` → default (PrismaPg + node-postgres)
 * - `neon` → PrismaNeon (@prisma/adapter-neon)
 */
export function resolveDatabaseAdapterMode(
  env: NodeJS.ProcessEnv = process.env,
): DatabaseAdapterMode {
  const raw = env.DATABASE_ADAPTER?.trim().toLowerCase();
  if (!raw || raw === 'default' || raw === 'pg') {
    return 'default';
  }
  if (raw === 'neon') {
    return 'neon';
  }
  throw new DatabaseAdapterConfigError(
    `Invalid DATABASE_ADAPTER="${env.DATABASE_ADAPTER}". Expected "default", "pg", or "neon".`,
  );
}

export function isNeonAdapterMode(env: NodeJS.ProcessEnv = process.env): boolean {
  return resolveDatabaseAdapterMode(env) === 'neon';
}

export function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const url = env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error('DATABASE_URL is not set — required for @paperworking/database client');
  }
  return url;
}
