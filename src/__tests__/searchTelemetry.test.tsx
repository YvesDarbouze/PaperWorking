/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import SearchTelemetryDashboard from '@/app/dashboard/insights/search-telemetry/page';
import { recordSearchTelemetry, recordConversionTelemetry, getSearchTelemetryData } from '@/actions/telemetry';

// ── Mock Firestore, Auth & Telemetry ──
const mockSet = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn().mockReturnValue({ set: mockSet });
const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

jest.mock('@/lib/firebase/admin', () => ({
  __esModule: true,
  adminDb: {
    collection: (name: string) => mockCollection(name),
  },
  adminAuth: {
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'admin_123' }),
  },
}));

const mockCapture = jest.fn();
jest.mock('@/lib/flags', () => ({
  __esModule: true,
  getPostHogServer: () => ({
    capture: mockCapture,
  }),
}));

jest.mock('@/context/AuthContext', () => ({
  __esModule: true,
  useAuth: () => ({
    user: { uid: 'admin_123', getIdToken: jest.fn().mockResolvedValue('mock_admin_token') },
    profile: { role: 'Admin', subscriptionPlan: 'Pro', subscriptionStatus: 'active' },
  }),
}));

jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/actions/telemetry', () => {
  const original = jest.requireActual('@/actions/telemetry');
  return {
    ...original,
    getSearchTelemetryData: jest.fn().mockResolvedValue({
      metrics: {
        totalSearches: 45,
        zeroResultCount: 15,
        zeroResultRate: 33.3,
        resolutionRate: 85.0,
        abandonmentCount: 5,
      },
      conversions: {
        search: 40,
        view: 20,
        interest: 8,
        create: 4,
        subscribe: 2,
      },
      filterCounts: {
        'assetClass: Multi-Family': 12,
        'strategy: FLIP': 8,
      },
      topQueries: [
        { query: '1600 Pennsylvania Ave NW', count: 12 },
        { query: '742 Evergreen Terrace', count: 8 },
      ],
      zeroResultLog: [
        { query: '123 Empty St, Springfield, IL', timestamp: '2026-07-23T12:00:00.000Z', sessionId: 'sess_abc' },
      ],
    }),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DM-15 Search Telemetry & Funnel Performance Checks', () => {
  it('records search telemetry correctly with anonymized hash (no numeric/identity leakage)', async () => {
    mockDoc.mockReturnValue({ set: mockSet });
    mockCollection.mockReturnValue({ doc: mockDoc });

    await recordSearchTelemetry({
      query: '123 Main St, Springfield IL',
      placeId: 'place_main',
      resultCount: 5,
      resolved: true,
      sessionToken: 'session_unique_token_123',
    });

    // Verify it writes to search_telemetry collection
    expect(mockCollection).toHaveBeenCalledWith('search_telemetry');
    expect(mockDoc).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        query: '123 Main St, Springfield IL',
        placeId: 'place_main',
        resultCount: 5,
        resolved: true,
      })
    );

    // Verify user ID isn't directly logged with the query to satisfy the privacy policy
    const writeArg = mockSet.mock.calls[0][0];
    expect(writeArg.userId).toBeUndefined();
    expect(writeArg.sessionId).not.toBe('session_unique_token_123'); // Hashed session ID
  });

  it('records conversions (views, follows, invites, subscribe) correctly', async () => {
    mockDoc.mockReturnValue({ set: mockSet });
    mockCollection.mockReturnValue({ doc: mockDoc });

    await recordConversionTelemetry({
      eventType: 'deal_view',
      listingId: 'listing_abc',
      details: { page: 'deals' },
      sessionToken: 'session_unique_token_123',
    });

    expect(mockCollection).toHaveBeenCalledWith('telemetry_events');
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'deal_view',
        listingId: 'listing_abc',
        details: expect.objectContaining({ page: 'deals' }),
      })
    );
  });

  it('renders the telemetry dashboard page correctly with database counts', async () => {
    render(<SearchTelemetryDashboard />);

    // Wait for the async loading state to resolve
    await waitFor(() => {
      expect(screen.getByText('Search Telemetry')).toBeDefined();
    });

    // Renders total searches KPI count
    expect(screen.getByText('45')).toBeDefined();

    // Renders zero result KPI rate
    expect(screen.getByText('33.3%')).toBeDefined();

    // Renders conversion rates in funnel
    expect(screen.getByText('40 sessions')).toBeDefined();
    expect(screen.getByText('20 sessions')).toBeDefined();

    // Renders filter selection lists
    expect(screen.getByText('assetClass: Multi-Family')).toBeDefined();

    // Renders zero-result roadmap verbatim queries
    expect(screen.getByText('123 Empty St, Springfield, IL')).toBeDefined();
  });
});
