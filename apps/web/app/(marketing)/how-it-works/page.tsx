import type { Metadata } from 'next';
import HowItWorks from '@/components/marketing/HowItWorks';
import { howItWorksSubheadline, howItWorksBody } from '@/lib/marketing/copy';

export const metadata: Metadata = {
  title: 'How It Works',
  description: howItWorksBody,
  openGraph: {
    title: `${howItWorksSubheadline} | PaperWorking`,
    description: howItWorksBody,
  },
};

export default function HowItWorksPage() {
  return <HowItWorks />;
}
