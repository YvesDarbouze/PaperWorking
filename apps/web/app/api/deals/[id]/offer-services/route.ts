import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';
import { secureRandomHex } from '@/lib/utils/secure-id';
import { addDealComment } from '@/lib/marketplace/seed-data';

const OfferServicesSchema = z.object({
  tradeCategory: z.string().min(1, 'Trade category is required'),
  companyName: z.string().min(1, 'Company name is required'),
  proposal: z.string().min(10, 'Proposal description must be at least 10 characters'),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  licenseNumber: z.string().optional(),
  estimatedTurnaround: z.string().optional(),
  estimatedBudgetRange: z.string().optional(),
});

export interface DealServiceOffer {
  id: string;
  dealId: string;
  vendorId: string;
  companyName: string;
  tradeCategory: string;
  proposal: string;
  contactEmail?: string;
  contactPhone?: string;
  licenseNumber?: string;
  estimatedTurnaround?: string;
  estimatedBudgetRange?: string;
  createdAt: string;
  status: 'submitted' | 'reviewed' | 'accepted';
}

declare global {
  // eslint-disable-next-line no-var
  var __pw_deal_service_offers: Map<string, DealServiceOffer[]> | undefined;
}

const serviceOffersStore: Map<string, DealServiceOffer[]> =
  globalThis.__pw_deal_service_offers ??
  (globalThis.__pw_deal_service_offers = new Map<string, DealServiceOffer[]>());

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const offers = serviceOffersStore.get(id) || [];
  return NextResponse.json({
    success: true,
    total: offers.length,
    offers,
  });
}

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
    const raw = await request.json();
    const parsed = OfferServicesSchema.parse(raw);

    const offerId = `offer-${Date.now()}-${secureRandomHex(4)}`;
    const newOffer: DealServiceOffer = {
      id: offerId,
      dealId: id,
      vendorId: auth.uid,
      companyName: parsed.companyName,
      tradeCategory: parsed.tradeCategory,
      proposal: parsed.proposal,
      contactEmail: parsed.contactEmail,
      contactPhone: parsed.contactPhone,
      licenseNumber: parsed.licenseNumber,
      estimatedTurnaround: parsed.estimatedTurnaround,
      estimatedBudgetRange: parsed.estimatedBudgetRange,
      createdAt: new Date().toISOString(),
      status: 'submitted',
    };

    const existing = serviceOffersStore.get(id) || [];
    serviceOffersStore.set(id, [newOffer, ...existing]);

    // Also link a note in the deal's social stream so the operator sees it
    try {
      addDealComment(id, {
        authorId: auth.uid,
        authorName: parsed.companyName,
        authorCompany: `${parsed.tradeCategory} · Verified Vendor`,
        authorRole: 'Trade Service Provider',
        content: `[Service Proposal · ${parsed.tradeCategory}] ${parsed.proposal}`,
      });
    } catch {
      // Non-fatal if social comment link fails
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Service proposal submitted successfully to the deal operator.',
        offer: newOffer,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? 'Invalid service offer payload' },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit service offer' },
      { status: 500 },
    );
  }
}
