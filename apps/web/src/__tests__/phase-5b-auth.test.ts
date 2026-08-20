import { WEB_APP_STATUS } from '../index.js';
import {
  buildSignupForPricingLoginUrl,
  DASHBOARD_ROUTE,
  PRICING_ROUTE,
  resolvePostAuthDestination,
} from '../../lib/auth/post-auth-redirect.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
} from '../../lib/auth/schemas.js';
import {
  AUTH_ROUTE_LIST,
  AUTH_ROUTES,
  isAuthActionMode,
  SIGNUP_ACCOUNT_TYPES,
} from '../../lib/auth/routes.js';

describe('phase 5b — web app status', () => {
  it('reports auth routes on the web app status', () => {
    expect(WEB_APP_STATUS.routes).toContain('/login');
    expect(WEB_APP_STATUS.routes).toContain('/auth/action');
  });
});

describe('phase 5b — auth routes', () => {
  it('defines canonical auth paths', () => {
    expect(AUTH_ROUTES.login).toBe('/login');
    expect(AUTH_ROUTES.signup).toBe('/signup');
    expect(AUTH_ROUTES.authAction).toBe('/auth/action');
    expect(AUTH_ROUTE_LIST).toContain('/login');
    expect(AUTH_ROUTE_LIST).toContain('/auth/action');
  });

  it('recognizes supported firebase action modes', () => {
    expect(isAuthActionMode('resetPassword')).toBe(true);
    expect(isAuthActionMode('verifyEmail')).toBe(true);
    expect(isAuthActionMode('signIn')).toBe(false);
  });

  it('offers investor and vendor signup account types', () => {
    expect(SIGNUP_ACCOUNT_TYPES.map((entry) => entry.key)).toEqual(['investor', 'vendor']);
  });
});

describe('phase 5b — auth schemas', () => {
  it('validates login credentials', () => {
    expect(loginSchema.safeParse({ email: 'investor@paperworking.co', password: 'secret' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'bad', password: '' }).success).toBe(false);
  });

  it('validates signup payload with matching passwords', () => {
    const valid = registerSchema.safeParse({
      fullName: 'Alex Investor',
      email: 'alex@paperworking.co',
      password: 'Paper1234',
      confirmPassword: 'Paper1234',
      acceptTerms: true,
    });
    expect(valid.success).toBe(true);

    const invalid = registerSchema.safeParse({
      fullName: 'Alex Investor',
      email: 'alex@paperworking.co',
      password: 'Paper1234',
      confirmPassword: 'Mismatch1',
      acceptTerms: true,
    });
    expect(invalid.success).toBe(false);
  });

  it('validates forgot-password email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'hi@paperworking.co' }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });
});

describe('phase 5b — post-auth redirect', () => {
  it('builds signup login url with pricing redirect', () => {
    expect(buildSignupForPricingLoginUrl({ accountType: 'investor' })).toBe(
      '/login?mode=signup&redirectTo=%2Fpricing&accountType=investor',
    );
  });

  it('sends new users without subscription to pricing', () => {
    const storage = {
      items: new Map<string, string>(),
      getItem(key: string) {
        return this.items.get(key) ?? null;
      },
      removeItem(key: string) {
        this.items.delete(key);
      },
    };

    expect(resolvePostAuthDestination({ isNewUser: true }, storage)).toBe(PRICING_ROUTE);
  });

  it('honors explicit redirectTo over defaults', () => {
    const storage = {
      items: new Map<string, string>(),
      getItem(key: string) {
        return this.items.get(key) ?? null;
      },
      removeItem(key: string) {
        this.items.delete(key);
      },
    };

    expect(resolvePostAuthDestination({ urlRedirectTo: '/project/abc' }, storage)).toBe('/project/abc');
  });

  it('returns dashboard for returning users', () => {
    const storage = {
      items: new Map<string, string>(),
      getItem(key: string) {
        return this.items.get(key) ?? null;
      },
      removeItem(key: string) {
        this.items.delete(key);
      },
    };

    expect(resolvePostAuthDestination({ isNewUser: false }, storage)).toBe(DASHBOARD_ROUTE);
  });
});
