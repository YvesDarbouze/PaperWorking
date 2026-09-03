import type { Metadata } from 'next';
import PricingSection from '@/components/marketing/PricingSection';
import PermissionsSection from '@/sections/PermissionsSection';
import NetworkSection from '@/sections/NetworkSection';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'PaperWorking plans for solo real estate investors, teams, and vendors. Priced against the mistakes it is built to catch. All plans include a 14-day trial.',
};

/** Pricing — Yves UI sections; chatbot comes from AppProviders. */
export default function PricingPage() {
  return (
    <>
      <PricingSection />
      <PermissionsSection />
      <NetworkSection />
    </>
  );
}
