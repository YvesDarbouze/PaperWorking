export const AUTH_ROUTES = {
  login: '/login',
  signup: '/signup',
  register: '/register',
  forgotPassword: '/forgot-password',
  loginFinish: '/login/finish',
  authAction: '/auth/action',
} as const;

export const AUTH_ROUTE_LIST = [
  AUTH_ROUTES.login,
  AUTH_ROUTES.signup,
  AUTH_ROUTES.forgotPassword,
  AUTH_ROUTES.loginFinish,
  AUTH_ROUTES.authAction,
] as const;

export type SignupAccountType = 'investor' | 'vendor';

export const SIGNUP_ACCOUNT_TYPES: {
  key: SignupAccountType;
  title: string;
  description: string;
}[] = [
  {
    key: 'investor',
    title: 'Real Estate Investor',
    description:
      'Create and manage deals, track acquisitions, run financials, and oversee your portfolio.',
  },
  {
    key: 'vendor',
    title: 'Service Provider / Vendor',
    description:
      'List your services, receive qualified leads from investors, and submit bids.',
  },
];

export const AUTH_ACTION_MODES = ['resetPassword', 'verifyEmail'] as const;
export type AuthActionMode = (typeof AUTH_ACTION_MODES)[number];

export function isAuthActionMode(value: string | null | undefined): value is AuthActionMode {
  return AUTH_ACTION_MODES.includes(value as AuthActionMode);
}
