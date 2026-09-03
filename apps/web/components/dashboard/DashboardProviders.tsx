'use client';

import DashboardShell from '@/components/dashboard/DashboardShell';

export default function DashboardProviders({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
