import type { Metadata } from 'next';
import PricingClient from './PricingClient';

export const metadata: Metadata = {
  title: 'Pricing — PaperWorking',
  description:
    'PaperWorking plans for solo real estate investors, teams, and vendors. Priced against the mistakes it is built to catch. All plans include a 14-day trial.',
  openGraph: {
    title: 'Pricing — PaperWorking',
    description:
      'Priced against the mistakes it is built to catch. Investor $499/yr, Investment Team $999/yr, Vendor $390/yr. 14-day trial included.',
    url: 'https://paperworking.co/pricing',
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
