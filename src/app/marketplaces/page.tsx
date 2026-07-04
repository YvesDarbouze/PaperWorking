import type { Metadata } from 'next';
import Link from 'next/link';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import MarketplacesClient from '@/components/landing/MarketplacesClient';

export const metadata: Metadata = {
  title: 'Marketplaces · PaperWorking',
  description: 'Connect with verified dealflow and local real estate professionals inside the same workspace where your Projects live.',
  openGraph: {
    title: 'Marketplaces · PaperWorking',
    description: 'Connect with verified dealflow and local real estate professionals inside the same workspace where your Projects live.',
    type: 'website',
  },
};

export default function MarketplacesPage() {
  return (
    <div className="min-h-screen bg-[#0d0a0b] text-white font-sans antialiased overflow-hidden">
      <LandingHeader />
      
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <main className="max-w-[1280px] mx-auto px-6 md:px-10 py-20 relative z-10">
        
        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-extrabold uppercase tracking-widest text-primary px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 inline-block">
            Dual Networks
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            PaperWorking Marketplaces
          </h1>
          <p className="text-sm sm:text-base text-on-surface-variant/80 max-w-lg mx-auto font-normal">
            Whether you are listing syndications or contracting project trades, engage serious real estate partners with live workspace context — not cold calls.
          </p>
        </div>

        {/* Tab Switcher & Dynamic Content */}
        <MarketplacesClient />

      </main>

      <LandingFooter />
    </div>
  );
}
