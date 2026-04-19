import { PrismaClient } from '@prisma/client'

/**
 * 🛠️ BigInt Serialization Fix
 * 
 * Since Prisma 7 uses native BigInt for currency/large integers, 
 * we must ensure JSON.stringify does not crash when encountering them.
 */
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

/**
 * Lazy Prisma accessor — only initializes the PrismaClient
 * when DATABASE_URL is available (i.e. at runtime, not build time).
 */
function getPrismaClient(): PrismaClient {
  if (!globalThis.prisma) {
    globalThis.prisma = prismaClientSingleton();
  }
  return globalThis.prisma;
}

/**
 * Default export uses a Proxy to defer PrismaClient construction
 * until the first actual database call, preventing build-time crashes.
 */
const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    return (getPrismaClient() as any)[prop];
  },
});

export { getPrismaClient, prisma };
export default prisma;

