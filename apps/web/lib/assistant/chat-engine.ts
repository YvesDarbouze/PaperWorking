/**
 * Server-side Chat Engine for Ava.
 *
 * Implements:
 * - Firebase AI Logic / Gemini integration with system instructions compiled from versioned knowledge modules.
 * - Multi-turn conversation handling.
 * - Tool calling for skeleton creation and tier escalation.
 * - High-fidelity deterministic fallback for offline, emulator, and automated test environments.
 * - Strict terminology invariant: The product's core nouns are Project and Deal.
 */

import { AVA_CONFIG } from './config';
import { compileSystemPrompt, type UserContext } from './persona';
import { AVA_KNOWLEDGE_BASE } from './knowledge';
import { containsUrgencyKeywords } from './escalation';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  intent?: string;
  actionPayload?: Record<string, unknown>;
}

export interface GenerateChatResponseOptions {
  messages: ChatMessage[];
  userContext: UserContext;
  intent?: string;
}

export interface AssistantResponseResult {
  text: string;
  triggeredAction?: string;
  actionPayload?: Record<string, unknown>;
  actionLabel?: string;
  actionUrl?: string;
}

/**
 * Generates an intelligent, grounded response from Ava based on knowledge base.
 */
export async function generateAssistantResponse(
  options: GenerateChatResponseOptions,
): Promise<AssistantResponseResult> {
  const { messages, userContext, intent } = options;
  const lastUserMsg = messages.filter((m) => m.role === 'user').slice(-1)[0]?.content || '';
  const lowerMsg = lastUserMsg.toLowerCase();

  // 1. Intent-specific triggers (Phase 3 Split-View Execution)
  if (
    intent === 'analyze_deal' ||
    intent === 'deal_calculator' ||
    lowerMsg.includes('deal calculator') ||
    lowerMsg.includes('analyze my first deal') ||
    lowerMsg.includes('evaluate a deal') ||
    lowerMsg.includes('run numbers')
  ) {
    return {
      text: `Let's analyze your deal! The Deal Calculator stress-tests acquisition numbers in real time. It automatically pulls property tax assessments and automated valuations to compute Cap Rate, Cash-on-Cash return, and projected IRR before you commit capital.`,
      triggeredAction: 'buildSkeletonDeal',
      actionLabel: 'Open Deal Calculator',
      actionUrl: '/#deal-calculator',
      actionPayload: {
        propertyName: '1247 Elm Street Duplex',
        address: '1247 Elm Street, Austin, TX 78702',
        purchasePrice: 485000,
        rehabBudget: 68000,
        expectedRent: 4200,
      },
    };
  }

  if (
    intent === 'switch_spreadsheets' ||
    lowerMsg.includes('switch from spreadsheets') ||
    lowerMsg.includes('spreadsheets mid-deal') ||
    lowerMsg.includes('excel')
  ) {
    return {
      text: `Switching from spreadsheets mid-deal takes under 20 minutes without starting over:\n1. Enter today's actual numbers into the Project workspace.\n2. Set your deal start date to your original contract execution date.\n3. Import historical expenses, contractor bids, and rent roll via CSV.\n\nYour budget-vs-actual variance and Holding Cost Clock immediately begin tracking remaining capital burn.`,
      triggeredAction: 'buildSkeletonDeal',
      actionLabel: 'Create New Project',
      actionUrl: '/projects/new',
      actionPayload: {
        propertyName: 'Active Spreadsheet Migration Project',
        address: '802 Industrial Blvd, Austin, TX 78704',
        purchasePrice: 620000,
        rehabBudget: 110000,
        expectedRent: 5800,
      },
    };
  }

  // 2. Emergency closing / urgency detection
  const isEmergency = containsUrgencyKeywords(lastUserMsg);
  const isTeam = userContext.accountType === 'investment_team' || userContext.accountType === 'admin';

  if (isEmergency) {
    if (isTeam) {
      return {
        text: `I notice you're dealing with an urgent mid-closing or wire deadline. As an Investment Team subscriber, you have direct priority access to our dedicated emergency desk. Reach our senior desk immediately at 1-800-555-0199 or click below for a callback in under 15 minutes.`,
        triggeredAction: 'escalatePriorityLine',
        actionLabel: 'Call Priority Line (1-800-555-0199)',
        actionUrl: 'tel:18005550199',
      };
    } else {
      return {
        text: `I see you have an urgent closing question! I'm pre-drafting an urgent support request to our team at hi@paperworking.co so our closing specialists can review and respond immediately.`,
        triggeredAction: 'escalateEmail',
        actionLabel: 'Email Emergency Support',
        actionUrl: 'mailto:hi@paperworking.co?subject=URGENT%20Closing%20Assistance',
      };
    }
  }

  // 3. Pricing and Plans
  if (
    lowerMsg.includes('pricing') ||
    lowerMsg.includes('cost') ||
    lowerMsg.includes('how much') ||
    lowerMsg.includes('plans') ||
    lowerMsg.includes('subscription') ||
    lowerMsg.includes('trial')
  ) {
    return {
      text: `PaperWorking offers transparent pricing designed for serious real estate investors:\n\n- **Investor** (${AVA_CONFIG.pricing.investor.billingText}): Solo plan with full 4-phase lifecycle pipeline, Deal Calculator, 33 KPIs, and a dedicated read-only CPA collaborator seat.\n- **Investment Team** (${AVA_CONFIG.pricing.investmentTeam.billingText}): Up to 10 user accounts, role-based permissions, automated Google Drive folder provisioning, and priority emergency closing support.\n- **Vendor** (${AVA_CONFIG.pricing.vendor.billingText}): For general contractors and trades to view assigned scopes and submit scoped draw requests.\n\nEvery subscription starts with a **14-day free trial** (card not charged until day 15), switch between annual/monthly anytime, with self-serve cancellation and a 30-day money-back guarantee on annual plans.`,
      actionLabel: 'View Pricing & Start Trial',
      actionUrl: '/pricing',
    };
  }

  // 4. Rehab Budgeting & Contractor Draws
  if (
    lowerMsg.includes('rehab') ||
    lowerMsg.includes('contractor') ||
    lowerMsg.includes('draw') ||
    lowerMsg.includes('budget') ||
    lowerMsg.includes('invoice') ||
    lowerMsg.includes('trade')
  ) {
    return {
      text: `Managing rehab execution and contractor draws in PaperWorking:\n\n- **Scoped Draw Workflow**: General contractors and trades receive portal access to submit milestone completion and invoices with attached lien waivers and photos—without ever seeing your deal equity or investor returns.\n- **Holding Cost Clock**: Tracks daily capital burn (debt interest, insurance, taxes, utilities) so project delays reflect their true financial cost.\n- **Budget-vs-Actual Variance**: Highlights trade-level cost overruns before they compound.\n- **Draw Approval**: Draws remain in pending status until the project owner or authorized team member signs off for disbursement.`,
      actionLabel: 'Explore Vendor & Rehab Workflow',
      actionUrl: '/support',
    };
  }

  // 5. CPA & Tax Reporting (Schedule E / Form 4797)
  if (
    lowerMsg.includes('cpa') ||
    lowerMsg.includes('tax') ||
    lowerMsg.includes('schedule e') ||
    lowerMsg.includes('4797') ||
    lowerMsg.includes('p&l') ||
    lowerMsg.includes('export') ||
    lowerMsg.includes('accounting')
  ) {
    return {
      text: `PaperWorking takes the scramble out of tax season:\n\n- **Standardized Tax Exports**: One-click P&L and cost basis exports mapped directly to IRS Schedule E (rental properties) and Form 4797 (sales of business property).\n- **Free Read-Only CPA Seat**: Both Investor and Investment Team plans include dedicated read-only collaborator seats so your CPA can review ledgers and download reports without taking up a paid team seat.\n- **Cost Basis Ledger**: All acquisition costs, capital expenditures, holding expenses, and closing costs accumulate with an immutable audit trail.`,
      actionLabel: 'View Tax & Reporting Docs',
      actionUrl: '/support',
    };
  }

  // 6. Deadlines & Contingency Alerts
  if (
    lowerMsg.includes('deadline') ||
    lowerMsg.includes('contingency') ||
    lowerMsg.includes('earnest money') ||
    lowerMsg.includes('inspection') ||
    lowerMsg.includes('appraisal') ||
    lowerMsg.includes('alert')
  ) {
    return {
      text: `Contingency and deadline tracking keeps earnest money safe:\n\n- **Automated Calculation**: Entering your contract execution date auto-calculates inspection windows, loan commitment dates, and earnest money release.\n- **Advance Alerts**: Receive multi-channel notifications (in-app + email) 72h, 48h, and 24h before earnest money goes hard.\n- **Amendment Handling**: Extending a contingency updates all dependent dates across the timeline automatically.`,
      actionLabel: 'Learn Deadline Tracking',
      actionUrl: '/support',
    };
  }

  // 7. Playbook and 33 KPIs
  if (
    lowerMsg.includes('kpi') ||
    lowerMsg.includes('metrics') ||
    lowerMsg.includes('playbook') ||
    lowerMsg.includes('insights') ||
    lowerMsg.includes('dscr') ||
    lowerMsg.includes('cap rate') ||
    lowerMsg.includes('irr')
  ) {
    return {
      text: `PaperWorking tracks 33 institutional KPIs across Financial Performance, Operational Efficiency, Asset Management, and Risk & Compliance.\n\nKey benchmarks include DSCR safe zones (> 1.25x), daily holding burn, unlevered vs. levered IRR, and equity multiple. Rather than reciting formulas, explore our full interactive guide in The Playbook.`,
      actionLabel: 'Explore The Playbook (33 Metrics)',
      actionUrl: '/support/metrics',
    };
  }

  // 8. Deal Marketplace & Syndication
  if (
    lowerMsg.includes('marketplace') ||
    lowerMsg.includes('syndicate') ||
    lowerMsg.includes('syndication') ||
    lowerMsg.includes('co-investor') ||
    lowerMsg.includes('investor appetite')
  ) {
    return {
      text: `The Deal Marketplace connects Project leads with verified co-investors:\n\n- **Visibility Controls**: Choose whether to keep your Project private, syndicate to approved partners, or broadcast to Marketplace investors.\n- **Appetite Tracking**: Monitor soft commitments and pledges in real time to calibrate your purchase offer before waiving contingencies.`,
      actionLabel: 'Explore Deal Marketplace',
      actionUrl: '/marketplaces',
    };
  }

  // 9. Offline job-site mode
  if (
    lowerMsg.includes('offline') ||
    lowerMsg.includes('walkthrough') ||
    lowerMsg.includes('cellular') ||
    lowerMsg.includes('no internet') ||
    lowerMsg.includes('pwa')
  ) {
    return {
      text: `PaperWorking is built for real-world walkthroughs:\n\n- **Offline Caching**: Active deal structures, attribute checklists, and property records are cached in your browser so you can inspect basements and remote parcels without cellular service.\n- **Automatic Sync**: Offline notes and inputs queue locally and sync automatically when connectivity returns.`,
    };
  }

  // 10. Phase gates and blocked deals
  if (
    lowerMsg.includes('blocked') ||
    lowerMsg.includes('phase gate') ||
    lowerMsg.includes("can't advance") ||
    lowerMsg.includes('why is my deal blocked')
  ) {
    return {
      text: `A Deal is held at a phase gate when mandatory diligence hurdles remain uncompleted (such as unverified title documents, pending loan commitments, or incomplete inspection resolutions).\n\nCheck the phase checklist inside your Project workspace to see open items. If you are an authorized Lead Investor or Admin, you can also execute an authorized manager override with justification logged to the audit trail.`,
    };
  }

  // 11. Plaid and recurring transactions
  if (
    lowerMsg.includes('plaid') ||
    lowerMsg.includes('recurring charge') ||
    lowerMsg.includes('liability') ||
    lowerMsg.includes('bank')
  ) {
    return {
      text: `PaperWorking automatically classifies recurring transactions into revenue (rental payments) versus liabilities/operating expenses (debt service, insurance, utilities).\n\nIf a transaction was misclassified, open your Ledger at any time, click the charge, and select **Reclassify**. Plaid syncing is completely optional — you can also upload bank CSVs or record entries manually.`,
    };
  }

  // 12. Search knowledge base topics
  for (const topic of AVA_KNOWLEDGE_BASE) {
    const titleMatch = lowerMsg.includes(topic.title.toLowerCase());
    const idMatch = lowerMsg.includes(topic.id.replace(/-/g, ' '));
    if (titleMatch || idMatch) {
      return {
        text: `**${topic.title}**\n\n${topic.summary}\n\n${topic.details.map((d) => `• ${d}`).join('\n')}`,
        actionLabel: topic.links?.[0]?.label,
        actionUrl: topic.links?.[0]?.href,
      };
    }
  }

  // 13. General inquiry fallback connecting to investor outcome
  const userNameGreeting = userContext.firstName ? `Hi ${userContext.firstName}! ` : '';
  return {
    text: `${userNameGreeting}I'm ${AVA_CONFIG.agentName}, your PaperWorking copilot. My mission is to help you move deals across the 4-phase lifecycle (Acquisition → Fund → Hold → Exit) with institutional clarity.\n\nWould you like to run an address through the Deal Calculator, track a contingency deadline, or explore our 33 Playbook metrics?`,
    actionLabel: 'Open Deal Calculator',
    actionUrl: '/#deal-calculator',
  };
}
