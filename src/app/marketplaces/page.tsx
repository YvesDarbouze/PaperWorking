import type { Metadata } from 'next';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import MarketplacesClient from '@/components/landing/MarketplacesClient';

export const metadata: Metadata = {
  title: 'PaperWorking — Marketplaces',
  description: 'Connect with verified dealflow and local real estate professionals inside the same workspace where your Projects live.',
  openGraph: {
    title: 'PaperWorking — Marketplaces',
    description: 'Connect with verified dealflow and local real estate professionals inside the same workspace where your Projects live.',
    type: 'website',
  },
};

export default function MarketplacesPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface dark font-sans antialiased">
      <LandingHeader />
      
      <main className="max-w-5xl mx-auto px-6 md:px-10 pt-32 pb-24 relative z-10">
        <MarketplacesClient />
      </main>

      <LandingFooter />
    </div>
  );
}
