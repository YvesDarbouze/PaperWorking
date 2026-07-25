import { NextRequest, NextResponse } from 'next/server';
import { refreshStaleProperties } from '@/lib/jobs/refreshPlaceIds';

// Vercel Cron or similar - runs weekly
// Add to vercel.json: { "crons": [{ "path": "/api/cron/refresh-place-ids", "schedule": "0 3 * * 0" }] }

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await refreshStaleProperties({ batchSize: 50 });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Cron] refresh-place-ids failed:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
