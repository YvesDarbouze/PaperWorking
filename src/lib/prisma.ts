/**
 * Prisma 7 requires a driver adapter — new PrismaClient() alone throws.
 * We use PrismaNeonHttp (HTTP transport) which works in serverless/edge.
 * @prisma/adapter-neon must be installed: npm i @prisma/adapter-neon
 */
import { PrismaClient } from '@prisma/client';
import { PrismaNeonHttp } from '@prisma/adapter-neon';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const adapter = new PrismaNeonHttp(url, {});
  return new PrismaClient({ adapter });
}

declare global {
  // eslint-disable-next-line no-var
  var _prisma: PrismaClient | undefined;
}

function getPrismaClient(): PrismaClient {
  if (!globalThis._prisma) {
    globalThis._prisma = createPrismaClient();
  }
  return globalThis._prisma;
}

// Proxy defers construction until first DB call — safe at build time.
const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    return (getPrismaClient() as any)[prop];
  },
});

export { getPrismaClient, prisma };
export default prisma;
