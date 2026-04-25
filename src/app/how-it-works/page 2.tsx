import type { Metadata } from 'next';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import HowItWorks from '@/components/landing/HowItWorks';

export const metadata: Metadata = {
  title: 'How It Works — PaperWorking',
  description:
    'Learn how PaperWorking automates MAO calculation, Capital Stack structuring, and LOI crowdfunding commitments — from lead to funded offer in under 48 hours.',
  openGraph: {
    title: 'How It Works — PaperWorking',
    description:
      'MAO auto-calculation, Capital Stack dashboard, and LOI Wizard for REI investors.',
    url: 'https://paperworking.io/how-it-works',
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
