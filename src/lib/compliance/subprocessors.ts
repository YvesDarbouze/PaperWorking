// ═══════════════════════════════════════════════════════
//  PaperWorking — Subprocessor Registry (Single Source of Truth)
//
//  GDPR Art. 28 disclosure: every third party that processes
//  customer data on PaperWorking's behalf.
//
//  This file is the canonical list. The /subprocessors page renders
//  from this data. Any vendor addition or removal must be reflected
//  here so the change is auditable via git history.
//
//  Last reconciled against .env.example + src/lib/providers/ on
//  2026-06-29 by automated audit.
// ═══════════════════════════════════════════════════════

export interface Subprocessor {
  /** Legal entity name */
  name: string;
  /** What customer data is processed and why */
  purpose: string;
  /** Primary data-processing region(s) */
  location: string;
  /** Category tag for grouping in the UI */
  category: 'infrastructure' | 'payments' | 'communications' | 'data-providers' | 'observability';
  /** Link to the vendor's security/privacy page */
  privacyUrl: string;
}

/**
 * ISO-8601 date when this registry was last reviewed and reconciled
 * against the production vendor set.
 */
export const SUBPROCESSORS_LAST_UPDATED = '2026-06-29';

/**
 * Canonical list of all subprocessors, ordered by category then name.
 * Each entry must correspond to a real integration in the codebase.
 *
 * Reconciliation mapping:
 *   - Firebase/GCP    → src/lib/firebase/*, src/lib/ocr/documentAIProcessor.ts
 *   - Google Places   → src/app/api/places/
 *   - Google Gemini   → GOOGLE_GENERATIVE_AI_API_KEY / GEMINI_API_KEY in .env
 *   - Stripe          → src/app/api/stripe/*, src/lib/entitlements/
 *   - Resend          → src/lib/services/automatedEmailService.ts
 *   - DocuSign        → src/lib/providers/esign/DocuSignESignAdapter.ts
 *   - RentCast        → src/lib/providers/rentcast/
 *   - Bridge          → src/lib/services/bridge*Service.ts
 *   - PostHog         → POSTHOG_API_KEY in .env
 *   - Sentry          → @sentry/nextjs in next.config.ts
 *   - Better Stack    → Uptime monitoring (external)
 *   - Intercom/Crisp  → Support chat widget (external)
 */
export const SUBPROCESSORS: Subprocessor[] = [
  // ── Infrastructure ──
  {
    name: 'Google Cloud Platform (Firebase)',
    purpose:
      'Cloud hosting, authentication (Firebase Auth), document database (Firestore), file storage (Cloud Storage), Document AI OCR processing, and serverless functions.',
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
    name: 'Google Gemini AI',
    purpose:
      'Generative AI features including document summarization and natural-language project assistance.',
    location: 'United States',
    category: 'infrastructure',
    privacyUrl: 'https://ai.google.dev/terms',
  },

  // ── Payments ──
  {
    name: 'Stripe, Inc.',
    purpose:
      'Payment processing, subscription billing, card validation, customer billing portals, and revenue ledger storage.',
    location: 'United States',
    category: 'payments',
    privacyUrl: 'https://stripe.com/privacy',
  },

  // ── Communications ──
  {
    name: 'Resend, Inc.',
    purpose:
      'Transactional email delivery including onboarding sequences, metric alert notifications, team invitations, and password reset emails.',
    location: 'United States',
    category: 'communications',
    privacyUrl: 'https://resend.com/legal/privacy-policy',
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

  // ── Data Providers ──
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

  // ── Observability ──
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
