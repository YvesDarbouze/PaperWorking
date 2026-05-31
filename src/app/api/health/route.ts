import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminDb } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const status: Record<string, string> = {
    postgres: 'unknown',
    firestore: 'unknown',
  };

  let hasError = false;

  // 1. Probe Postgres (Prisma)
  try {
    await prisma.$queryRaw`SELECT 1`;
    status.postgres = 'healthy';
  } catch (err: any) {
    status.postgres = 'unhealthy';
    hasError = true;
    logger.error('Healthcheck failed: Postgres connection issue', err);
  }

  // 2. Probe Firestore
  try {
    await adminDb.collection('users').limit(1).get();
    status.firestore = 'healthy';
  } catch (err: any) {
    status.firestore = 'unhealthy';
    hasError = true;
    logger.error('Healthcheck failed: Firestore connection issue', err);
  }

  if (hasError) {
    logger.warn('Health check report: system degraded', { status });
    return NextResponse.json({ ok: false, status }, { status: 500 });
  }

  logger.info('Health check report: system healthy', { status });
  return NextResponse.json({ ok: true, status }, { status: 200 });
}
