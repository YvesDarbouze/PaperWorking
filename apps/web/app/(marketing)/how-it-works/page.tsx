import type { Metadata } from 'next';
import ChatbotWidget from '@/components/marketing/ChatbotWidget';
import HowItWorks from '@/components/marketing/HowItWorks';

export const metadata: Metadata = {
  title: 'How It Works',
  description:
    'PaperWorking is the real estate investment operating system. Manage every phase of a deal — Acquisition, Fund, Hold, and Exit — with every dollar tracked from day one.',
};

export default function HowItWorksPage() {
  return (
    <>
      <HowItWorks />
      <ChatbotWidget />
    </>
  );
}
