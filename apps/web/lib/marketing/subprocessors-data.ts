export interface Subprocessor {
  name: string;
  purpose: string;
  location: string;
  category: 'infrastructure' | 'payments' | 'communications' | 'data-providers' | 'observability';
  privacyUrl: string;
}

export const SUBPROCESSORS_LAST_UPDATED = '2026-06-29';

export const SUBPROCESSORS: Subprocessor[] = [
  {
    name: 'Google Cloud Platform (Firebase)',
    purpose:
      'Cloud hosting, authentication (Firebase Auth), document database (Firestore), file storage (Cloud Storage), and serverless functions.',
    location: 'United States (us-central1)',
    category: 'infrastructure',
    privacyUrl: 'https://cloud.google.com/security/privacy',
  },
  {
    name: 'Google Places API',
    purpose:
      'Address autocomplete and geocoding for property search during project creation and acquisition workflows.',
    location: 'United States',
    category: 'infrastructure',
    privacyUrl: 'https://cloud.google.com/maps-platform/terms',
  },
  {
    name: 'Stripe, Inc.',
    purpose:
      'Payment processing, subscription billing, card validation, customer billing portals, and revenue ledger storage.',
    location: 'United States',
    category: 'payments',
    privacyUrl: 'https://stripe.com/privacy',
  },
  {
    name: 'Twilio SendGrid, Inc.',
    purpose:
      'Transactional system email delivery, email verification, delivery event tracking, and automated notification dispatches.',
    location: 'United States',
    category: 'communications',
    privacyUrl: 'https://www.twilio.com/en-us/legal/privacy',
  },
  {
    name: 'DocuSign, Inc.',
    purpose:
      'Electronic signature workflows for Letters of Intent (LOI), purchase agreements, and closing documents. Document envelope creation and status tracking.',
    location: 'United States',
    category: 'communications',
    privacyUrl: 'https://www.docusign.com/company/privacy-policy',
  },
  {
    name: 'Intercom, Inc. / Crisp IM SAS',
    purpose:
      'In-app customer support chat widget, helpdesk messaging, and support ticket management.',
    location: 'United States / Europe',
    category: 'communications',
    privacyUrl: 'https://www.intercom.com/legal/privacy',
  },
  {
    name: 'RentCast, Inc.',
    purpose:
      'Property valuation estimates (AVM), rent estimates, comparable sales and rental data, and zip-level market statistics for investment analysis.',
    location: 'United States',
    category: 'data-providers',
    privacyUrl: 'https://www.rentcast.io/privacy',
  },
  {
    name: 'Bridge Interactive (Constellation1)',
    purpose:
      'MLS listing data feeds including active listings, agent information, open house schedules, and property detail records for acquisition research.',
    location: 'United States',
    category: 'data-providers',
    privacyUrl: 'https://www.bridgeinteractive.com/privacy-policy/',
  },
  {
    name: 'PostHog, Inc.',
    purpose:
      'Product analytics, feature flag management, A/B test rollouts, and anonymized usage telemetry for product improvement.',
    location: 'United States',
    category: 'observability',
    privacyUrl: 'https://posthog.com/privacy',
  },
  {
    name: 'Sentry (Functional Software, Inc.)',
    purpose:
      'Application error capture, client-side crash diagnostics, API route performance monitoring, and release health tracking.',
    location: 'United States',
    category: 'observability',
    privacyUrl: 'https://sentry.io/privacy/',
  },
  {
    name: 'Better Stack, Inc.',
    purpose:
      'Infrastructure uptime monitoring, incident alerting, public status page feeds, and on-call escalation.',
    location: 'United States / Europe',
    category: 'observability',
    privacyUrl: 'https://betterstack.com/privacy',
  },
];
