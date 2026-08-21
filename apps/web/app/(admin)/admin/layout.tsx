import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminPortalShell from '@/components/admin/AdminPortalShell';
import { ACCT_COOKIE, SESSION_COOKIE } from '@/lib/auth/session-cookies';

export const metadata: Metadata = {
  title: 'Admin',
  robots: 'noindex, nofollow',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  const accountType = cookieStore.get(ACCT_COOKIE)?.value ?? 'investor';

  if (!session) {
    redirect('/login?accountType=admin&redirectTo=/admin');
  }

  // Investor/vendor sessions must re-auth as admin — don't silently dump to dashboard.
  if (accountType !== 'admin') {
    redirect('/login?accountType=admin&redirectTo=/admin');
  }

  return <AdminPortalShell>{children}</AdminPortalShell>;
}
