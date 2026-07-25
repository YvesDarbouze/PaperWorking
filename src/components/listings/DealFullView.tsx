'use client';

import React from 'react';
import type { Project } from '@/types/schema';
import type { DealListing } from '@/types/listing';
import DealOnePagerView from './DealOnePagerView';

/* ═══════════════════════════════════════════════════════
   DealFullView (AQ-27)
   
   Full subscriber rendering of a deal listing.
   Delegates to DealOnePagerView (DM-18) for underwriting detail.
   
   Only rendered for authenticated Investor/Team accounts
   with an active subscription. Vendors never see this.
   ═══════════════════════════════════════════════════════ */

interface DealFullViewProps {
  listing: DealListing;
  project?: Project;
  followStatus: { followingDeal: boolean; followingInvestor: boolean };
  onFollowChange?: () => void;
}

export default function DealFullView({
  listing,
  project,
  followStatus,
  onFollowChange,
}: DealFullViewProps) {
  // If project is not passed, build a fallback project shell from the listing snapshot
  const activeProject: Project = project || {
    id: listing.projectId,
    propertyName: listing.propertyName,
    address: listing.address,
    city: listing.city || '',
    state: listing.state || '',
    zip: listing.zipCode || '',
    assetClass: listing.assetClass as any,
    subStrategy: listing.subStrategy as any,
    dispositionType: listing.capitalPlan === 'raise interest' ? 'RENT' : 'SALE',
    organizationId: listing.organizationId,
    ownerUid: listing.ownerUid,
    status: 'acquisition',
    members: {},
    createdAt: listing.createdAt ? new Date(listing.createdAt) : new Date(),
    updatedAt: listing.updatedAt ? new Date(listing.updatedAt) : new Date(),
    financials: {
      purchasePrice: listing.askingPriceCents ? listing.askingPriceCents / 100 : 0,
      estimatedARV: listing.askingPriceCents ? listing.askingPriceCents / 100 : 0,
      capitalPlan: listing.capitalPlan || 'raise interest',
      equityTerms: listing.equityTerms
        ? {
            funding_target: listing.equityTerms.fundingTarget,
            equity_offered_pct: listing.equityTerms.equityOfferedPct,
            min_ticket: listing.equityTerms.minTicket,
            price_basis: listing.equityTerms.priceBasis,
            version: 1,
          }
        : undefined,
    } as any,
  };

  return (
    <DealOnePagerView
      project={activeProject}
      listing={listing}
      followStatus={followStatus}
      onFollowChange={onFollowChange}
    />
  );
}
