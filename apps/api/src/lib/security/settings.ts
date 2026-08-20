export interface SecuritySettings {
  ssoEnabled: boolean;
  twoFaRequired: boolean;
  sessionTimeout: string;
  ipAllowlist: string;
  ssoProvider?: string;
  samlEntityId?: string;
  samlSignInUrl?: string;
  samlX509Cert?: string;
}

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  ssoEnabled: false,
  twoFaRequired: false,
  sessionTimeout: '24 hours',
  ipAllowlist: '',
};

export function buildSecuritySettingsUpdate(body: Record<string, unknown>): SecuritySettings & {
  updatedAt?: unknown;
} {
  return {
    ssoEnabled: !!body.ssoEnabled,
    twoFaRequired: !!body.twoFaRequired,
    sessionTimeout:
      typeof body.sessionTimeout === 'string' ? body.sessionTimeout : '24 hours',
    ipAllowlist: typeof body.ipAllowlist === 'string' ? body.ipAllowlist : '',
    ssoProvider: typeof body.ssoProvider === 'string' ? body.ssoProvider : 'saml',
    samlEntityId: typeof body.samlEntityId === 'string' ? body.samlEntityId : '',
    samlSignInUrl: typeof body.samlSignInUrl === 'string' ? body.samlSignInUrl : '',
    samlX509Cert: typeof body.samlX509Cert === 'string' ? body.samlX509Cert : '',
  };
}

export function shouldInvalidateSessionsOnSsoEnable(
  previous: SecuritySettings | null,
  next: SecuritySettings,
): boolean {
  return next.ssoEnabled && !previous?.ssoEnabled;
}
