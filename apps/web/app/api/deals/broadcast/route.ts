import { z } from 'zod';
import { handleDealsBroadcastPost } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';
import {
  SEED_RAW_DEALS,
  addSeedBroadcast,
} from '@/lib/marketplace/seed-data';
import { createBroadcastToken } from '@/lib/deals/token';
import {
  renderDealBroadcastHtml,
  renderDealBroadcastPlainText,
} from '@/lib/email/dealBroadcast';

const BroadcastRequestSchema = z.object({
  dealId: z.string().min(1, 'dealId is required'),
  recipientEmails: z.array(z.string().email('Invalid email address')).min(1, 'At least one recipient email is required'),
  subject: z.string().optional(),
  message: z.string().optional(),
  includeBusinessCard: z.boolean().optional(),
});

export async function POST(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return toNextResponse(auth);
  }

  try {
    const rawBody = (await request.json()) as Record<string, unknown>;
    const parsed = BroadcastRequestSchema.parse(rawBody);

    const deal = SEED_RAW_DEALS.find((d) => d.id === parsed.dealId || d.slug === parsed.dealId);

    const senderName = 'Sarah Jenkins';
    const senderEmail = 'sarah@leadinvestor.com';

    const result = await handleDealsBroadcastPost(
      {
        ...parsed,
        senderId: auth.uid,
        senderName,
        senderEmail,
        dealSlug: deal?.slug || '1247elmst',
        dealAddress: deal?.address || '1247 Elm Street, Austin, TX 78702',
        dealName: deal?.projects?.[0]?.name || deal?.address || 'Elm Street Flip',
        purchasePrice: Number(deal?.purchasePrice ?? 485000),
        projectedRoi: Number(deal?.projectedRoi ?? 18.4),
        businessCard: {
          name: senderName,
          email: senderEmail,
          company: 'PaperWorking Capital Partner',
          phone: '+1 (512) 555-0199',
          investmentCriteria: 'Value-add residential & multifamily syndications',
        },
      },
      {
        generateToken: (payload) =>
          createBroadcastToken({
            dealId: payload.dealId,
            email: payload.recipientEmail,
            broadcast: true,
            senderId: payload.senderId,
            senderName: payload.senderName,
            senderEmail: payload.senderEmail,
            subject: payload.subject,
            message: payload.message,
            businessCard: payload.businessCard,
          }),
        renderEmail: (payload, token) => ({
          html: renderDealBroadcastHtml({
            dealName: payload.dealName || 'Elm Street Flip',
            dealAddress: payload.address,
            dealSlug: payload.slug,
            purchasePrice: payload.purchasePrice ?? 485000,
            projectedRoi: payload.projectedRoi ?? 18.4,
            senderName: payload.senderName,
            senderEmail: payload.senderEmail,
            subject: payload.subject,
            message: payload.message,
            token,
            includeBusinessCard: payload.includeBusinessCard,
            businessCard: payload.businessCard ?? undefined,
          }),
          text: renderDealBroadcastPlainText({
            dealName: payload.dealName || 'Elm Street Flip',
            dealAddress: payload.address,
            dealSlug: payload.slug,
            purchasePrice: payload.purchasePrice ?? 485000,
            projectedRoi: payload.projectedRoi ?? 18.4,
            senderName: payload.senderName,
            senderEmail: payload.senderEmail,
            subject: payload.subject,
            message: payload.message,
            token,
            includeBusinessCard: payload.includeBusinessCard,
            businessCard: payload.businessCard ?? undefined,
          }),
        }),
        saveRecord: (record) => {
          addSeedBroadcast({
            id: record.id,
            dealId: record.dealId,
            senderId: record.senderId,
            senderName: record.senderName,
            recipientEmails: record.recipientEmails,
            subject: record.subject,
            message: record.message,
            includeBusinessCard: record.includeBusinessCard,
            createdAt: record.createdAt,
          });
        },
        now: () => new Date(),
      },
    );

    return toNextResponse(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return toNextResponse({
        status: 400,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: error.errors[0]?.message ?? 'Invalid request payload' }),
      });
    }

    return toNextResponse({
      status: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal Server Error',
      }),
    });
  }
}
