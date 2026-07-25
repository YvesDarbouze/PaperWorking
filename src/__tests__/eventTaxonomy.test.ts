import { trackEvent, recordSearchTelemetry, recordConversionTelemetry, getSearchTelemetryData } from '@/actions/telemetry';

// Mock Firestore
let mockEventsStore: any[] = [];
let mockSearchesStore: any[] = [];
let mockUsers: Record<string, any> = {};

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: async (idToken: string) => {
      if (idToken === 'token_admin') return { uid: 'user_admin' };
      throw new Error('Invalid token');
    },
  },
  adminDb: {
    collection: jest.fn((colName) => ({
      doc: jest.fn((docId = 'temp_id') => ({
        id: docId,
        set: jest.fn(async (payload: any) => {
          if (colName === 'telemetry_events') mockEventsStore.push(payload);
          if (colName === 'search_telemetry') mockSearchesStore.push(payload);
        }),
        get: jest.fn(async () => {
          let data = null;
          if (colName === 'users') data = mockUsers[docId];
          return {
            exists: !!data,
            data: () => data,
            id: docId,
          };
        }),
      })),
      get: jest.fn(async () => {
        const store = colName === 'telemetry_events' ? mockEventsStore : mockSearchesStore;
        return {
          forEach: (cb: (doc: any) => void) => {
            store.forEach((data) => cb({ data: () => data }));
          },
        };
      }),
    })),
  },
}));

var mockCapture = jest.fn();
jest.mock('@/lib/flags', () => ({
  __esModule: true,
  getPostHogServer: () => ({
    capture: mockCapture,
  }),
}));

describe('DM-44: Event Taxonomy & Conversion Funnel', () => {
  beforeEach(() => {
    mockEventsStore = [];
    mockSearchesStore = [];
    mockUsers = {};
    jest.clearAllMocks();
  });

  it('enforces Event Taxonomy on trackEvent and formats Firestore and PostHog outputs', async () => {
    await trackEvent(
      'deal_detail_viewed',
      {
        listingId: 'listing_123',
        mode: 'teaser',
        visibilityMode: 'PUBLIC_SOLICITED',
      },
      'session_token_123'
    );

    // Verify Firestore storage
    expect(mockEventsStore.length).toBe(1);
    expect(mockEventsStore[0]).toEqual(
      expect.objectContaining({
        eventType: 'deal_detail_viewed',
        listingId: 'listing_123',
        details: {
          listingId: 'listing_123',
          mode: 'teaser',
          visibilityMode: 'PUBLIC_SOLICITED',
        },
      })
    );

    // Verify hashed sessionId is present, not raw session_token_123
    expect(mockEventsStore[0].sessionId).toBeDefined();
    expect(mockEventsStore[0].sessionId).not.toBe('session_token_123');

    // Verify PostHog emission
    expect(mockCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'deal_detail_viewed',
        properties: {
          listingId: 'listing_123',
          mode: 'teaser',
          visibilityMode: 'PUBLIC_SOLICITED',
        },
      })
    );
  });

  it('rejects PII fields (no email, phone, name, or raw search queries) in event properties', async () => {
    await recordSearchTelemetry({
      query: '1600 Pennsylvania Ave NW, Washington DC',
      placeId: 'place_whitehouse',
      resultCount: 1,
      resolved: true,
      sessionToken: 'token_xyz',
    });

    // Check search event
    expect(mockEventsStore.length).toBe(1);
    const event = mockEventsStore[0];
    expect(event.eventType).toBe('address_search_performed');
    
    // Properties should omit the raw address query string
    expect(event.details.query).toBeUndefined();
    expect(event.details.queryLength).toBe(39);
    expect(event.details.placeId).toBe('place_whitehouse');

    // Anonymized session ID
    expect(event.sessionId).toBeDefined();
    expect(event.sessionId).not.toBe('token_xyz');
  });

  it('maps legacy eventType conversions into taxonomy events seamlessly', async () => {
    await recordConversionTelemetry({
      eventType: 'deal_view',
      listingId: 'listing_abc',
      details: { mode: 'teaser', visibilityMode: 'PUBLIC_SOLICITED' },
      sessionToken: 'sess_123',
    });

    // The handler writes the raw legacy trace for compat and forwards the new taxonomy event
    const taxonomyEvent = mockEventsStore.find((e) => e.eventType === 'deal_detail_viewed');
    expect(taxonomyEvent).toBeDefined();
    expect(taxonomyEvent.details.listingId).toBe('listing_abc');
    expect(taxonomyEvent.details.mode).toBe('teaser');
  });

  it('computes the full 7-step conversion funnel correctly from real session metrics', async () => {
    // Populate sessions for all 7 steps of the funnel
    const sessSearch = 'token_s1';
    const sessView = 'token_s2';
    const sessInvite = 'token_s3';
    const sessResponse = 'token_s4';
    const sessExchange = 'token_s5';
    const sessIndication = 'token_s6';
    const sessSubscribe = 'token_s7';

    // 1. Search
    await recordSearchTelemetry({ query: '123 Main St', placeId: 'p1', resultCount: 2, resolved: true, sessionToken: sessSearch });
    // 2. View
    await trackEvent('deal_detail_viewed', { listingId: 'l1', mode: 'teaser', visibilityMode: 'PUBLIC_SOLICITED' }, sessView);
    // 3. Invite
    await trackEvent('deal_invitation_viewed', { listingId: 'l1', projectId: 'p1' }, sessInvite);
    // 4. Response
    await trackEvent('deal_terms_responded', { listingId: 'l1', projectId: 'p1', isCounter: false, amountCents: 5000000 }, sessResponse);
    // 5. Exchange
    await trackEvent('contact_details_exchanged', { listingId: 'l1', projectId: 'p1', recipientUid: 'u_sponsor' }, sessExchange);
    // 6. Indication
    await trackEvent('deal_interest_indicated', { listingId: 'l1', projectId: 'p1', type: 'amount', currency: 'USD', value: 50000 }, sessIndication);
    // 7. Subscribe
    await trackEvent('subscription_converted', { plan: 'Pro', subscriptionId: 'sub_123' }, sessSubscribe);

    // Verify mock db populated correctly
    expect(mockSearchesStore.length).toBe(1);
    expect(mockEventsStore.length).toBe(7); // 1 search taxonomy + 6 others

    // Retrieve funnel analysis
    mockUsers = {
      user_admin: { role: 'Admin', subscriptionPlan: 'Pro', subscriptionStatus: 'active' },
    };
    
    const data = await getSearchTelemetryData('token_admin');
    
    // Assert 7-step conversion session counts are correctly unique aggregated
    expect(data.conversions).toEqual(
      expect.objectContaining({
        search: 1, // Deduplicated unique session count
        view: 1,
        invitation: 1,
        response: 1,
        exchange: 1,
        indication: 1,
        subscribe: 1,
      })
    );
  });
});
