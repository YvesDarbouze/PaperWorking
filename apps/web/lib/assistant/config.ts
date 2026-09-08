/**
 * Centralized configuration for the PaperWorking AI Assistant.
 * Single source of truth for display name, model selection, pricing truth,
 * policies, and tier-specific escalation parameters.
 */

export interface PricingTierConfig {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  billingText: string;
  entitlements: string[];
}

export interface AssistantConfig {
  agentName: string;
  modelName: string;
  supportEmail: string;
  trialDurationDays: number;
  businessHours: {
    timezone: string;
    startHour: number; // 9 AM
    endHour: number;   // 6 PM (18:00)
    workDays: number[]; // Mon-Fri (1-5)
  };
  pricing: {
    investor: PricingTierConfig;
    investmentTeam: PricingTierConfig;
    vendor: PricingTierConfig;
  };
  policies: {
    trialDays: number;
    billingStartDay: number;
    annualMoneyBackDays: number;
    postCancellationReadOnlyDays: number;
    cancellationPath: string;
    annualMonthlySwitching: boolean;
  };
  urgencyKeywords: string[];
}

export const PEPPER_CONFIG: AssistantConfig = {
  // Configurable single place for agent display name
  agentName: process.env.NEXT_PUBLIC_ASSISTANT_NAME || 'Pepper',

  // Externalized model version so upgrades do not require client deploys
  modelName: process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash-lite',

  supportEmail: 'hi@paperworking.co',
  trialDurationDays: 14,

  businessHours: {
    timezone: 'America/New_York', // Eastern Time
    startHour: 9,
    endHour: 18,
    workDays: [1, 2, 3, 4, 5],
  },

  pricing: {
    investor: {
      name: 'Investor',
      monthlyPrice: 59,
      annualPrice: 499,
      billingText: '$499/yr or $59/mo',
      entitlements: [
        'Four-phase REIL project lifecycle',
        'All 33 KPI visualizations',
        'Deal Calculator with live property data',
        'Ledger/expense logging & Holding Cost Clock',
        'Secure Document Vault',
        'CPA-ready tax reports',
        'Deal Marketplace access',
        'Read-only CPA collaborator seat',
        'Solo plan: 1 account',
      ],
    },
    investmentTeam: {
      name: 'Investment Team',
      monthlyPrice: 99,
      annualPrice: 999,
      billingText: '$999/yr or $99/mo',
      entitlements: [
        'Everything in Investor',
        'Up to 10 user accounts',
        'Lead Investor task assignment',
        'Role-based permissions (Admins, Editors, Viewers)',
        'Represent team in Deal Marketplace',
        'Google Drive folder provisioning',
        'Priority support line for mid-closing emergencies',
      ],
    },
    vendor: {
      name: 'Vendor',
      monthlyPrice: 39,
      annualPrice: 390,
      billingText: '$390/yr or $39/mo',
      entitlements: [
        'Vendor Marketplace listing by trade and market geography',
        'Access to assigned project scopes and work orders',
        'Scoped contractor draw submissions without visibility into overall project financials',
        'Standard trade financial reporting',
      ],
    },
  },

  policies: {
    trialDays: 14,
    billingStartDay: 15,
    annualMoneyBackDays: 30,
    postCancellationReadOnlyDays: 90,
    cancellationPath: 'Dashboard → Settings → Billing',
    annualMonthlySwitching: true,
  },

  urgencyKeywords: [
    'mid-closing',
    'wire',
    'deadline today',
    'closing today',
    'wire instructions',
    'urgent wire',
    'emergency closing',
    'closing escrow',
  ],
};

export const AVA_CONFIG = PEPPER_CONFIG;
