import React from 'react';
import { notFound } from 'next/navigation';
import { findSeedDealBySlug, SEED_RAW_DEALS } from '@/lib/marketplace/seed-data';
import { mapRawDealsToPayloads, mapRawDealToPayload } from '@paperworking/api';
import DealDetailPageView from '@/components/marketplace/detail/DealDetailPageView';
import { getUserProfile } from '@/lib/settings/settings-store';
import { tryDevSessionAuth } from '@/lib/projects/dev-session-auth';
import type { CounterpartyProfileData } from '@/components/profile/CounterpartyPreviewCard';

export default async function MarketplaceDealDetailPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = await params;
  const rawDeal = findSeedDealBySlug(dealId);

  if (!rawDeal) {
    notFound();
  }

  const deal = mapRawDealToPayload(rawDeal) as any;
  const allDeals = mapRawDealsToPayloads(SEED_RAW_DEALS) as any[];

  // Load operator profile from settings-store
  const session = await tryDevSessionAuth();
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
    />
  );
}
