export interface AdminAuthContext {
  uid: string;
  role: string;
  isAdmin: boolean;
  email?: string | null;
}

export interface AdminAuthFailure {
  status: number;
  body: unknown;
}

export type RequireAdminFn = () => Promise<AdminAuthContext | AdminAuthFailure>;

export function isAdminAuthFailure(
  result: AdminAuthContext | AdminAuthFailure,
): result is AdminAuthFailure {
  return 'status' in result && 'body' in result && !('isAdmin' in result);
}
