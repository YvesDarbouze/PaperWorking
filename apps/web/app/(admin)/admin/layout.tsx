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
  if (!isAuthorizedAdmin(authUser)) {
    redirect('/login?accountType=admin&redirectTo=/admin');
  }

  return <AdminPortalShell>{children}</AdminPortalShell>;
}
