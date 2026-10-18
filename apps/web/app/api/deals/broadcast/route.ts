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
  findSeedDeal,
  getDealCalculatorResults,
  shareSeedDealWith,
} from '@/lib/marketplace/seed-data';
import { getDealFromStore, patchDealInStore } from '@/lib/deals/deal-store';
import { createBroadcastToken } from '@/lib/deals/token-server';
import {
  renderDealBroadcastHtml,
  renderDealBroadcastPlainText,
} from '@/lib/email/dealBroadcast';
import { getUserProfile } from '@/lib/settings/settings-store';

const CalculatorResultsSchema = z
  .object({
    purchasePrice: z.number().optional(),
    rehabBudget: z.number().optional(),
    arv: z.number().optional(),
    targetIrr: z.number().optional(),
    projectedRoi: z.number().optional(),
    cashRequired: z.number().optional(),
    equityMultiple: z.number().optional(),
    capRateOnCost: z.number().optional(),
    cashOnCashReturnPct: z.number().optional(),
    monthlyDebtService: z.number().optional(),
    grossMonthlyRent: z.number().optional(),
    netOperatingIncome: z.number().optional(),
    maximumAllowableOffer70Pct: z.number().optional(),
    strategy: z.string().optional(),
    holdPeriod: z.string().optional(),
  })
  .passthrough()
  .optional();

const BroadcastRequestSchema = z.object({
  dealId: z.string().optional(),
  projectId: z.string().optional(),
  dealSlug: z.string().optional(),
  dealAddress: z.string().optional(),
  address: z.string().optional(),
  dealName: z.string().optional(),
  purchasePrice: z.coerce.number().optional(),
  projectedRoi: z.coerce.number().optional(),
  calculatorResults: CalculatorResultsSchema,
  recipientEmails: z.preprocess((val) => {
    if (typeof val === 'string') {
      return val.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
    }
    return val;
  }, z.array(z.string().email('Invalid email address')).min(1, 'At least one recipient email is required')),
  subject: z.string().optional(),
  message: z.string().optional(),
  includeBusinessCard: z.boolean().optional(),
  senderName: z.string().optional(),
  senderEmail: z.string().email('Invalid sender email address').optional(),
  businessCard: z
    .object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      company: z.string().optional(),
      phone: z.string().optional(),
      investmentCriteria: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return toNextResponse(auth);
  }

  try {
    const rawBody = (await request.json()) as Record<string, unknown>;
    const parsed = BroadcastRequestSchema.parse(rawBody);

    const requestedDealId = parsed.dealId?.trim() || parsed.dealSlug?.trim() || 'deal-mp-1';
    const deal =
      (await getDealFromStore(requestedDealId)) ||
      findSeedDeal(requestedDealId) ||
      SEED_RAW_DEALS.find((d) => d.id === requestedDealId || d.slug === requestedDealId);

    const resolvedDealId = deal?.id || requestedDealId || 'deal-mp-1';
    const resolvedAddress =
      parsed.dealAddress?.trim() ||
      parsed.address?.trim() ||
      deal?.address ||
      '1247 Elm Street, Austin, TX 78702';
    const resolvedDealName =
      parsed.dealName?.trim() ||
      deal?.projects?.[0]?.name ||
      resolvedAddress.split(',')[0]?.trim() ||
      'Elm Street Flip';
    const resolvedSlug =
      parsed.dealSlug?.trim() ||
      deal?.slug ||
      resolvedAddress
        .split(',')[0]
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, '') ||
      '1247elmst';
    const resolvedPurchasePrice = Number(
      parsed.purchasePrice ?? deal?.purchasePrice ?? 485000,
    );
    const resolvedProjectedRoi = Number(
      parsed.projectedRoi ?? deal?.projectedRoi ?? 18.4,
    );

    const baseCalcResults = deal ? getDealCalculatorResults(deal) : undefined;
    const calcResults = parsed.calculatorResults
      ? {
          purchasePrice: parsed.calculatorResults.purchasePrice ?? resolvedPurchasePrice,
          rehabBudget: parsed.calculatorResults.rehabBudget ?? baseCalcResults?.rehabBudget ?? 0,
          arv:
            parsed.calculatorResults.arv ??
            baseCalcResults?.arv ??
            Math.round(resolvedPurchasePrice * 1.25),
          targetIrr: parsed.calculatorResults.targetIrr ?? resolvedProjectedRoi,
          projectedRoi: parsed.calculatorResults.projectedRoi ?? resolvedProjectedRoi,
          cashRequired:
            parsed.calculatorResults.cashRequired ??
            baseCalcResults?.cashRequired ??
            Math.round(resolvedPurchasePrice * 0.25),
          equityMultiple:
            parsed.calculatorResults.equityMultiple ??
            baseCalcResults?.equityMultiple ??
            1.85,
          capRateOnCost:
            parsed.calculatorResults.capRateOnCost ??
            baseCalcResults?.capRateOnCost ??
            6.8,
          cashOnCashReturnPct:
            parsed.calculatorResults.cashOnCashReturnPct ??
            baseCalcResults?.cashOnCashReturnPct ??
            7.5,
          monthlyDebtService:
            parsed.calculatorResults.monthlyDebtService ??
            baseCalcResults?.monthlyDebtService ??
            2400,
          grossMonthlyRent:
            parsed.calculatorResults.grossMonthlyRent ??
            baseCalcResults?.grossMonthlyRent ??
            4200,
          netOperatingIncome:
            parsed.calculatorResults.netOperatingIncome ??
            baseCalcResults?.netOperatingIncome ??
            36000,
          maximumAllowableOffer70Pct:
            parsed.calculatorResults.maximumAllowableOffer70Pct ??
            baseCalcResults?.maximumAllowableOffer70Pct ??
            Math.round(resolvedPurchasePrice * 0.7),
          strategy: parsed.calculatorResults.strategy ?? baseCalcResults?.strategy ?? 'VALUE_ADD',
          holdPeriod: parsed.calculatorResults.holdPeriod ?? baseCalcResults?.holdPeriod ?? '3–5 Years',
        }
      : baseCalcResults;

    // Register recipient emails in deal's sharedWith list if deal exists
    if (deal) {
      for (const email of parsed.recipientEmails) {
        shareSeedDealWith(deal.id, email);
      }
      const updatedSharedWith = Array.from(
        new Set([...(deal.sharedWith || []), ...parsed.recipientEmails.map((e) => e.toLowerCase())]),
      );
      await patchDealInStore(deal.id, { sharedWith: updatedSharedWith }).catch(() => null);
    }

    // Dynamically resolve sender identity from request payload, user profile, or session
    const userProfile = await getUserProfile(auth.uid);

    const resolvedSenderName =
      parsed.senderName?.trim() ||
      parsed.businessCard?.name?.trim() ||
      userProfile?.displayName?.trim() ||
      (userProfile?.email ? userProfile.email.split('@')[0] : '') ||
      'PaperWorking Investor';

    const resolvedSenderEmail =
      parsed.senderEmail?.trim() ||
      parsed.businessCard?.email?.trim() ||
      userProfile?.email?.trim() ||
      'partner@paperworking.co';

    const resolvedBusinessCard = {
      name: parsed.businessCard?.name?.trim() || resolvedSenderName,
      email: parsed.businessCard?.email?.trim() || resolvedSenderEmail,
      company:
        parsed.businessCard?.company?.trim() ||
        userProfile?.companyName?.trim() ||
        userProfile?.businessName?.trim() ||
        'PaperWorking Capital Partner',
      phone:
        parsed.businessCard?.phone?.trim() ||
        userProfile?.phone?.trim() ||
        '',
      investmentCriteria:
        parsed.businessCard?.investmentCriteria?.trim() ||
        userProfile?.headline?.trim() ||
        (Array.isArray(userProfile?.strategies) && userProfile.strategies.length > 0
          ? userProfile.strategies.join(', ')
          : 'Value-add residential & multifamily syndications'),
    };

    const result = await handleDealsBroadcastPost(
      {
        ...parsed,
        dealId: resolvedDealId,
        senderId: auth.uid,
        senderName: resolvedSenderName,
        senderEmail: resolvedSenderEmail,
        dealSlug: resolvedSlug,
        dealAddress: resolvedAddress,
        dealName: resolvedDealName,
        purchasePrice: resolvedPurchasePrice,
        projectedRoi: resolvedProjectedRoi,
        businessCard: resolvedBusinessCard,
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
            dealName: payload.dealName || resolvedDealName,
            dealAddress: payload.address,
            dealSlug: payload.slug,
            purchasePrice: payload.purchasePrice ?? resolvedPurchasePrice,
            projectedRoi: payload.projectedRoi ?? resolvedProjectedRoi,
            senderName: payload.senderName,
            senderEmail: payload.senderEmail,
            subject: payload.subject,
            message: payload.message,
            token,
            includeBusinessCard: payload.includeBusinessCard,
            businessCard: payload.businessCard ?? undefined,
            calculatorResults: calcResults,
          }),
          text: renderDealBroadcastPlainText({
            dealName: payload.dealName || resolvedDealName,
            dealAddress: payload.address,
            dealSlug: payload.slug,
            purchasePrice: payload.purchasePrice ?? resolvedPurchasePrice,
            projectedRoi: payload.projectedRoi ?? resolvedProjectedRoi,
            senderName: payload.senderName,
            senderEmail: payload.senderEmail,
            subject: payload.subject,
            message: payload.message,
            token,
            includeBusinessCard: payload.includeBusinessCard,
            businessCard: payload.businessCard ?? undefined,
            calculatorResults: calcResults,
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
