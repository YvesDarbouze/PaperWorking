export type AccountType = 'investor' | 'investment_team' | 'vendor' | 'admin';
export type UserTier = 'investor' | 'investment_team' | 'vendor';

export type ActionKey =
  | 'create_project'
  | 'delete_project'
  | 'assign_tasks'
  | 'receive_tasks'
  | 'answer_vendor_requests'
  | 'respond_to_investment_deals'
  | 'respond_investment_opportunities'
  | 'access_vendor_marketplace'
  | 'list_services'
  | 'view_portfolio'
  | 'view_team_portfolio'
  | 'generate_tax_reports'
  | 'invite_to_deal'
  | 'upgrade_to_team';

export interface PermissionContext {
  isOwner?: boolean;
  isInvested?: boolean;
  targetProjectId?: string;
  hasTeamMembership?: boolean;
}

export const PERMISSION_MATRIX: Record<UserTier, Record<string, boolean>> = {
  investor: {
    create_project: true,
    delete_own_project: true,
    delete_project: true,
    assign_tasks: false,           // BLOCKED — upgrade to Investment Team
    receive_tasks: true,
    answer_vendor_requests: true,
    respond_to_investment_deals: true,
    respond_investment_opportunities: true,
    access_vendor_marketplace: true,
    list_services: true,
    view_portfolio: true,          // Own portfolio only
    view_team_portfolio: false,
    generate_tax_reports: true,    // Own projects only
    invite_to_deal: false,         // BLOCKED — must be Investment Team
    upgrade_to_team: true,
  },
  investment_team: {
    create_project: true,
    delete_own_project: true,
    delete_project: true,
    assign_tasks: true,            // To team members AND vendors
    receive_tasks: true,
    answer_vendor_requests: true,
    respond_to_investment_deals: true,
    respond_investment_opportunities: true,
    access_vendor_marketplace: true,
    list_services: true,
    view_portfolio: true,          // Team portfolio (aggregated)
    view_team_portfolio: true,
    generate_tax_reports: true,    // Team projects
    invite_to_deal: true,          // Can invite to Deals
    upgrade_to_team: false,
    manage_team_members: true,
    set_team_roles: true,
  },
  vendor: {
    create_project: false,         // BLOCKED
    delete_own_project: false,
    delete_project: false,
    assign_tasks: false,           // BLOCKED
    receive_tasks: true,           // PRIMARY FUNCTION
    answer_vendor_requests: true,
    respond_to_investment_deals: false, // BLOCKED
    respond_investment_opportunities: false,
    access_vendor_marketplace: true,
    list_services: true,           // PRIMARY FUNCTION
    view_portfolio: false,         // BLOCKED
    view_team_portfolio: false,
    generate_tax_reports: false,   // BLOCKED
    invite_to_deal: false,         // BLOCKED
    upgrade_to_team: false,
  },
};

export const ADMIN_PERMISSIONS = {
  impersonate_user: true,
  view_all_projects: true,
  moderate_content: true,
  manage_billing: true,
  access_support_dashboard: true,
};

export function validateAccountType(type: string): AccountType {
  const normalized = (type || '').toLowerCase().trim();
  if (normalized === 'standard') {
    throw new Error('REJECTED role: "standard". Use "investor" instead.');
  }
  if (normalized === 'team') {
    throw new Error('REJECTED role: "team". Use "investment_team" instead.');
  }
  if (normalized === 'admin') {
    throw new Error('Admin accounts are internal only and cannot be assigned via sign-up.');
  }
  if (normalized === 'investor' || normalized === 'investment_team' || normalized === 'vendor') {
    return normalized as AccountType;
  }
  throw new Error(`Invalid account type: "${type}". Must be one of: investor, investment_team, vendor.`);
}

export function hasPermission(
  accountType: AccountType | string = 'investor',
  action: ActionKey | string,
  context: PermissionContext = {}
): boolean {
  // Map old role strings gracefully to new canonical roles
  let roleKey: UserTier = 'investor';
  if (accountType === 'investment_team' || accountType === 'team') {
    roleKey = 'investment_team';
  } else if (accountType === 'vendor') {
    roleKey = 'vendor';
  } else if (accountType === 'admin') {
    return true; // Master Admin has full platform access
  } else {
    roleKey = 'investor';
  }

  // Check vendor dual role (vendor who is also a member of an investment team)
  if (roleKey === 'vendor' && context.hasTeamMembership) {
    if (action === 'assign_tasks' || action === 'view_portfolio' || action === 'create_project' || action === 'invite_to_deal') {
      return true;
    }
  }

  const matrixRule = PERMISSION_MATRIX[roleKey]?.[action];
  if (typeof matrixRule === 'boolean') {
    return matrixRule;
  }

  // Fallback alias checks
  if (action === 'delete_project') {
    return roleKey === 'investor' ? Boolean(context.isOwner) : roleKey === 'investment_team';
  }

  return false;
}

export function getRequiredTierForAction(action: ActionKey | string): string {
  switch (action) {
    case 'assign_tasks':
    case 'invite_to_deal':
      return 'Investment Team';
    case 'create_project':
    case 'generate_tax_reports':
      return 'Investor or Investment Team';
    default:
      return 'Investment Team';
  }
}
