import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import DashboardProviders from '@/components/dashboard/DashboardProviders';
import { requireServerAuthUser } from '@/lib/api/server-session';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: 'noindex, nofollow',
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireServerAuthUser();

  if (user.accountType === 'vendor') {
    redirect('/vendor-portal');
  }

  return <DashboardProviders>{children}</DashboardProviders>;
}
