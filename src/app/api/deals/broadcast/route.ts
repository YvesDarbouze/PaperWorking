import { NextRequest, NextResponse } from 'next/server';
import { generateDealBroadcastToken, renderDealBroadcastEmailHtml } from '@/lib/email/dealBroadcast';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dealId, recipientEmails, subject, message, includeBusinessCard } = body;

    if (!dealId || !Array.isArray(recipientEmails) || recipientEmails.length === 0) {
      return NextResponse.json({ error: 'Invalid broadcast payload' }, { status: 400 });
    }

    const broadcastRecord = {
      id: `broadcast_${Date.now()}`,
      dealId,
      senderId: 'user_owner_1',
      senderName: 'Yves Darbouze',
      recipientEmails,
      subject: subject || 'Check out this deal on PaperWorking',
      message: message || '',
      includeBusinessCard: includeBusinessCard !== false,
      createdAt: new Date().toISOString(),
    };

    // Generate tokens for each recipient
    const recipientTokens = recipientEmails.map((email: string) => {
      const payload = {
        dealId,
        slug: '123mainstaustintx78701',
        address: '123 Main St, Austin, TX 78701',
        senderName: 'Yves Darbouze',
        recipientEmail: email,
        subject: broadcastRecord.subject,
        message: broadcastRecord.message,
        includeBusinessCard: broadcastRecord.includeBusinessCard,
        type: 'broadcast' as const,
      };
      const token = generateDealBroadcastToken(payload);
      const html = renderDealBroadcastEmailHtml(payload, token);
      return { email, token, html };
    });

    return NextResponse.json({
      success: true,
      broadcast: broadcastRecord,
      dispatchedCount: recipientTokens.length,
    });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to process broadcast' }, { status: 500 });
  }
}
