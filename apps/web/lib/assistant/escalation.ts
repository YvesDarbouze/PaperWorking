/**
 * Tier-aware escalation and human handoff engine for Ava.
 *
 * Implements business rules matching PaperWorking's public support promises:
 * - All plans: Email support (hi@paperworking.co) with pre-drafted transcript attached.
 * - Investor & Investment Team: Live chat handoff (<30m during business hours 9am-6pm EST).
 *   Off-hours: set expectations, offer email or scheduled callback.
 * - Investment Team only: Priority line for mid-closing emergencies.
 *   Proactively surfaced when urgency keywords are detected ("mid-closing", "wire", "deadline today").
 *   STRICTLY FORBIDDEN to be offered to Investor or Vendor tiers.
 * - Self-serve first: deep links to Glossary, Playbook, and Support Center.
 */

import { AVA_CONFIG } from './config';

export type SupportChannelType = 'email' | 'live_chat' | 'priority_line' | 'callback' | 'self_serve';

export interface EscalationOption {
  type: SupportChannelType;
  title: string;
  description: string;
  actionLabel: string;
  actionUrl?: string;
  isUrgent?: boolean;
  isAvailableNow: boolean;
  availabilityDetails?: string;
}

export interface EscalationContext {
  accountType: string;
  subscriptionPlan?: string;
  userMessage?: string;
  transcript?: Array<{ role: string; text: string }>;
  currentDate?: Date;
}

/**
 * Checks if current time is within PaperWorking's business hours:
 * Mon-Fri 9:00 AM - 6:00 PM US Eastern Time.
 */
export function isWithinBusinessHours(date: Date = new Date()): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: AVA_CONFIG.businessHours.timezone,
      weekday: 'short',
      hour: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const weekdayStr = parts.find((p) => p.type === 'weekday')?.value || '';
    const hourStr = parts.find((p) => p.type === 'hour')?.value || '0';
    const hour = Number.parseInt(hourStr, 10);

    const isWorkDay = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(weekdayStr);
    const isWorkHour = hour >= AVA_CONFIG.businessHours.startHour && hour < AVA_CONFIG.businessHours.endHour;
    return isWorkDay && isWorkHour;
  } catch {
    // Fallback: assume business hours for testing/local
    const day = date.getDay();
    const hour = date.getHours();
    return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
  }
}

/**
 * Detects whether the user's message contains mid-closing or urgent closing keywords.
 */
export function containsUrgencyKeywords(message?: string): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return AVA_CONFIG.urgencyKeywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

/**
 * Determines available escalation channels based strictly on the verified tier.
 * Invariant: The priority line is NEVER offered to non-Investment Team tiers.
 */
export function determineEscalationOptions(context: EscalationContext): EscalationOption[] {
  const normalizedAccountType = (context.accountType || 'investor').toLowerCase();
  const isInvestmentTeam = normalizedAccountType === 'investment_team' || normalizedAccountType === 'admin';
  const isInvestorOrTeam = isInvestmentTeam || normalizedAccountType === 'investor';
  const hasUrgency = containsUrgencyKeywords(context.userMessage);
  const bizHoursActive = isWithinBusinessHours(context.currentDate);

  const options: EscalationOption[] = [];

  // 1. Priority Support Line — STRICTLY Investment Team Only
  if (isInvestmentTeam) {
    options.push({
      type: 'priority_line',
      title: 'Emergency Priority Line',
      description:
        "Dedicated line for mid-closing crises. If you're mid-closing or wiring funds and something breaks, our senior team picks up immediately.",
      actionLabel: 'Call Priority Line (Direct)',
      actionUrl: 'tel:+18005550199',
      isUrgent: true,
      isAvailableNow: true,
      availabilityDetails: '24/7 Dedicated Emergency Closing Desk',
    });
  }

  // 2. Live Chat Handoff — Investor & Investment Team
  if (isInvestorOrTeam) {
    if (bizHoursActive) {
      options.push({
        type: 'live_chat',
        title: 'Live Specialist Chat',
        description: 'Connect with a live customer service specialist in under 30 minutes.',
        actionLabel: 'Connect to Live Specialist',
        isAvailableNow: true,
        availabilityDetails: 'Typical response: < 30 minutes (Business hours)',
      });
    } else {
      options.push({
        type: 'callback',
        title: 'Schedule a Morning Callback',
        description:
          'Our live desk is currently off-hours (9am–6pm EST). Schedule a prioritized callback for the first morning window.',
        actionLabel: 'Request Morning Callback',
        isAvailableNow: false,
        availabilityDetails: 'Next window: tomorrow at 9:00 AM EST',
      });
    }
  }

  // 3. Email Support — Guaranteed for All Plans
  options.push({
    type: 'email',
    title: 'Email Support (Direct Desk)',
    description:
      'A real person answers every message at hi@paperworking.co. Ava can pre-fill your message with your current deal context and chat transcript.',
    actionLabel: 'Pre-draft Support Email',
    actionUrl: `mailto:${AVA_CONFIG.supportEmail}?subject=${encodeURIComponent(
      `PaperWorking Support Request [${context.accountType}]`,
    )}`,
    isAvailableNow: true,
    availabilityDetails: 'Response guaranteed for all plans',
  });

  // 4. Self-Serve Knowledge Links
  options.push({
    type: 'self_serve',
    title: 'Self-Serve Help Resources',
    description: 'Explore the Playbook (33 Metrics), terminology Glossary, or Support Center.',
    actionLabel: 'Browse Playbook & Guides',
    actionUrl: '/support/metrics',
    isAvailableNow: true,
  });

  // If urgency keywords are detected on an Investment Team tier, put the priority line at the top
  if (hasUrgency && isInvestmentTeam) {
    return options.sort((a, b) => (a.type === 'priority_line' ? -1 : 1));
  }

  return options;
}

/**
 * Formats transcript as a readable string for email attachments or callbacks.
 */
export function formatTranscriptForHandoff(
  transcript?: Array<{ role: string; text: string }>,
): string {
  if (!transcript || transcript.length === 0) {
    return 'No prior conversation recorded.';
  }

  return transcript
    .map((item, index) => {
      const speaker = item.role === 'user' ? 'User' : AVA_CONFIG.agentName;
      return `[${index + 1}] ${speaker}:\n${item.text.trim()}\n`;
    })
    .join('\n');
}
