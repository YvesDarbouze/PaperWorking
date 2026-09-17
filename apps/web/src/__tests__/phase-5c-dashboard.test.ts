import { WEB_APP_STATUS } from '../index.js';
import { toNextResponse } from '../../lib/api/adapt-route-result.js';
import { decodeSubCookie, SESSION_COOKIE } from '../../lib/auth/session-cookies.js';
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
  it('returns investor primary nav with portfolio first and marketplace entry', () => {
    const nav = resolvePrimaryNav({ accountType: 'investor', subscriptionPlan: 'Individual' });
    expect(nav[0]?.href).toBe('/dashboard');
    expect(nav.find((item) => item.id === 'projects')?.href).toBe('/projects');
    expect(nav.find((item) => item.id === 'marketplace')?.href).toBe('/dashboard/marketplace');
  });

  it('returns five primary bottom-nav app destinations for investors', () => {
    const bottomNav = resolveBottomNav({ accountType: 'investor' });
    expect(bottomNav).toHaveLength(5);
    expect(bottomNav.map((i) => i.id)).toEqual(['projects', 'calculator', 'portfolio', 'support', 'more']);
    expect(bottomNav.find((item) => item.id === 'projects')?.href).toBe('/projects');
    expect(bottomNav.find((item) => item.id === 'calculator')?.href).toBe('/deal-calculator');
    expect(bottomNav.find((item) => item.id === 'portfolio')?.href).toBe('/dashboard');
    expect(bottomNav.find((item) => item.id === 'support')?.href).toBe('/support');
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

  it('defines standard session cookie constant', () => {
    expect(SESSION_COOKIE).toBe('__session');
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
          value: 'test_session_token_123',
          options: { path: '/', httpOnly: true, maxAge: 3600 },
        },
      ],
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('__session=');
  });
});
