import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  findSeedDeal,
  getDealCalculatorResults,
  shareSeedDealWith,
  SEED_RAW_DEALS,
  addSeedBroadcast,
} from '@/lib/marketplace/seed-data';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';
import { addInboxThread, InboxThread } from '@/lib/dashboard/shell-seed';
import {
  renderDealBroadcastHtml,
  renderDealBroadcastPlainText,
} from '@/lib/email/dealBroadcast';

const ShareRequestSchema = z.object({
  channel: z.enum(['message', 'email', 'copy_link', 'social']),
  recipients: z.preprocess((val) => {
    if (typeof val === 'string') {
      return val.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
    }
    return val;
  }, z.array(z.string().min(1)).min(1, 'At least one recipient is required')),
  message: z.string().optional(),
  includeBusinessCard: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const rawBody = await request.json();
    const parsed = ShareRequestSchema.parse(rawBody);

    const deal =
      findSeedDeal(id) ||
      SEED_RAW_DEALS.find((d) => d.id === id || d.slug === id);

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Ensure share token exists for private sharing
    if (!deal.shareToken) {
      deal.shareToken = `token_${deal.slug || deal.id}_${Math.random().toString(36).substring(2, 9)}`;
    }

    const calcResults = getDealCalculatorResults(deal);

    // Register recipients in deal access list
    for (const recipient of parsed.recipients) {
      shareSeedDealWith(deal.id, recipient);
    }

    const shareUrl = `/deals/${deal.slug || deal.id}/external?token=${deal.shareToken}`;

    // Handle PaperWorking Messages channel
    if (parsed.channel === 'message') {
      for (const recipient of parsed.recipients) {
        const purchaseFormatted = (calcResults.purchasePrice ?? 0).toLocaleString();
        const rehabFormatted = (calcResults.rehabBudget ?? 0).toLocaleString();
        const arvFormatted = (calcResults.arv ?? 0).toLocaleString();
        const cashReqFormatted = (calcResults.cashRequired ?? 0).toLocaleString();
        const noiFormatted = (calcResults.netOperatingIncome ?? 0).toLocaleString();
        const irrFormatted = Number(calcResults.targetIrr ?? calcResults.projectedRoi ?? 0).toFixed(1);
        const capRateFormatted = Number(calcResults.capRateOnCost ?? 0).toFixed(2);

        const thread: InboxThread = {
          id: `thread-deal-share-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          tab: 'opportunities',
          type: 'INVEST_INVITE',
          subject: `Private Deal Shared: ${deal.address}`,
          project: deal.address,
          from: (auth as any).email || 'Operating Partner',
          fromRole: 'Operator',
          preview: `Target IRR: ${irrFormatted}% · Purchase: $${purchaseFormatted} · Cash Req: $${cashReqFormatted}`,
          body: `${parsed.message || 'I am sharing this private underwritten deal with you.'}\n\nDeal Calculator Results:\n• Purchase Price: $${purchaseFormatted}\n• Rehab Budget: $${rehabFormatted}\n• ARV: $${arvFormatted}\n• Target IRR: ${irrFormatted}%\n• Cash Required: $${cashReqFormatted}\n• Net Operating Income: $${noiFormatted}\n• Cap Rate on Cost: ${capRateFormatted}%\n• Strategy: ${calcResults.strategy || 'Fix & Flip'} (${calcResults.holdPeriod || '2–3 Years'})\n\nRecipient: ${recipient}`,
          unread: true,
          receivedAt: new Date().toISOString(),
          deepLinkUrl: shareUrl,
          actionable: true,
        };
        addInboxThread(thread);
      }
    }

    // Handle Outside Email channel
    if (parsed.channel === 'email') {
      const emailRecipients = parsed.recipients.filter((r) => r.includes('@'));
      if (emailRecipients.length > 0) {
        addSeedBroadcast({
          id: `bcast-${Date.now()}`,
          dealId: deal.id,
          senderId: auth.uid,
          senderName: 'Sarah Jenkins',
          recipientEmails: emailRecipients,
          subject: `Investment Opportunity: ${deal.address}`,
          message: parsed.message || 'Review this underwriting package and let me know your thoughts.',
          includeBusinessCard: parsed.includeBusinessCard ?? true,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      channel: parsed.channel,
      recipients: parsed.recipients,
      shareToken: deal.shareToken,
      shareUrl,
      deal: {
        id: deal.id,
        slug: deal.slug,
        address: deal.address,
        visibility: deal.visibility,
        calculatorResults: calcResults,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? 'Invalid share payload' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to share deal' },
      { status: 500 },
    );
  }
}
