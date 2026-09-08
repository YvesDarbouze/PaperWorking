'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import GeneralSettingsPanel from '@/components/settings/GeneralSettingsPanel';
import SecuritySettingsPanel from '@/components/settings/SecuritySettingsPanel';
import BillingPreviewPanel from '@/components/dashboard/BillingPreviewPanel';
import DataPrivacyPanel from '@/components/settings/DataPrivacyPanel';
import { isSettingsSectionRestricted } from '@/lib/auth/progressive-unlock';

export default function SettingsSectionRouter() {
  const searchParams = useSearchParams();
  const section = searchParams.get('section') || 'general';
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
        className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
          <span className="material-symbols-outlined text-2xl">lock</span>
        </div>
        <h3 className="mb-2 text-xl font-bold text-white">First Value Milestone Required</h3>
        <p className="mx-auto mb-6 max-w-md text-sm text-white/70">
          Billing configuration and advanced workspace controls unlock once you establish your first
          deal. Let Ava set up your workspace or test an address in the Deal Calculator.
        </p>
        <Link
          href="/#deal-calculator"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[color:var(--color-primary)] px-5 text-sm font-bold text-black no-underline hover:opacity-90"
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
    case 'data-privacy':
    case 'data':
      return <DataPrivacyPanel />;
    case 'general':
    default:
      return <GeneralSettingsPanel />;
  }
}
