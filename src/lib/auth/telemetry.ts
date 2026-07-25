import { adminDb } from '@/lib/firebase/admin';
import { telemetry } from '@/lib/telemetry';
import { createHash } from 'crypto';

export interface SecurityEventData {
  type: string;
  route: string;
  ip: string;
  reason: string;
  uid?: string;
  metadata?: Record<string, any>;
}

export async function logSecurityEvent(data: SecurityEventData) {
  const ipHash = data.ip ? createHash('sha256').update(data.ip).digest('hex') : 'unknown';
  const timestamp = new Date().toISOString();

  // 1. Log to Firestore
  try {
    await adminDb.collection('securityEvents').add({
      type: data.type,
      route: data.route,
      ipHash,
      reason: data.reason,
      uid: data.uid || null,
      timestamp,
      metadata: data.metadata || null,
    });
  } catch (dbErr) {
    console.error('[Telemetry] Failed to log security event to Firestore:', dbErr);
  }

  // 2. Log to PostHog
  try {
    await telemetry.capture({
      distinctId: data.uid || ipHash,
      event: `security_event_${data.type.toLowerCase()}`,
      properties: {
        route: data.route,
        reason: data.reason,
        ipHash,
        ...data.metadata,
      },
      timestamp,
    });
    await telemetry.flush();
  } catch (phErr) {
    console.error('[Telemetry] Failed to log security event to PostHog:', phErr);
  }
}

export async function getRequestMetadata() {
  let requestUrl = 'unknown';
  let ip = 'unknown';
  try {
    const { headers } = require('next/headers');
    const headersList = await headers();
    ip = headersList.get('x-forwarded-for') || '127.0.0.1';
    const host = headersList.get('host') || 'localhost';
    const proto = headersList.get('x-forwarded-proto') || 'https';
    requestUrl = `${proto}://${host}`;
  } catch {}
  return { ip, requestUrl };
}
