import { z } from 'zod';
import { NextResponse } from 'next/server';
import { addSeedDealMessage } from '@/lib/marketplace/seed-data';

const ReplySchema = z.object({
  dealId: z.string().min(1, 'dealId is required'),
  senderEmail: z.string().email('Valid sender email required').optional().default('external_investor@example.com'),
  content: z.string().min(1, 'Message content cannot be empty'),
  source: z.enum(['platform', 'email_inbound']).optional().default('email_inbound'),
});

export async function POST(request: Request) {
  try {
    const rawBody = (await request.json()) as Record<string, unknown>;
    const parsed = ReplySchema.parse(rawBody);

    const messageRecord = addSeedDealMessage({
      id: `msg_${Date.now()}`,
      dealId: parsed.dealId,
      senderEmail: parsed.senderEmail,
      content: parsed.content,
      source: parsed.source,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: messageRecord,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? 'Invalid reply payload' },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send reply' },
      { status: 500 },
    );
  }
}
