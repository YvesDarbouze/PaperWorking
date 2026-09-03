import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AdminPortalShell from '@/components/admin/AdminPortalShell';
import { isAuthorizedAdmin, resolveServerAuthUser } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin',
  robots: 'noindex, nofollow',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authUser = await resolveServerAuthUser();

  if (!authUser) {
    redirect('/login?accountType=admin&redirectTo=/admin');
  }

  // Authorization uses DB-authoritative isAdmin — __acct is display-only and not consulted.
  // Logged-in non-admins go to dashboard (not login) to avoid redirect loops with LoginPanel.
  if (!isAuthorizedAdmin(authUser)) {
    redirect('/dashboard?reason=admin_denied');
  }

  return <AdminPortalShell>{children}</AdminPortalShell>;
}
