import MarketingFooter from '@/components/marketing/MarketingFooter';
import MarketingHeader from '@/components/marketing/MarketingHeader';
import MarketingBottomNav from '@/components/marketing/MarketingBottomNav';
import StickyMobileCta from '@/components/marketing/StickyMobileCta';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-shell min-h-screen text-[#fdfffc]">
      <MarketingHeader />
      <main className="relative pt-16 md:pt-[72px] pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>
      <MarketingFooter />
      <StickyMobileCta />
      <MarketingBottomNav />
    </div>
  );
}
