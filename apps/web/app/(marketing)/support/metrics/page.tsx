import type { Metadata } from 'next';
import MetricsPlaybookPanel from '@/components/marketing/MetricsPlaybookPanel';

export const metadata: Metadata = {
  title: 'The Playbook — 33 Metrics',
  description:
    'PaperWorking transforms closing statements, leases, and receipts into 33 real-time performance metrics.',
};

export default function SupportMetricsPage() {
  return <MetricsPlaybookPanel />;
}
