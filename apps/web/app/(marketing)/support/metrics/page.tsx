import type { Metadata } from 'next';
import { Suspense } from 'react';
import MetricsPlaybookPanel from '@/components/marketing/MetricsPlaybookPanel';

export const metadata: Metadata = {
  title: 'The Playbook — 33 Metrics',
  description:
    'PaperWorking transforms closing statements, leases, and receipts into 33 real-time performance metrics.',
};

export default function SupportMetricsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-5 py-16 md:px-10">Loading metrics…</div>}>
      <MetricsPlaybookPanel />
    </Suspense>
  );
}
