'use client';

import { AuthProvider } from '@/context/AuthContext';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { FirstLoginOnboardingModal } from '@/components/onboarding/FirstLoginOnboardingModal';

export default function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
      <FirstLoginOnboardingModal />
    </AuthProvider>
  );
}
