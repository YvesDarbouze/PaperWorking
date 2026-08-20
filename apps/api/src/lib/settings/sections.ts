export const DEFAULT_NOTIFICATION_PREFERENCES = {
  syndication: { email: true, inApp: true },
  bids: { email: true, inApp: true },
  tasks: { email: true, inApp: true },
  deadlines: { email: true, inApp: true },
  billing: { email: true, inApp: true },
} as const;

export function parseSettingsSection(sectionPath: string[] = []): {
  section: string | undefined;
  subAction: string | undefined;
} {
  return {
    section: sectionPath[0],
    subAction: sectionPath[1],
  };
}

export function buildProfileResponse(user: Record<string, unknown>): Record<string, unknown> {
  return {
    name: user.displayName || 'User',
    email: user.email || '',
    avatar: user.avatar || '',
    role: user.role || 'Lead Investor',
    timezone: user.timezone || 'America/New_York',
    phone: user.phone || '',
    companyName: user.companyName || '',
    twoFaEnabled: !!user.twoFaEnabled,
  };
}

export function buildBillingSettingsResponse(user: Record<string, unknown>): Record<string, unknown> {
  const plan = (user.subscriptionPlan as string | undefined) || 'None';
  const status = (user.subscriptionStatus as string | undefined) || 'inactive';
  const paymentMethods =
    (user.paymentMethods as unknown[]) ||
    (plan !== 'None'
      ? [
          {
            id: 'pm_1',
            brand: 'visa',
            last4: '4242',
            expMonth: 12,
            expYear: 2028,
            isDefault: true,
          },
        ]
      : []);
  const invoices =
    (user.invoices as unknown[]) ||
    (plan !== 'None'
      ? [
          {
            id: 'in_1',
            number: 'INV-001',
            date: new Date().toISOString(),
            amount: plan === 'Team' ? '$99.00' : '$59.00',
            status: 'paid',
            pdfUrl: '#',
            hostedUrl: '#',
          },
        ]
      : []);
  const price =
    plan === 'Team'
      ? '$99.00'
      : plan === 'Individual'
        ? '$59.00'
        : plan === 'Vendor Network'
          ? '$39.00'
          : '—';

  return {
    plan,
    price,
    nextBillingDate:
      (user.nextBillingDate as string | undefined) ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status,
    subscriptionStatus: status,
    paymentMethods,
    invoices,
    companyName: user.companyName || '',
    billingEmail: user.billingEmail || user.email || '',
    billingAddress: user.billingAddress || '',
  };
}

export function validateBillingContactUpdate(body: {
  companyName?: unknown;
  billingEmail?: unknown;
  billingAddress?: unknown;
}): { ok: true; update: Record<string, string> } | { ok: false; error: string; status: number } {
  const trimmedEmail = typeof body.billingEmail === 'string' ? body.billingEmail.trim() : '';
  if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { ok: false, error: 'Enter a valid billing email address.', status: 400 };
  }
  return {
    ok: true,
    update: {
      companyName: typeof body.companyName === 'string' ? body.companyName.trim().slice(0, 200) : '',
      billingEmail: trimmedEmail,
      billingAddress:
        typeof body.billingAddress === 'string' ? body.billingAddress.trim().slice(0, 500) : '',
    },
  };
}

export function buildProfileUpdate(body: {
  firstName?: unknown;
  lastName?: unknown;
  phone?: unknown;
  companyName?: unknown;
  avatar?: unknown;
}): { displayName: string; phone: string; companyName: string; avatar?: unknown } {
  const firstName = typeof body.firstName === 'string' ? body.firstName : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName : '';
  const displayName = `${firstName} ${lastName}`.trim();
  return {
    displayName,
    phone: typeof body.phone === 'string' ? body.phone : '',
    companyName: typeof body.companyName === 'string' ? body.companyName : '',
    avatar: body.avatar,
  };
}

export function buildWorkspaceSettingsResponse(org: Record<string, unknown>): Record<string, unknown> {
  return {
    name: org.name || 'Apex Capital Workspace',
    logo: org.logo || '',
    timezone: org.timezone || 'America/New_York',
    targetCapRate: org.targetCapRate ?? 5.5,
    targetCoc: org.targetCoc ?? 8.0,
    minDscr: org.minDscr ?? 1.25,
    maxPurchasePrice: org.maxPurchasePrice ?? 500000,
  };
}

export function buildSecuritySettingsResponse(org: Record<string, unknown>): Record<string, unknown> {
  return {
    ssoEnabled: org.ssoEnabled ?? false,
    twoFaRequired: org.twoFaRequired ?? false,
    sessionTimeout: org.sessionTimeout ?? '24 hours',
    ipAllowlist: org.ipAllowlist ?? '',
    ssoProvider: org.ssoProvider ?? 'saml',
    samlEntityId: org.samlEntityId ?? '',
    samlSignInUrl: org.samlSignInUrl ?? '',
    samlX509Cert: org.samlX509Cert ?? '',
  };
}

export function buildDataPrivacyExportAttachment(
  orgId: string,
  exportId: string,
): { content: string; filename: string } {
  const content = JSON.stringify(
    {
      workspaceId: orgId,
      exportedAt: new Date().toISOString(),
      data: {
        properties: [
          { id: '1', address: '123 Sage Accent Way', value: '$450,000' },
          { id: '2', address: '742 Muted Green Blvd', value: '$890,000' },
        ],
        members: [{ email: 'admin@paperworking.com', role: 'Admin' }],
      },
    },
    null,
    2,
  );
  return { content, filename: `paperworking_export_${exportId}.json` };
}

export function buildIntegrationConnectUpdates(integrationId: string): Record<string, boolean> {
  const updates: Record<string, boolean> = {};
  if (integrationId === 'google-drive') updates.googleDriveConnected = true;
  if (integrationId === 'mls') updates.mlsConnected = true;
  if (integrationId === 'slack') updates.slackConnected = true;
  return updates;
}

export function buildIntegrationDisconnectUpdates(integrationId: string): Record<string, boolean> {
  const updates: Record<string, boolean> = {};
  if (integrationId === 'google-drive') updates.googleDriveConnected = false;
  if (integrationId === 'mls') updates.mlsConnected = false;
  if (integrationId === 'slack') updates.slackConnected = false;
  return updates;
}

export function validateWorkspaceDeletionConfirm(
  confirmName: unknown,
  orgName: string,
): { ok: true } | { ok: false; error: string; status: number } {
  if (confirmName !== orgName) {
    return { ok: false, error: 'Workspace name confirmation mismatch', status: 400 };
  }
  return { ok: true };
}

export function scheduleWorkspaceDeletionTimestamp(): string {
  return new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
}
