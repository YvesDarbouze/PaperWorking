export function validateInvitationTokenFormat(token: string | undefined | null): boolean {
  return typeof token === 'string' && token.length >= 16;
}

export interface GuestPortalInvitation {
  name?: string;
  email?: string;
  dealName?: string;
  projectId: string;
  proposedAmount?: number;
  proposedEquityPercent?: number;
  status: string;
  expiresAt: Date | string;
  cardExchangeStatus?: string;
  inviteeBusinessCard?: unknown;
  leadInvestorBusinessCard?: unknown;
  indication?: unknown;
  opportunitySummary?: string;
  legalEntity?: string;
  listingId?: string;
  version?: number;
  visibilityMode?: string;
}

export interface GuestPortalProject {
  propertyName?: string;
  propertyAddress?: string;
  address?: { street?: string; city?: string; state?: string; zip?: string };
  subStrategy?: string;
  dispositionType?: string;
  assetClass?: string;
  vision?: string;
  description?: string;
  legalEntity?: string;
  createdAt?: Date | string;
  financials?: Record<string, unknown>;
}

export interface GuestPortalRaiseProgress {
  raiseRaised: number;
  raisePercentage: number;
}

export interface GuestPortalMetricHistory {
  noiHistory: Array<{ date: string; value: number }>;
  capRateHistory: Array<{ date: string; value: number }>;
  cashFlowHistory: Array<{ date: string; value: number }>;
}

export interface GuestPortalInquiry {
  id: string;
  projectId: string;
  invitationId: string;
  isOwn: boolean;
  investorName: string;
  investorEmail: string | null;
  status: string;
  isShared: boolean;
  messages: unknown[];
  createdAt: string;
  updatedAt: string;
}

export function buildGuestPortalResponse(input: {
  invitation: GuestPortalInvitation;
  project: GuestPortalProject;
  raiseTarget: number;
  raiseProgress: GuestPortalRaiseProgress;
  daysLeft: number;
  hoursLeft: number;
  metricHistory: GuestPortalMetricHistory;
  commitmentStatus: string;
  commitmentId: string | null;
  inquiries: GuestPortalInquiry[];
}): Record<string, unknown> {
  const { invitation: inv, project } = input;
  const fin = project.financials ?? {};

  const expiresAt =
    inv.expiresAt instanceof Date ? inv.expiresAt : new Date(inv.expiresAt);

  const propertyAddress =
    [
      project.address?.street,
      project.address?.city,
      project.address?.state,
      project.address?.zip,
    ]
      .filter(Boolean)
      .join(', ') ||
    project.propertyAddress ||
    '';

  return {
    investorName: inv.name,
    investorEmail: inv.email,
    dealName: inv.dealName || project.propertyName || 'Untitled Deal',
    propertyAddress,
    strategy: project.subStrategy || project.dispositionType || 'Value-Add',
    assetClass: project.assetClass || 'Multi-Family',
    opportunitySummary: project.vision || inv.opportunitySummary || project.description || '',
    purchasePrice: (fin.purchasePrice as number | undefined) ?? 0,
    estimatedARV:
      (fin.estimatedARV as number | undefined) ??
      (fin.estimatedCurrentValue as number | undefined) ??
      0,
    expectedROI:
      (fin.expectedROI as number | undefined) ??
      (fin.expectedIRR as number | undefined) ??
      (fin.roi as number | undefined) ??
      0,
    investmentAmount: inv.proposedAmount ?? 0,
    equitySplit: inv.proposedEquityPercent ?? 0,
    interestRate: (fin.interestRate as number | undefined) ?? 0,
    termMonths:
      (fin.termMonths as number | undefined) ??
      ((fin.loanTermYears as number | undefined)
        ? (fin.loanTermYears as number) * 12
        : 12),
    legalEntity: project.legalEntity || inv.legalEntity || '',
    raiseTarget: input.raiseTarget,
    raiseRaised: input.raiseProgress.raiseRaised,
    raisePercentage: input.raiseProgress.raisePercentage,
    daysLeft: input.daysLeft,
    hoursLeft: input.hoursLeft,
    noiHistory: input.metricHistory.noiHistory,
    capRateHistory: input.metricHistory.capRateHistory,
    cashFlowHistory: input.metricHistory.cashFlowHistory,
    burnRateHistory: [] as Array<{ date: string; value: number }>,
    expiresAt: expiresAt.toISOString(),
    status: inv.status,
    commitmentStatus: input.commitmentStatus,
    commitmentId: input.commitmentId,
    subscriptionAgreementTemplate:
      (fin.subscriptionAgreementTemplate as string | null | undefined) ?? null,
    projectId: inv.projectId,
    inquiries: input.inquiries,
    cardExchangeStatus: inv.cardExchangeStatus || 'none',
    inviteeBusinessCard: inv.inviteeBusinessCard || null,
    leadInvestorBusinessCard:
      inv.cardExchangeStatus === 'accepted' ? inv.leadInvestorBusinessCard || null : null,
    indication: inv.indication || null,
  };
}

export function normalizeDealInvitation(raw: Record<string, unknown>): GuestPortalInvitation {
  return {
    name: (raw.inviteeName as string | undefined) || 'Anonymous Investor',
    email: raw.inviteeEmail as string | undefined,
    projectId: raw.projectId as string,
    proposedAmount: (raw.proposedAmount as number | undefined) || 0,
    proposedEquityPercent: (raw.proposedEquityPercent as number | undefined) || 0,
    status:
      raw.status === 'sent' || raw.status === 'opened' || raw.status === 'pending'
        ? 'pending'
        : (raw.status as string),
    expiresAt:
      (raw.expiresAt as string | Date | undefined) ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    cardExchangeStatus: raw.cardExchangeStatus as string | undefined,
    inviteeBusinessCard: raw.inviteeBusinessCard,
    leadInvestorBusinessCard: raw.leadInvestorBusinessCard,
    indication: raw.indication,
  };
}
