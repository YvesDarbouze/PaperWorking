export interface AuthContext {
  uid: string;
  email?: string | null;
}

export interface AuthFailure {
  status: number;
  body: unknown;
}

export type RequireAuthFn = () => Promise<AuthContext | AuthFailure>;

export type TryAuthenticateFn = () => Promise<AuthContext | null>;

export function isAuthFailure(
  result: AuthContext | AuthFailure,
): result is AuthFailure {
  return 'status' in result && 'body' in result && !('uid' in result);
}
