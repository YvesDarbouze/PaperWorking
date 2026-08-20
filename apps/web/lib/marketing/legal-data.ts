export interface LegalSection {
  heading: string;
  body: string;
}

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: '1. Information We Collect',
    body: 'We collect account details (name, email), project details (financial parameters, transaction properties, ledger transactions), uploaded documents, and connection metadata. Payment cards and SSNs are routed to PCI-compliant subprocessors — not stored directly by PaperWorking.',
  },
  {
    heading: '2. How We Use Your Data',
    body: 'Your data is used solely to provide PaperWorking features: metrics calculations, document vault, vendor communications, and team collaboration. We never sell your data or share it for third-party marketing.',
  },
  {
    heading: '3. Data Storage & Transfers',
    body: 'Data is stored on Google Cloud Platform (us-central1) with TLS 1.3 in transit and AES-256 at rest. Firebase Firestore, Neon PostgreSQL, and Firebase Storage may each hold subsets of your account data.',
  },
  {
    heading: '4. GDPR & CCPA Rights',
    body: 'You may access, rectify, or export your data. Dashboard settings provide self-service export and account deletion requests subject to verification windows.',
  },
  {
    heading: '5. Account Deletion',
    body: 'Deletion requests include a 24-hour grace period. After confirmation, live project data and uploads are removed; audit logs may be retained up to 7 years where required.',
  },
  {
    heading: '6. Cookies',
    body: 'Essential session cookies (`__session`, `__acct`, `__sub`) are required for authentication. Analytics cookies are optional and disabled by default in the migration preview.',
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: '1. Acceptance of Terms',
    body: 'By creating an account or using PaperWorking, you agree to these Terms of Service and our Privacy Policy. If you do not agree, do not use the platform.',
  },
  {
    heading: '2. Subscription & Billing',
    body: 'Paid plans renew monthly or annually via Stripe. Trials convert to paid subscriptions unless cancelled before the trial end date. Refunds follow the policy displayed at checkout.',
  },
  {
    heading: '3. Acceptable Use',
    body: 'You may not use PaperWorking to transmit unlawful content, attempt unauthorized access, scrape the platform, or misrepresent deal data to third parties.',
  },
  {
    heading: '4. Financial Disclaimer',
    body: 'Metrics, scorecards, and reports are tools for your analysis — not investment advice. PaperWorking does not guarantee accuracy of third-party data (MLS, RentCast, Plaid, etc.).',
  },
  {
    heading: '5. Data Ownership',
    body: 'You retain ownership of deal data you enter. PaperWorking receives a limited license to process that data to provide the service.',
  },
  {
    heading: '6. Termination',
    body: 'We may suspend accounts that violate these terms. You may cancel at any time through billing settings; access continues through the paid period unless otherwise stated.',
  },
];

export const LEGAL_LAST_UPDATED = 'August 2026';
