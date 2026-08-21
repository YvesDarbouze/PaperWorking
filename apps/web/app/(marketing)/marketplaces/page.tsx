import type { Metadata } from 'next';
import ChatbotWidget from '@/components/marketing/ChatbotWidget';
import MarketplacesClient from '@/components/marketing/MarketplacesClient';

export const metadata: Metadata = {
  title: 'Marketplaces',
  description:
    'Connect with verified dealflow and local real estate professionals inside the same workspace where your Projects live.',
};

export default function MarketplacesPage() {
  return (
    <>
      <div className="mx-auto max-w-5xl px-6 pb-24 pt-8 md:px-10 md:pt-10">
        <MarketplacesClient />
      </div>
      <ChatbotWidget />
    </>
  );
}
