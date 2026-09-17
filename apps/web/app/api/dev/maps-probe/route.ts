import { NextResponse } from 'next/server';
import { executeMapsProbe } from '@/lib/maps/probe';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { apiKey?: string };
    const result = await executeMapsProbe(body.apiKey);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[MapsProbe] Error executing probe:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Maps probe execution failed',
      },
      { status: 500 },
    );
  }
}
