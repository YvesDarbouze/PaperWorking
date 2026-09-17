import type { Metadata } from 'next';
import ChatbotWidget from '@/components/marketing/ChatbotWidget';
import PricingSection from '@/components/marketing/PricingSection';
import PermissionsSection from '@/sections/PermissionsSection';
import NetworkSection from '@/sections/NetworkSection';
import { pricingHeader } from '@/lib/marketing/copy';

export const metadata: Metadata = {
  title: `Pricing — ${pricingHeader}`,
  description: `${pricingHeader}. PaperWorking plans for solo real estate investors, teams, and vendors. Priced against the mistakes it is built to catch. All plans include a 14-day trial.`,
  openGraph: {
    title: `Pricing — ${pricingHeader} | PaperWorking`,
    description: `${pricingHeader}. PaperWorking gives serious real estate investors and teams one workspace for underwriting, funding, hold management, and exit planning.`,
  },
  twitter: {
    title: `Pricing — ${pricingHeader} | PaperWorking`,
    description: `${pricingHeader}. PaperWorking plans for solo real estate investors, teams, and vendors.`,
  },
};

export default function PricingPage() {
  return (
    <>
      <PricingSection />
      <PermissionsSection />
      <NetworkSection />
      <ChatbotWidget />
    </>
  );
}
