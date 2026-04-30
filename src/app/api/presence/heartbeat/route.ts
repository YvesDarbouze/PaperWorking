// src/app/api/presence/heartbeat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { PresenceService } from '@/lib/services/PresenceService';

/**
 * Presence Heartbeat API
 * 
 * POST /api/presence/heartbeat
 * 
 * Authenticated users ping this endpoint every 30-45 seconds to maintain 
 * their 'online' status in Redis.
 */

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    await PresenceService.markUserOnline(uid);

    return NextResponse.json({ success: true, status: 'online' });
  } catch (error: any) {
    console.error('[Presence Heartbeat] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
