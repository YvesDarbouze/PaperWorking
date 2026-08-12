import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export interface AuditLogInput {
  actorUid: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetResource: string;
  targetResourceId?: string;
  status: 'SUCCESS' | 'DENIED' | 'ERROR';
  ipAddress?: string;
  userAgent?: string;
  reasonCode?: string;
  severity?: 'info' | 'warning' | 'critical';
  metadata?: Record<string, any>;
}

export function computeEntryHash(
  sequenceNumber: number | bigint,
  timestampIso: string,
  actorUid: string,
  action: string,
  targetResource: string,
  status: string,
  previousHash: string
): string {
  const payload = `${sequenceNumber}:${timestampIso}:${actorUid}:${action}:${targetResource}:${status}:${previousHash}`;
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

/**
 * Append-only immutable audit logging service with SHA-256 hash-chaining.
 * Stores audit logs in PostgreSQL via Prisma.
 */
export async function logAdminAudit(input: AuditLogInput) {
  try {
    // 1. Fetch latest audit log entry to get previousHash
    const lastLog = await prisma.adminAuditLog.findFirst({
      orderBy: { sequenceNumber: 'desc' },
      select: { sequenceNumber: true, entryHash: true },
    });

    const nextSeq = lastLog ? lastLog.sequenceNumber + BigInt(1) : BigInt(1);
    const previousHash = lastLog ? lastLog.entryHash : 'GENESIS';
    const timestamp = new Date();
    const timestampIso = timestamp.toISOString();

    // 2. Compute SHA-256 entry hash
    const entryHash = computeEntryHash(
      nextSeq,
      timestampIso,
      input.actorUid,
      input.action,
      input.targetResource,
      input.status,
      previousHash
    );

    // 3. Write log entry to Postgres
    const createdLog = await prisma.adminAuditLog.create({
      data: {
        sequenceNumber: nextSeq,
        timestamp,
        actorUid: input.actorUid,
        actorEmail: input.actorEmail,
        actorRole: input.actorRole,
        action: input.action,
        targetResource: input.targetResource,
        targetResourceId: input.targetResourceId || null,
        status: input.status,
        ipAddress: input.ipAddress || '127.0.0.1',
        userAgent: input.userAgent || null,
        reasonCode: input.reasonCode || null,
        severity: input.severity || 'info',
        previousHash,
        entryHash,
        metadata: input.metadata || undefined,
      },
    });

    return createdLog;
  } catch (error) {
    console.error('[AuditLogger] Failed to write audit log to database:', error);
    return null;
  }
}

/**
 * Hash chain integrity verification helper.
 * Iterates through historical audit log entries and verifies every SHA-256 link.
 */
export async function verifyAuditHashChain(limit: number = 200): Promise<{
  intact: boolean;
  totalChecked: number;
  brokenAtSequence?: string;
}> {
  try {
    const logs = await prisma.adminAuditLog.findMany({
      orderBy: { sequenceNumber: 'asc' },
      take: limit,
    });

    if (logs.length === 0) {
      return { intact: true, totalChecked: 0 };
    }

    let expectedPrevHash = 'GENESIS';

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];

      // Check previousHash link
      if (i > 0 && log.previousHash !== expectedPrevHash) {
        return {
          intact: false,
          totalChecked: i,
          brokenAtSequence: log.sequenceNumber.toString(),
        };
      }

      // Recompute entryHash
      const recomputedHash = computeEntryHash(
        log.sequenceNumber,
        log.timestamp.toISOString(),
        log.actorUid,
        log.action,
        log.targetResource,
        log.status,
        log.previousHash
      );

      if (recomputedHash !== log.entryHash) {
        return {
          intact: false,
          totalChecked: i,
          brokenAtSequence: log.sequenceNumber.toString(),
        };
      }

      expectedPrevHash = log.entryHash;
    }

    return { intact: true, totalChecked: logs.length };
  } catch (error) {
    console.error('[AuditLogger] Hash chain verification failed:', error);
    return { intact: false, totalChecked: 0 };
  }
}
