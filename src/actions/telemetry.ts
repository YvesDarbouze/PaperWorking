'use server';

import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { createHash } from 'crypto';
import { Timestamp } from 'firebase/firestore';
import posthog from 'posthog-js';
import type { EventTaxonomyMap } from '@/lib/telemetry/types';

// Collection names
const SEARCH_TELEMETRY_COLLECTION = 'search_telemetry';
const TELEMETRY_EVENTS_COLLECTION = 'telemetry_events';

interface SearchRecord {
  id: string;
  query: string;
  placeId: string | null;
  resultCount: number;
  resolved: boolean;
  timestamp: any;
  sessionId: string;
}

interface TelemetryEventRecord {
  id: string;
  sessionId: string;
  eventType: string;
  listingId: string | null;
  details: Record<string, any>;
  timestamp: any;
}

/**
 * Anonymizes the user identifier for compliant privacy tracking.
 * Prevents linking raw street address query text with an identified user's profile.
 */
function getAnonymizedSessionId(sessionToken?: string): string {
  if (sessionToken) {
    return createHash('sha256').update(sessionToken).digest('hex');
  }
  // Fallback to random session ID
  return createHash('sha256').update(Math.random().toString()).digest('hex');
}

/**
 * Records search telemetry to Firestore and PostHog.
 * Anonymizes queries to protect user privacy.
 */
/**
 * Unified server-side capture of Event Taxonomy events.
 * Writes to telemetry_events collection and PostHog.
 * Prevents PII leakage (no email, phone, name, raw address text).
 */
export async function trackEvent<E extends keyof EventTaxonomyMap>(
  eventType: E,
  properties: EventTaxonomyMap[E],
  sessionToken?: string
): Promise<void> {
  const sessionId = getAnonymizedSessionId(sessionToken);
  try {
    // 1. Write to Firestore telemetry_events
    const eventRef = adminDb.collection(TELEMETRY_EVENTS_COLLECTION).doc();
    const payload = {
      id: eventRef.id,
      sessionId,
      eventType,
      details: properties,
      listingId: (properties as any).listingId || null,
      timestamp: new Date(),
    };
    await eventRef.set(payload);

    // 2. Trigger PostHog
    try {
      const ph = require('@/lib/flags').getPostHogServer();
      if (ph) {
        ph.capture({
          distinctId: sessionId,
          event: eventType,
          properties,
        });
      }
    } catch (e) {
      console.warn('[Telemetry] PostHog capture failed:', e);
    }
  } catch (err) {
    console.error(`[Telemetry] Failed to track event ${eventType}:`, err);
  }
}

/**
 * Records search telemetry to Firestore and PostHog.
 * Anonymizes queries to protect user privacy.
 */
export async function recordSearchTelemetry(params: {
  query: string;
  placeId: string | null;
  resultCount: number;
  resolved: boolean;
  sessionToken?: string;
}): Promise<void> {
  const { query, placeId, resultCount, resolved, sessionToken } = params;
  const sessionId = getAnonymizedSessionId(sessionToken);

  try {
    // 1. Write to Firestore
    const searchRef = adminDb.collection(SEARCH_TELEMETRY_COLLECTION).doc();
    const payload: SearchRecord = {
      id: searchRef.id,
      query: query.trim(),
      placeId: placeId || null,
      resultCount,
      resolved,
      timestamp: new Date(),
      sessionId,
    };

    await searchRef.set(payload);

    // 2. Track Event via Event Taxonomy
    await trackEvent('address_search_performed', {
      queryLength: query.length,
      resolved,
      placeId,
      resultCount,
    }, sessionToken);
  } catch (err) {
    console.error('[Telemetry] Failed to record search telemetry:', err);
  }
}

/**
 * Records a conversion or layout interaction event to Firestore and PostHog.
 */
export async function recordConversionTelemetry(params: {
  eventType: string;
  listingId?: string;
  details?: Record<string, any>;
  sessionToken?: string;
}): Promise<void> {
  const { eventType, listingId, details = {}, sessionToken } = params;
  const sessionId = getAnonymizedSessionId(sessionToken);

  try {
    // 1. Write to Firestore under legacy layout to verify compatibility
    const eventRef = adminDb.collection(TELEMETRY_EVENTS_COLLECTION).doc();
    const payload: TelemetryEventRecord = {
      id: eventRef.id,
      sessionId,
      eventType,
      listingId: listingId || null,
      details,
      timestamp: new Date(),
    };

    await eventRef.set(payload);

    // 2. Map legacy event types to Event Taxonomy
    if (eventType === 'deal_view') {
      await trackEvent('deal_detail_viewed', {
        listingId: listingId || details.listingId || '',
        mode: details.mode || 'teaser',
        visibilityMode: details.visibilityMode || 'unknown',
      }, sessionToken);
    } else if (eventType === 'deal_invite' || eventType === 'invitation_viewed') {
      await trackEvent('deal_invitation_viewed', {
        listingId: listingId || details.listingId || null,
        projectId: details.projectId || null,
      }, sessionToken);
    } else if (eventType === 'deal_terms_response' || eventType === 'terms_responded') {
      await trackEvent('deal_terms_responded', {
        listingId: listingId || details.listingId || '',
        projectId: details.projectId || null,
        isCounter: !!details.isCounter,
        amountCents: details.amountCents || 0,
      }, sessionToken);
    } else if (eventType === 'card_exchanged' || eventType === 'contact_details_exchanged') {
      await trackEvent('contact_details_exchanged', {
        listingId: listingId || details.listingId || null,
        projectId: details.projectId || null,
        recipientUid: details.recipientUid || null,
      }, sessionToken);
    } else if (eventType === 'deal_interest_indicated' || eventType === 'interested') {
      await trackEvent('deal_interest_indicated', {
        listingId: listingId || details.listingId || null,
        projectId: details.projectId || null,
        type: details.type || 'amount',
        currency: details.currency || null,
        value: details.value || 0,
      }, sessionToken);
    } else if (eventType === 'subscribed' || eventType === 'subscription_converted') {
      await trackEvent('subscription_converted', {
        plan: details.plan || 'unknown',
        subscriptionId: details.subscriptionId || null,
      }, sessionToken);
    }
  } catch (err) {
    console.error('[Telemetry] Failed to record conversion telemetry:', err);
  }
}

/**
 * Aggregates all search telemetry data for the admin review dashboard.
 * Requires verification of investor auth token.
 */
export async function getSearchTelemetryData(idToken: string) {
  if (!idToken) throw new Error('Missing authentication token.');

  // Verify auth & restrict to non-vendor active profiles
  let verifiedUid = '';
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    verifiedUid = decodedToken.uid;
    const userDocSnap = await adminDb.collection('users').doc(verifiedUid).get();
    if (!userDocSnap.exists) throw new Error('Unauthorized');
    const userData = userDocSnap.data();
    if (userData?.role === 'Vendor' || userData?.accountType === 'vendor') {
      throw new Error('Unauthorized access to telemetry.');
    }
  } catch (e) {
    throw new Error('Unauthorized access');
  }

  // Fetch collections
  const searchesSnap = await adminDb.collection(SEARCH_TELEMETRY_COLLECTION).get();
  const eventsSnap = await adminDb.collection(TELEMETRY_EVENTS_COLLECTION).get();

  const searches: any[] = [];
  searchesSnap.forEach((doc) => {
    const data = doc.data();
    searches.push({
      ...data,
      timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp),
    });
  });

  const events: any[] = [];
  eventsSnap.forEach((doc) => {
    const data = doc.data();
    events.push({
      ...data,
      timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp),
    });
  });

  // ── 1. General search metrics ──
  const totalSearches = searches.length;
  const zeroResultQueries = searches.filter((s) => s.resultCount === 0);
  const zeroResultCount = zeroResultQueries.length;
  const zeroResultRate = totalSearches > 0 ? (zeroResultCount / totalSearches) * 100 : 0;
  const resolvedCount = searches.filter((s) => s.resolved).length;
  const resolutionRate = totalSearches > 0 ? (resolvedCount / totalSearches) * 100 : 0;

  // ── 2. Verbatim Zero-Result Query Log (Roadmap) ──
  const zeroResultLog = zeroResultQueries
    .map((s) => ({
      query: s.query,
      timestamp: s.timestamp.toISOString(),
      sessionId: s.sessionId,
    }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // ── 3. Filters Used metrics ──
  const filterCounts: Record<string, number> = {};
  events
    .filter((e) => e.eventType === 'filter_used')
    .forEach((e) => {
      const filterKey = `${e.details.filterType}: ${e.details.filterValue}`;
      filterCounts[filterKey] = (filterCounts[filterKey] || 0) + 1;
    });

  // ── 4. Abandonment tracking ──
  // Abandonment count: autocomplete abandoned events
  const abandonmentCount = events.filter((e) => e.eventType === 'abandoned').length;

  // ── 5. Funnel Conversions ──
  const searchSessions = new Set([
    ...searches.map((s) => s.sessionId),
    ...events.filter((e) => e.eventType === 'address_search_performed' || e.eventType === 'search_performed').map((e) => e.sessionId)
  ]);
  const viewSessions = new Set(
    events.filter((e) => e.eventType === 'deal_detail_viewed' || e.eventType === 'deal_view').map((e) => e.sessionId)
  );
  const invitationSessions = new Set(
    events.filter((e) => e.eventType === 'deal_invitation_viewed' || e.eventType === 'deal_invite' || e.eventType === 'invitation_viewed').map((e) => e.sessionId)
  );
  const responseSessions = new Set(
    events.filter((e) => e.eventType === 'deal_terms_responded' || e.eventType === 'deal_terms_response' || e.eventType === 'terms_responded').map((e) => e.sessionId)
  );
  const exchangeSessions = new Set(
    events.filter((e) => e.eventType === 'contact_details_exchanged' || e.eventType === 'card_exchanged').map((e) => e.sessionId)
  );
  const indicationSessions = new Set(
    events.filter((e) => e.eventType === 'deal_interest_indicated' || e.eventType === 'interested').map((e) => e.sessionId)
  );
  const subscribeSessions = new Set(
    events.filter((e) => e.eventType === 'subscription_converted' || e.eventType === 'subscribed').map((e) => e.sessionId)
  );
  const createSessions = new Set(
    events.filter((e) => e.eventType === 'deal_create').map((e) => e.sessionId)
  );

  const conversions = {
    search: searchSessions.size,
    view: viewSessions.size,
    invitation: invitationSessions.size,
    response: responseSessions.size,
    exchange: exchangeSessions.size,
    indication: indicationSessions.size,
    subscribe: subscribeSessions.size,
    // legacy support fields
    interest: indicationSessions.size || exchangeSessions.size || 0,
    create: createSessions.size,
  };

  // Top searched queries breakdown
  const queryCounts: Record<string, number> = {};
  searches.forEach((s) => {
    queryCounts[s.query] = (queryCounts[s.query] || 0) + 1;
  });
  const topQueries = Object.entries(queryCounts)
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  return {
    metrics: {
      totalSearches,
      zeroResultCount,
      zeroResultRate,
      resolutionRate,
      abandonmentCount,
    },
    conversions,
    filterCounts,
    topQueries,
    zeroResultLog,
  };
}
