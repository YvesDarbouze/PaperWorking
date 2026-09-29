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
      <MarketplacesClient />
      <ChatbotWidget />
    </>
  );
}
