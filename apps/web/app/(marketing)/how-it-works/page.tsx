import type { Metadata } from 'next';
import HowItWorks from '@/components/marketing/HowItWorks';
import { howItWorksSubheadline } from '@/lib/marketing/copy';

export const metadata: Metadata = {
  title: 'How It Works',
  description: `${howItWorksSubheadline} PaperWorking is the real estate investment operating system. Manage every phase of a deal — Acquisition, Fund, Hold, and Exit — with every dollar tracked from day one.`,
  openGraph: {
    title: `${howItWorksSubheadline} | PaperWorking`,
    description:
      'PaperWorking is the real estate investment operating system. Manage every phase of a deal — Acquisition, Fund, Hold, and Exit — with every dollar tracked from day one.',
  },
};

export default function HowItWorksPage() {
  return <HowItWorks />;
}
