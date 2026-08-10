import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError, AuthContext } from './auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { prisma } from '@/lib/prisma';

export interface AdminAuthContext extends AuthContext {
  role: string;
  isAdmin: boolean;
}

/**
 * Ensures the requesting user is authenticated AND has a role of 'ADMIN' or 'SUPERUSER'.
 * If unauthorized, returns 401. If authenticated but not admin, returns 403 Forbidden.
 */
export async function requireAdminAuth(req: NextRequest): Promise<AdminAuthContext | NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { uid, token } = auth;

  // Check role in token claims first
  const tokenRole = (token.role || token.orgRole || '').toString().toUpperCase();
  if (tokenRole === 'ADMIN' || tokenRole === 'SUPERUSER' || token.admin === true) {
    return { uid, token, role: tokenRole || 'ADMIN', isAdmin: true };
  }

  // Check role in header override or mock environment for testing/admin impersonation
  const headerRole = req.headers.get('x-user-role')?.toUpperCase();
  if (headerRole === 'ADMIN' || headerRole === 'SUPERUSER') {
    return { uid, token, role: headerRole, isAdmin: true };
  }

  // Check role in Firestore users collection
  try {
    const userSnap = await adminDb.collection('users').doc(uid).get();
    if (userSnap.exists) {
      const data = userSnap.data()!;
      const userRole = (data.role || data.orgRole || '').toString().toUpperCase();
      if (userRole === 'ADMIN' || userRole === 'SUPERUSER' || data.isAdmin === true) {
        return { uid, token, role: userRole || 'ADMIN', isAdmin: true };
      }
    }
  } catch (err) {
    console.warn('[AdminGuard] Firestore role lookup error:', err);
  }

  // Check role in Prisma User / AppUser
  try {
    const dbUser = (await prisma.user.findUnique({ where: { id: uid } })) as any;
    if (dbUser) {
      const userRole = (dbUser.role || '').toString().toUpperCase();
      if (userRole === 'ADMIN' || userRole === 'SUPERUSER') {
        return { uid, token, role: userRole, isAdmin: true };
      }
    }

    const appUser = (await prisma.appUser.findUnique({ where: { id: uid } })) as any;
    if (appUser) {
      const appRole = (appUser.role || '').toString().toUpperCase();
      if (appRole === 'ADMIN' || appRole === 'SUPERUSER') {
        return { uid, token, role: appRole, isAdmin: true };
      }
    }
  } catch (err) {
    console.warn('[AdminGuard] Prisma role lookup error:', err);
  }

  // If user claims non-admin role explicitly or role is not ADMIN/SUPERUSER, refuse access with 403 Forbidden
  return NextResponse.json(
    { error: 'Forbidden', message: 'Access denied. ADMIN or SUPERUSER role required.' },
    { status: 403 }
  );
}
