export const INVITE_ROLES = new Set(['Lead Investor', 'Admin', 'Platform Admin']);

export interface BroadcastRecipient {
  email: string;
  name: string;
  potentialTicket: number;
  emailConsent: boolean;
  inAppConsent: boolean;
}

export interface RawAudienceContact {
  email?: string;
  name?: string;
  potentialTicket?: number;
  emailConsent?: boolean;
  inAppConsent?: boolean;
}

export function canSendProjectInvitations(params: {
  isProjectMember: boolean;
  memberRole?: string;
  projectPermissions?: string[];
  callerOrgId?: string;
  projectOrgId?: string;
  callerOrgRole?: string;
}): boolean {
  if (params.isProjectMember) {
    const hasInviteRole = INVITE_ROLES.has(params.memberRole ?? '');
    const hasInvitePermission =
      Array.isArray(params.projectPermissions) &&
      params.projectPermissions.includes('team.invite');
    return hasInviteRole || hasInvitePermission;
  }

  return (
    !!params.callerOrgId &&
    params.callerOrgId === params.projectOrgId &&
    INVITE_ROLES.has(params.callerOrgRole ?? '')
  );
}

export function deduplicateBroadcastRecipients(
  contacts: RawAudienceContact[],
  followers: RawAudienceContact[],
): BroadcastRecipient[] {
  const deduplicated: Record<string, BroadcastRecipient> = {};

  for (const c of contacts) {
    const email = (c.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) continue;
    deduplicated[email] = {
      email: c.email!.trim(),
      name: c.name || 'Unnamed Investor',
      potentialTicket: c.potentialTicket || 0,
      emailConsent: c.emailConsent !== false,
      inAppConsent: c.inAppConsent !== false,
    };
  }

  for (const f of followers) {
    const email = (f.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) continue;
    if (deduplicated[email]) {
      deduplicated[email].emailConsent =
        deduplicated[email].emailConsent && f.emailConsent !== false;
      deduplicated[email].inAppConsent =
        deduplicated[email].inAppConsent || f.inAppConsent !== false;
    } else {
      deduplicated[email] = {
        email: f.email!.trim(),
        name: f.name || 'Unnamed Investor',
        potentialTicket: 0,
        emailConsent: f.emailConsent !== false,
        inAppConsent: f.inAppConsent !== false,
      };
    }
  }

  return Object.values(deduplicated);
}

export function filterConsentedRecipients(recipients: BroadcastRecipient[]): BroadcastRecipient[] {
  return recipients.filter((r) => r.emailConsent || r.inAppConsent);
}

export interface DealFinancialTerms {
  fundingTarget?: number;
  equityOfferedPct?: number;
  minTicket?: number;
  finalAgreedPrice?: number;
  purchasePrice?: number;
  projectedNOI?: number;
  projectedCapRate?: number;
  projectedCashOnCash?: number;
  holdPeriodYears?: number;
}

export function applyInvitationTemplateVariables(
  template: string,
  deal: {
    propertyAddress?: string;
    propertyName?: string;
    subStrategy?: string;
    dispositionType?: string;
  },
  fin: DealFinancialTerms,
): string {
  const dealName = deal.propertyAddress || deal.propertyName || 'Untitled Deal';
  const fundingTarget = fin.fundingTarget ?? 0;
  const equityOfferedPct = fin.equityOfferedPct ?? 0;
  const minTicket = fin.minTicket ?? 0;

  return template
    .replaceAll('{{PROPERTY_ADDRESS}}', dealName)
    .replaceAll(
      '{{TARGET_PRICE}}',
      fin.finalAgreedPrice
        ? `$${(fin.finalAgreedPrice / 100).toLocaleString()}`
        : fin.purchasePrice
          ? `$${(fin.purchasePrice / 100).toLocaleString()}`
          : '$0',
    )
    .replaceAll(
      '{{PROJECTED_NOI}}',
      fin.projectedNOI ? `$${(fin.projectedNOI / 100).toLocaleString()}` : '$0',
    )
    .replaceAll(
      '{{PROJECTED_CAP_RATE}}',
      fin.projectedCapRate ? `${fin.projectedCapRate}%` : '0%',
    )
    .replaceAll(
      '{{PROJECTED_COC}}',
      fin.projectedCashOnCash ? `${fin.projectedCashOnCash}%` : '0%',
    )
    .replaceAll('{{STRATEGY}}', deal.subStrategy || deal.dispositionType || 'Value-Add')
    .replaceAll(
      '{{HOLD_HORIZON}}',
      fin.holdPeriodYears ? `${fin.holdPeriodYears} Years` : '5 Years',
    )
    .replaceAll('{{FUNDING_TARGET}}', `$${fundingTarget.toLocaleString()}`)
    .replaceAll('{{EQUITY_PERCENT}}', `${equityOfferedPct}%`)
    .replaceAll('{{MIN_TICKET}}', `$${minTicket.toLocaleString()}`);
}

export function computeProposedInvestmentTerms(
  recipient: BroadcastRecipient,
  fin: DealFinancialTerms,
): { proposedAmount: number; proposedEquityPercent: number } {
  const fundingTarget = fin.fundingTarget ?? 0;
  const equityOfferedPct = fin.equityOfferedPct ?? 0;
  const minTicket = fin.minTicket ?? 0;
  const proposedAmount =
    recipient.potentialTicket > 0 ? recipient.potentialTicket / 100 : minTicket;
  const proposedEquityPercent =
    fundingTarget > 0 ? (proposedAmount / fundingTarget) * equityOfferedPct : 0;
  return { proposedAmount, proposedEquityPercent };
}

export function isPurchasedListBlocked(
  check: { isSuspicious: boolean; strangersCount: number },
  visibilityMode: string,
): boolean {
  return check.isSuspicious && check.strangersCount > 15 && visibilityMode === 'PRIVATE';
}
