'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import GeneralSettingsPanel from '@/components/settings/GeneralSettingsPanel';
import SecuritySettingsPanel from '@/components/settings/SecuritySettingsPanel';
import BillingPreviewPanel from '@/components/dashboard/BillingPreviewPanel';
import BankConnectionsPanel from '@/components/settings/BankConnectionsPanel';
import DataPrivacyPanel from '@/components/settings/DataPrivacyPanel';
import { isSettingsSectionRestricted } from '@/lib/auth/progressive-unlock';
import { Lock } from '@phosphor-icons/react';

export default function SettingsSectionRouter() {
  const searchParams = useSearchParams();
  const rawSection = searchParams.get('section') || searchParams.get('tab') || 'general';
  const section = rawSection === 'subscription' ? 'billing' : rawSection;
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isParamLocked = searchParams.get('milestone') === 'locked';
      const isCookieLocked =
        document.cookie.includes('__pw_milestone=locked') ||
        document.cookie.includes('__pw_first_deal=0');
      setIsLocked(isParamLocked || isCookieLocked);
    }
  }, [searchParams]);

  const isRestricted = isSettingsSectionRestricted(section, !isLocked);

  if (isRestricted) {
    return (
      <div
        data-testid="settings-milestone-gate"
        className="rounded-none border border-border bg-card p-8 text-center text-card-foreground shadow-sm"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-none border border-amber-500/30 bg-amber-500/10 text-amber-400">
          <Lock size={24} />
        </div>
        <h3 className="mb-2 text-xl font-bold text-foreground">First Value Milestone Required</h3>
        <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
          Billing configuration and advanced workspace controls unlock once you establish your first
          deal. Let Ava set up your workspace or test an address in the Deal Calculator.
        </p>
        <Link
          href="/#deal-calculator"
          className="inline-flex min-h-[44px] items-center justify-center rounded-none bg-primary px-5 text-sm font-semibold text-primary-foreground no-underline hover:bg-primary/90 transition"
        >
          Open Deal Calculator
        </Link>
      </div>
    );
  }

  switch (section) {
    case 'security':
      return <SecuritySettingsPanel />;
    case 'billing':
      return <BillingPreviewPanel />;
    case 'banking':
      return <BankConnectionsPanel />;
    case 'data-privacy':
    case 'data':
      return <DataPrivacyPanel />;
    case 'general':
    default:
      return <GeneralSettingsPanel />;
  }
}
