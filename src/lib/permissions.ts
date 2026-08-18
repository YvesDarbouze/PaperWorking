export type AccountType = 'standard' | 'team' | 'vendor' | 'investor';

export type ActionKey =
  | 'create_project'
  | 'delete_project'
  | 'assign_tasks'
  | 'receive_tasks'
  | 'answer_vendor_requests'
  | 'respond_investment_opportunities'
  | 'access_vendor_marketplace'
  | 'list_services'
  | 'view_portfolio'
  | 'generate_tax_reports';

export interface PermissionContext {
  isOwner?: boolean;
  isInvested?: boolean;
  targetProjectId?: string;
}

export const PERMISSION_MATRIX: Record<ActionKey, Record<AccountType, boolean | 'conditional'>> = {
  create_project: {
    standard: true,
    team: true,
    vendor: false,
    investor: false,
  },
  delete_project: {
    standard: 'conditional', // Only own projects
    team: true,
    vendor: false,
    investor: false,
  },
  assign_tasks: {
    standard: false, // Requires Team upgrade or invite prompt
    team: true,
    vendor: false,
    investor: false,
  },
  receive_tasks: {
    standard: true,
    team: true,
    vendor: true,
    investor: false,
  },
  answer_vendor_requests: {
    standard: true,
    team: true,
    vendor: true,
    investor: true,
  },
  respond_investment_opportunities: {
    standard: true,
    team: true,
    vendor: false,
    investor: true,
  },
  access_vendor_marketplace: {
    standard: true,
    team: true,
    vendor: true,
    investor: false, // Restricted for unsubscribed/pure investor role
  },
  list_services: {
    standard: true,
    team: true,
    vendor: true,
    investor: false,
  },
  view_portfolio: {
    standard: true,
    team: true,
    vendor: false,
    investor: 'conditional', // Only projects invested in
  },
  generate_tax_reports: {
    standard: true,
    team: true,
    vendor: false,
    investor: false,
  },
};

export function hasPermission(
  accountType: AccountType = 'standard',
  action: ActionKey,
  context: PermissionContext = {}
): boolean {
  const rule = PERMISSION_MATRIX[action]?.[accountType];

  if (rule === true) return true;
  if (rule === false || rule === undefined) return false;

  // Handle conditional rules
  if (action === 'delete_project') {
    return accountType === 'standard' ? Boolean(context.isOwner) : false;
  }

  if (action === 'view_portfolio') {
    return accountType === 'investor' ? Boolean(context.isInvested) : false;
  }

  return false;
}

export function getRequiredTierForAction(action: ActionKey): string {
  switch (action) {
    case 'assign_tasks':
      return 'Team';
    case 'create_project':
    case 'generate_tax_reports':
      return 'Standard or Team';
    default:
      return 'Team';
  }
}
