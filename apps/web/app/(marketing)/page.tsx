import ChatbotWidget from '@/components/marketing/ChatbotWidget';
import LandingBelowFold from '@/components/marketing/LandingBelowFold';
import LandingHero from '@/components/marketing/LandingHero';
import DealCalculatorSection from '@/sections/DealCalculatorSection';
import MarketplaceSection from '@/sections/MarketplaceSection';
import HowItWorksHeader from '@/sections/HowItWorksHeader';
import PhaseEngine from '@/sections/PhaseEngine';
import PhaseWalkthrough from '@/sections/PhaseWalkthrough';

/** Marketing landing — v0 composition updated with Marketplace & How It Works flows. */
export default function RootPage() {
  return (
    <>
      <LandingHero />
      <DealCalculatorSection />
      <MarketplaceSection />
      <HowItWorksHeader />
      <PhaseEngine />
      <PhaseWalkthrough />
      <LandingBelowFold />
      <ChatbotWidget />
    </>
  );
}
