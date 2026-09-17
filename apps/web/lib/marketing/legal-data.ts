export interface LegalSection {
  heading: string;
  body: string;
  subsections?: { title: string; content: string }[];
}

export const LEGAL_DRAFT_NOTICE = 'DRAFT — pending attorney review';
export const LEGAL_LAST_UPDATED = 'September 2026';

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: '1. Information We Collect',
    body: 'PaperWorking collects information necessary to provide real estate investment project management, deal underwriting, and workflow automation. This includes account credentials (name, email), investment project parameters (property addresses, purchase price, rehab budgets, loan details, ledger transactions), uploaded transaction documents, and support inquiries.',
  },
  {
    heading: '2. Real Data Flows & Third-Party Subprocessors',
    body: 'We do not sell personal data. To deliver platform functionality, PaperWorking routes data strictly through the following verified subprocessors and service providers:',
    subsections: [
      {
        title: 'Plaid Technologies, Inc. (Banking & Liabilities)',
        content:
          'When you connect a financial institution, Plaid retrieves account balances, transactions, and mortgage liabilities to automate holding cost tracking and debt servicing. Access tokens are envelope-encrypted using AES-256-GCM with KMS-managed keys. PaperWorking never sees or stores your bank login credentials. Use of this integration is subject to the Plaid End User Privacy Policy (https://plaid.com/legal/#end-user-privacy-policy).',
      },
      {
        title: 'RentCast (Property & Rent Valuation)',
        content:
          'When underwriting deals, property addresses are queried against RentCast to obtain public record attributes, automated valuation models (AVMs), rent estimates, and comparable sales. Query responses are normalized and cached in Neon PostgreSQL (30-day TTL for estimates, 24-hour TTL for comps) to minimize external data sharing.',
      },
      {
        title: 'Google Maps & Places (Address Verification)',
        content:
          'Address autocomplete and geocoding utilize Google Places APIs using session tokens. Address queries are processed under Google’s privacy standards and displayed with Google attribution.',
      },
      {
        title: 'SendGrid / Twilio (Transactional Email)',
        content:
          'We use SendGrid exclusively for transactional notifications: account verification, project collaborator invitations, deal status alerts, and password resets. We do not provide customer contact lists for third-party marketing.',
      },
      {
        title: 'AI Assistant ("Pepper") & Model Providers',
        content:
          'The Pepper support assistant provides grounded answers retrieved from PaperWorking public FAQs and glossaries. User queries are filtered to redact email addresses and personal data before processing. Pepper does not provide investment or legal advice.',
      },
      {
        title: 'Stripe, Inc. (Payment Processing)',
        content:
          'Subscription billing and payment management are processed through Stripe under PCI-DSS Level 1 compliance. Credit card numbers, expiration dates, and CVVs are handled directly by Stripe and never stored on PaperWorking infrastructure.',
      },
      {
        title: 'Cloud Infrastructure (GCP & Neon)',
        content:
          'Application services, databases, and secure document vaults are hosted on Google Cloud Platform (us-central1) and Neon Serverless PostgreSQL. All data is encrypted in transit via TLS 1.3 and at rest via AES-256.',
      },
    ],
  },
  {
    heading: '3. Telephone Numbers & Support Call-Backs (Strict Zero SMS Policy)',
    body: 'When you submit a telephone number via our Support Call-Back form, you consent to receive a one-time telephone call-back from PaperWorking support staff regarding your inquiry. PaperWorking does not send marketing text messages, nor do we operate automated SMS broadcasting. Phone numbers are stored with timestamped consent solely for transactional customer support.',
  },
  {
    heading: '4. Bank Disconnection & Data Retention',
    body: 'You may disconnect your bank account at any time from Settings → Data & Privacy or Bank Connections. Disconnecting triggers an immediate call to Plaid’s /item/remove endpoint, hard-deletes the access token and per-item encryption key, and purges or anonymizes derived transaction data according to our retention policy.',
  },
  {
    heading: '5. Account Deletion, Crypto-Shredding & Data Rights (DSR)',
    body: 'In accordance with GDPR (Art. 15, 17), CCPA/CPRA, and ~20 US state privacy laws, you have comprehensive rights to access, export, and erase your data. Underwriting snapshots are engineered with cryptographic immutability: when you export your data (Art. 15), you receive your deal history with SHA-256 seal hashes and command-line verification instructions to prove projection integrity to lenders and partners. When you exercise your right to erasure (Art. 17), your personal Data Encryption Key (DEK) is destroyed (crypto-shredding), permanently rendering property addresses mathematically unrecoverable, while identity mapping links are severed. The remaining anonymous snapshot shells preserve formula integrity without personal identification. Statutory closing settlement and tax basis documents are preserved for 3 years pursuant to 26 U.S.C. § 6001, after which they are permanently purged.',
  },
  {
    heading: '6. Cookies & Session Management',
    body: 'PaperWorking uses essential first-party session cookies (__session, __acct, __sub) required for authentication, CSRF mitigation, and multi-tenant routing. Analytics cookies are optional and disabled by default.',
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: '1. Acceptance of Terms & Clickwrap Consent',
    body: 'By checking the agreement box during registration, creating an account, or accessing the PaperWorking platform, you enter into a legally binding agreement to these Terms of Service and our Privacy Policy. If you do not agree, do not register or use PaperWorking.',
  },
  {
    heading: '2. Subscription, Free Trial & Billing',
    body: 'PaperWorking provides subscription-based software for real estate investors. New accounts receive a 14-day free trial. Unless cancelled before the expiration of the trial period, your selected subscription plan will automatically renew on a monthly or annual basis via Stripe. You can cancel your subscription at any time through the Billing settings.',
  },
  {
    heading: '3. Financial & Investment Disclaimer (Not Advice)',
    body: 'PaperWorking is a project management software platform, not a registered investment adviser, broker-dealer, financial planner, tax advisor, or attorney. All financial formulas, metrics (including Cap Rate, Cash-on-Cash Return, IRR, NOI, DSCR, and MAO), scorecards, valuation estimates, and exports are hypothetical illustrations based on user-supplied assumptions and third-party data. They do not constitute investment, legal, tax, or financial advice and are not a prediction or guarantee of performance. Consult qualified licensed professionals before executing real estate transactions.',
  },
  {
    heading: '4. Third-Party Integrations & Bank Connectivity',
    body: 'When you link bank accounts via Plaid Technologies, Inc., or retrieve property valuations via RentCast or Google Maps, you authorize PaperWorking to access and process data from these providers on your behalf. You agree to comply with all applicable terms of service of such providers, including Plaid’s End User Privacy Policy. PaperWorking is not responsible for the accuracy or uninterrupted availability of third-party APIs.',
  },
  {
    heading: '5. AI Support Assistant ("Pepper")',
    body: 'Pepper is an automated customer support assistant intended solely to explain platform features and real estate definitions. Pepper does not provide deal advice or underwriting recommendations. For specific transactions, rely on licensed professionals.',
  },
  {
    heading: '6. Acceptable Use & Intellectual Property',
    body: 'You retain all ownership rights in the deal data, documents, and content you enter into PaperWorking. You grant PaperWorking a limited license to host and process that data to provide the services. You agree not to reverse engineer the software, scrape data, or use the platform to transmit unlawful material.',
  },
  {
    heading: '7. Termination & Workspace Deletion',
    body: 'You may terminate your account at any time via Settings. PaperWorking reserves the right to suspend or terminate accounts that violate these terms or compromise platform security.',
  },
  {
    heading: '8. Governing Law & Dispute Resolution',
    body: 'These Terms are governed by and construed in accordance with applicable laws. Note: Official registered legal entity details are pending final counsel approval as indicated in the draft notice.',
  },
];

export const COOKIES_SECTIONS: LegalSection[] = [
  {
    heading: 'What Are Cookies',
    body: 'Cookies are small text files stored on your device when you visit a website. They help us recognize your browser, remember your preferences, and keep your session secure.',
  },
  {
    heading: 'How We Use Cookies',
    body: 'Essential cookies are required for authentication, session management, and security — including `__session`, `__acct`, and `__sub`. Preference cookies remember display settings and dashboard layout. Analytics cookies help us improve navigation and feature prioritization; they are optional and disabled by default in the migration preview.',
  },
  {
    heading: 'Third-Party Cookies',
    body: 'PaperWorking uses Firebase Authentication and Stripe for payment processing. These services may set their own cookies to maintain secure sessions. We only integrate with providers that meet our security and privacy standards.',
  },
  {
    heading: 'Managing Your Preferences',
    body: 'Most browsers let you block or delete cookies through their settings menu. Disabling essential cookies will prevent you from logging into PaperWorking.',
  },
];

export const ABOUT_PRINCIPLES = [
  'Built for investors, not adapted for them. The four-phase lifecycle is the product\'s spine, not a feature.',
  'Numbers over adjectives. We publish the 33 KPIs and their formulas; if a metric matters, you can check the math.',
  'Your data is yours. Export everything, anytime. Cancel from Settings. No hostage negotiations.',
  'Honest about what we do. PaperWorking tracks interest; it never moves money. It produces reports for your CPA; it doesn\'t file your taxes. It\'s project management software, not investment advice.',
  'Community compounds. Tools bring investors here; the network of deals and professionals keeps them. Come for the tools, stay for the community.',
] as const;
