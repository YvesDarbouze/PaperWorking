import { NextRequest, NextResponse } from 'next/server';
import { verifyDealInviteToken } from '@/lib/email/dealInvite';

export interface DealMessagePayload {
  id: string;
  dealId: string;
  senderEmail: string;
  senderName: string;
  text: string;
  source: 'platform' | 'email_inbound';
  createdAt: string;
}

// In-memory messages store for testing/demo
const MESSAGES_STORE: DealMessagePayload[] = [];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { from, token, text, slug } = body;

    if (!text || (!token && !slug)) {
      return NextResponse.json(
        { error: 'Missing required email payload fields (text, token/slug).' },
        { status: 400 }
      );
    }

    let dealId = slug || 'deal_123mainst';
    let senderEmail = from || 'external_sender@example.com';
    let senderName = senderEmail.split('@')[0];

    if (token) {
      const verified = verifyDealInviteToken(token);
      if (verified) {
        dealId = verified.dealId || verified.slug;
        senderEmail = verified.inviteeEmail || senderEmail;
        senderName = senderEmail.split('@')[0];
      }
    }

    const newMessage: DealMessagePayload = {
      id: `msg_${Date.now()}`,
      dealId,
      senderEmail,
      senderName,
      text,
      source: 'email_inbound',
      createdAt: new Date().toISOString(),
    };

    MESSAGES_STORE.push(newMessage);

    return NextResponse.json({
      success: true,
      message: 'Inbound email message recorded successfully.',
      record: newMessage,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error processing inbound email webhook.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dealId = searchParams.get('dealId') || searchParams.get('slug');

  let filtered = MESSAGES_STORE;
  if (dealId) {
    filtered = MESSAGES_STORE.filter((m) => m.dealId === dealId);
  }

  return NextResponse.json({
    success: true,
    total: filtered.length,
    messages: filtered,
  });
}
