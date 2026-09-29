import type { Metadata } from 'next';
import ChatbotWidget from '@/components/marketing/ChatbotWidget';
import PricingSection from '@/components/marketing/PricingSection';
import PermissionsSection from '@/sections/PermissionsSection';
import NetworkSection from '@/sections/NetworkSection';
import {
  pricingHeader,
  pricingPositioningHeadline,
  pricingSubheadline,
  pricingBody,
} from '@/lib/marketing/copy';

export const metadata: Metadata = {
  title: `${pricingPositioningHeadline} | Pricing | PaperWorking`,
  description: `${pricingPositioningHeadline}. ${pricingSubheadline} ${pricingBody}`,
  openGraph: {
    title: `${pricingPositioningHeadline} | Pricing | PaperWorking`,
    description: `${pricingPositioningHeadline}. ${pricingSubheadline} ${pricingBody}`,
  },
  twitter: {
    title: `${pricingPositioningHeadline} | Pricing | PaperWorking`,
    description: `${pricingPositioningHeadline}. ${pricingSubheadline}`,
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
