import type { Metadata } from 'next';
import ChatbotWidget from '@/components/marketing/ChatbotWidget';
import PricingSection from '@/components/marketing/PricingSection';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'PaperWorking plans for solo real estate investors, teams, and vendors. Priced against the mistakes it is built to catch. All plans include a 14-day trial.',
};

export default function PricingPage() {
  return (
    <>
      <PricingSection />
      <ChatbotWidget />
    </>
  );
}
