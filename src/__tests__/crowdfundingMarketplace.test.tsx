/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { buildTeaserFromListing } from '@/lib/listings/obfuscation';
import SubscriberDealCard from '@/components/listings/SubscriberDealCard';
import ListingCard from '@/components/listings/ListingCard';
import type { DealListing, DealListingTeaser, SubscriberDealMatch } from '@/types/listing';
import { computeRelevanceScore } from '@/lib/listings/relevance';

describe('DM-36: Crowdfunding Deals in the Marketplace', () => {
  const fixedDate = '2026-07-23T19:27:52.627Z';
  const baseListing = {
    id: 'listing_cf_1',
    projectId: 'proj_cf_1',
    organizationId: 'org_1',
    ownerUid: 'sponsor_1',
    status: 'published',
    visibilityMode: 'PUBLIC_SOLICITED',
    propertyName: 'Sunnyvale Crowdfunded Apts',
    address: '456 Sunnyvale Ave',
    neighborhood: 'Sunnyvale, CA',
    city: 'Sunnyvale',
    state: 'CA',
    zipCode: '94086',
    assetClass: 'Multi-Family',
    subStrategy: 'BUY AND HOLD',
    followCount: 5,
    viewCount: 120,
    createdAt: fixedDate,
    updatedAt: fixedDate,
    isCrowdfunding: true,
    transitionLog: [],
    capitalPlan: 'Default plan',
    leadInvestor: {
      uid: 'sponsor_1',
      displayName: 'Jane Lead',
    },
  } as DealListing;

  it('maps the isCrowdfunding property intact to teaser data', () => {
    const teaser = buildTeaserFromListing(baseListing);
    expect(teaser.id).toBe('listing_cf_1');
    expect(teaser.isCrowdfunding).toBe(true);
  });

  it('displays the crowdfunding badge on ListingCard', () => {
    const teaser = buildTeaserFromListing(baseListing);
    render(<ListingCard teaser={teaser} />);
    expect(screen.getByTestId('crowdfunding-badge')).toBeDefined();
    expect(screen.getByText('Crowdfunding')).toBeDefined();
  });

  it('displays the crowdfunding badge on SubscriberDealCard', () => {
    const match: SubscriberDealMatch = {
      listing: baseListing,
      project: {
        id: 'proj_cf_1',
        propertyName: 'Sunnyvale Crowdfunded Apts',
        ownerUid: 'sponsor_1',
      } as any,
      metrics: {
        capRate: 0.085,
        cashOnCashReturn: 0.092,
        noi: 120000,
      } as any,
    };

    render(<SubscriberDealCard match={match} />);
    expect(screen.getByTestId('crowdfunding-badge')).toBeDefined();
  });

  it('does not grant crowdfunding deals ranking preference in relevance score calculation', () => {
    const matchCf: SubscriberDealMatch = {
      listing: baseListing,
      project: { id: 'p1' } as any,
      metrics: { cashOnCashReturn: 0.08 } as any,
    };

    const nonCfListing = { ...baseListing, isCrowdfunding: false, id: 'listing_non_cf_1' } as DealListing;
    const matchNonCf: SubscriberDealMatch = {
      listing: nonCfListing,
      project: { id: 'p2' } as any,
      metrics: { cashOnCashReturn: 0.08 } as any,
    };

    const now = new Date(fixedDate).getTime();
    const scoreCf = computeRelevanceScore(matchCf, now);
    const scoreNonCf = computeRelevanceScore(matchNonCf, now);

    // Score must be identical for identical metrics regardless of isCrowdfunding status
    expect(scoreCf).toEqual(scoreNonCf);
  });
});
