'use client';

import { AuthProvider } from '@/context/AuthContext';
import DashboardShell from '@/components/dashboard/DashboardShell';

export default function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
