import type { Metadata } from 'next';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import HowItWorks from '@/components/landing/HowItWorks';

export const metadata: Metadata = {
  title: 'PaperWorking — How It Works',
  description:
    'PaperWorking is the real estate investment operating system. Manage every phase of a deal — Acquisition, Fund, Hold, and Exit — with every dollar tracked from day one.',
  openGraph: {
    title: 'PaperWorking — How It Works',
    description:
      'The real estate investment operating system. Acquisition, Fund, Hold, and Exit — all in one platform.',
    url: 'https://paperworking.co/how-it-works',
  },
};

export default function HowItWorksPage() {
  return (
    <>
      <LandingHeader />
      <main>
        <HowItWorks />
      </main>
      <LandingFooter />
    </>
  );
}
