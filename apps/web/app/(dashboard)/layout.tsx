import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardProviders from '@/components/dashboard/DashboardProviders';
import { SESSION_COOKIE, ACCT_COOKIE } from '@/lib/auth/session-cookies';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: 'noindex, nofollow',
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  const acct = cookieStore.get(ACCT_COOKIE)?.value;

  if (!session) {
    redirect('/login?reason=session_expired');
  }

  if (acct === 'vendor') {
    redirect('/vendor-portal');
  }

  return <DashboardProviders>{children}</DashboardProviders>;
}
