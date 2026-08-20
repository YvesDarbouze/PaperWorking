import { Suspense } from 'react';
import BillingPreviewPanel from '@/components/dashboard/BillingPreviewPanel';

export default function BillingSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-sm text-white/60">Loading billing…</div>
      }
    >
      <BillingPreviewPanel />
    </Suspense>
  );
}
