import MarketingFooter from '@/components/marketing/MarketingFooter';
import MarketingHeader from '@/components/marketing/MarketingHeader';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </>
  );
}
