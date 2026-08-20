import { WEB_APP_STATUS } from '../index.js';
import { toNextResponse } from '../../lib/api/adapt-route-result.js';
import { decodeSubCookie, DEV_MOCK_SESSION_TOKEN } from '../../lib/auth/session-cookies.js';
import {
  DASHBOARD_PLACEHOLDER_ROUTES,
  PORTFOLIO_SUMMARY,
} from '../../lib/dashboard/content.js';
import {
  getPageLabel,
  resolveBottomNav,
  resolvePrimaryNav,
} from '../../lib/navigation/nav-contract.js';

describe('phase 5c — web app status', () => {
  it('includes dashboard shell routes on web app status', () => {
    expect(WEB_APP_STATUS.routes).toContain('/dashboard');
    expect(WEB_APP_STATUS.routes).toContain('/dashboard/command-center');
    expect(WEB_APP_STATUS.dashboardRoutes.length).toBeGreaterThanOrEqual(7);
  });
});

describe('phase 5c — navigation contract', () => {
  it('returns investor primary nav with portfolio first', () => {
    const nav = resolvePrimaryNav({ accountType: 'investor', subscriptionPlan: 'Individual' });
    expect(nav[0]?.href).toBe('/dashboard');
    expect(nav.find((item) => item.id === 'projects')?.href).toBe('/projects');
  });

  it('returns five bottom-nav items for investors', () => {
    expect(resolveBottomNav({ accountType: 'investor' })).toHaveLength(5);
  });

  it('labels portfolio and projects paths', () => {
    expect(getPageLabel('/dashboard')).toBe('Portfolio');
    expect(getPageLabel('/dashboard/command-center')).toBe('Portfolio');
    expect(getPageLabel('/projects')).toBe('Projects');
    expect(getPageLabel('/dashboard/projects/abc')).toBe('Projects');
  });
});

describe('phase 5c — session cookies', () => {
  it('decodes subscription cookie payloads', () => {
    const encoded = Buffer.from(JSON.stringify({ plan: 'Team', status: 'trialing' }), 'utf8').toString(
      'base64',
    );
    expect(decodeSubCookie(encoded)).toEqual({ plan: 'Team', status: 'trialing' });
  });

  it('uses mock token constant compatible with source dashboard gate', () => {
    expect(DEV_MOCK_SESSION_TOKEN).toBe('mock_session_token_123');
  });
});

describe('phase 5c — dashboard content', () => {
  it('provides portfolio summary seed data', () => {
    expect(PORTFOLIO_SUMMARY.activeDeals).toBeGreaterThan(0);
    expect(DASHBOARD_PLACEHOLDER_ROUTES).toContain('/dashboard/deals');
  });
});

describe('phase 5c — route result adapter', () => {
  it('maps handler cookies onto NextResponse', () => {
    const response = toNextResponse({
      status: 200,
      body: { status: 'success' },
      headers: { 'content-type': 'application/json' },
      cookies: [
        {
          name: '__session',
          value: 'mock_session_token_123',
          options: { path: '/', httpOnly: true, maxAge: 3600 },
        },
      ],
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('__session=');
  });
});
