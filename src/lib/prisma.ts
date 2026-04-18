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
  return new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

export const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
