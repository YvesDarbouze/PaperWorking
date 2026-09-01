import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import pg from 'pg';
import type { DatabaseAdapterMode } from './config.js';

export type PrismaDriverAdapterKind = 'pg' | 'neon';

declare global {
  // eslint-disable-next-line no-var
  var __paperworkingMigrationPgPool: pg.Pool | undefined;
}

function configureNeonWebSocket(): void {
  if (typeof globalThis.WebSocket !== 'undefined') {
    neonConfig.webSocketConstructor = globalThis.WebSocket;
  }
}

export function resolvePrismaDriverAdapterKind(mode: DatabaseAdapterMode): PrismaDriverAdapterKind {
  return mode === 'neon' ? 'neon' : 'pg';
}

export function createPgPrismaAdapter(connectionString: string): PrismaPg {
  if (!globalThis.__paperworkingMigrationPgPool) {
    globalThis.__paperworkingMigrationPgPool = new pg.Pool({
      connectionString,
      ssl:
        connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
          ? undefined
          : { rejectUnauthorized: false },
      max: 10,
    });
  }

  return new PrismaPg(globalThis.__paperworkingMigrationPgPool);
}

/** Neon serverless driver adapter — opt-in via DATABASE_ADAPTER=neon only. */
export function createNeonPrismaAdapter(connectionString: string): PrismaNeon {
  configureNeonWebSocket();
  return new PrismaNeon({ connectionString });
}

export function createPrismaDriverAdapter(
  mode: DatabaseAdapterMode,
  connectionString: string,
): PrismaPg | PrismaNeon {
  return resolvePrismaDriverAdapterKind(mode) === 'neon'
    ? createNeonPrismaAdapter(connectionString)
    : createPgPrismaAdapter(connectionString);
}

export function resetPgPoolForTests(): void {
  void globalThis.__paperworkingMigrationPgPool?.end();
  globalThis.__paperworkingMigrationPgPool = undefined;
}
