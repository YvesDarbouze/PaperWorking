import { NextResponse } from 'next/server';
import { executeProbe } from '@/lib/firebase/probe';

export const dynamic = 'force-dynamic';

export async function POST() {
  const startTime = Date.now();
  try {
    const result = await executeProbe();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[FirebaseProbe] Error executing probe:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Firebase probe failed',
        roundtripMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
