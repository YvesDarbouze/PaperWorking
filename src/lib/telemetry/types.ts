export interface EventTaxonomyMap {
  address_search_performed: {
    queryLength: number;
    resolved: boolean;
    placeId: string | null;
    resultCount: number;
  };
  deal_detail_viewed: {
    listingId: string;
    mode: 'teaser' | 'subscriber';
    visibilityMode: string;
  };
  deal_invitation_viewed: {
    listingId: string | null;
    projectId: string | null;
  };
  deal_terms_responded: {
    listingId: string;
    projectId: string | null;
    isCounter: boolean;
    amountCents: number;
  };
  contact_details_exchanged: {
    listingId: string | null;
    projectId: string | null;
    recipientUid: string | null;
  };
  deal_interest_indicated: {
    listingId: string | null;
    projectId: string | null;
    type: 'percentage' | 'amount';
    currency: string | null;
    value: number;
  };
  subscription_converted: {
    plan: string;
    subscriptionId: string | null;
  };
}

export type EventType = keyof EventTaxonomyMap;
