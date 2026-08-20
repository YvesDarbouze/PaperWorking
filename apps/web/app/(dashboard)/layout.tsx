import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardProviders from '@/components/dashboard/DashboardProviders';
import { SESSION_COOKIE } from '@/lib/auth/session-cookies';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: 'noindex, nofollow',
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;

  if (!session) {
    redirect('/login');
  }

  return <DashboardProviders>{children}</DashboardProviders>;
}
