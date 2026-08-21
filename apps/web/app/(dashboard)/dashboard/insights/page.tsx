import type { Metadata } from 'next';
import PortfolioInsightsPanel from '@/components/insights/PortfolioInsightsPanel';

export const metadata: Metadata = {
  title: 'Insights',
  description: 'Portfolio Insights & Analytics — 33 Deep KPIs across Acquisition, Fund, Hold, Exit, and Tax.',
};

/** Route: `/dashboard/insights` — mirrors PaperWorking `src/app/dashboard/insights/page.tsx`. */
export default function InsightsPage() {
  return <PortfolioInsightsPanel />;
}
