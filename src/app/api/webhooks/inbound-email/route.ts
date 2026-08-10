import { NextResponse } from 'next/server';
import { parseInboundEmailPayload } from '@/lib/deals/historyUtils';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = parseInboundEmailPayload(payload);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Inbound email parsed and stitched into deal communications trail.',
      event: result.event,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error processing inbound email.' },
      { status: 500 }
    );
  }
}
