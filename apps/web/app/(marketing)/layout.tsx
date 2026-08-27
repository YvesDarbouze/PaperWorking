import MarketingFooter from '@/components/marketing/MarketingFooter';
import MarketingHeader from '@/components/marketing/MarketingHeader';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-shell min-h-screen text-[#fdfffc]">
      <MarketingHeader />
      <main className="relative pt-16 md:pt-[72px]">{children}</main>
      <MarketingFooter />
    </div>
  );
}
