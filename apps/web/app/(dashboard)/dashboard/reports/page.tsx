import type { Metadata } from 'next';
import PortfolioReportsPanel from '@/components/reports/PortfolioReportsPanel';

export const metadata: Metadata = {
  title: 'Reports',
  description: 'Tax Intelligence — fiscal oversight, estimated taxes, and CPA-ready packages.',
};

/** Route: `/dashboard/reports` — mirrors PaperWorking Tax Intelligence + investment reports. */
export default function ReportsPage() {
  return <PortfolioReportsPanel />;
}
