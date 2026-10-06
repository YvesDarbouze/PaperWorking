import React from 'react';
import { notFound } from 'next/navigation';
import { verifyDealAccess, isUserSubscribed } from '@/lib/marketplace/seed-data';
import { getDealFromStore, listDealsFromStore } from '@/lib/deals/deal-store';
import { mapRawDealsToPayloads, mapRawDealToPayload } from '@paperworking/api';
import DealDetailPageView from '@/components/marketplace/detail/DealDetailPageView';
import PrivateDealAccessGate from '@/components/marketplace/PrivateDealAccessGate';
import { getUserProfile } from '@/lib/settings/settings-store';
import { tryDevSessionAuth } from '@/lib/projects/dev-session-auth';
import type { CounterpartyProfileData } from '@/components/profile/CounterpartyPreviewCard';

export default async function MarketplaceDealDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ dealId: string }>;
  searchParams?: Promise<{ token?: string }>;
}) {
  const { dealId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const token = resolvedSearchParams.token;
  const rawDeal = await getDealFromStore(dealId);

  if (!rawDeal) {
    notFound();
  }

  // Load operator profile from settings-store
  const session = await tryDevSessionAuth();

  // Verify deal access (privacy gating & subscription check)
  const verification = verifyDealAccess(
    rawDeal.id,
    session
      ? {
          id: session.uid,
          email: (session as any).email,
          subscriptionStatus: (session as any).subscriptionStatus,
          subscriptionPlan: (session as any).subscriptionPlan,
          authenticated: true,
        }
      : null,
    token,
    { deal: rawDeal },
  );

  if (!verification.allowed) {
    return (
      <PrivateDealAccessGate
        dealName={rawDeal.projects?.[0]?.name || rawDeal.address}
        dealAddress={rawDeal.address}
        dealSlug={rawDeal.slug}
        dealId={rawDeal.id}
        calculatorResults={verification.calculatorResults}
        creatorName={rawDeal.creator?.name || 'Operating Partner'}
        reason={verification.reason}
      />
    );
  }

  const isSubscriber = session
    ? isUserSubscribed({
        subscriptionStatus: (session as any).subscriptionStatus,
        subscriptionPlan: (session as any).subscriptionPlan,
        authenticated: true,
      })
    : false;

  const deal = mapRawDealToPayload(rawDeal) as any;
  const allRawDeals = await listDealsFromStore();
  const allDeals = mapRawDealsToPayloads(allRawDeals) as any[];
  const operatorUid = session?.uid || deal.creatorId || 'dev-user-1';
  let operatorProfile: CounterpartyProfileData | undefined;

  try {
    const rawProfile = await getUserProfile(operatorUid);
    operatorProfile = {
      displayName: rawProfile.displayName,
      companyName: rawProfile.companyName || rawProfile.businessName,
      headline: rawProfile.headline,
      publicBio: rawProfile.publicBio,
      location: rawProfile.location,
      avatarUrl: rawProfile.avatarUrl,
      strategies: rawProfile.strategies,
      isVerified: rawProfile.isVerified,
      aumCents: rawProfile.aumCents,
      avgRoiPct: rawProfile.avgRoiPct,
      equityMultiple: rawProfile.equityMultiple,
      dealCount: rawProfile.dealCount,
    };
  } catch {
    operatorProfile = undefined;
  }

  return (
    <DealDetailPageView
      deal={deal}
      allDeals={allDeals}
      operatorProfile={operatorProfile}
      isSubscriber={isSubscriber}
    />
  );
}
