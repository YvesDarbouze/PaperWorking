import ChatbotWidget from '@/components/marketing/ChatbotWidget';
import LandingBelowFold from '@/components/marketing/LandingBelowFold';
import LandingHero from '@/components/marketing/LandingHero';

/** Marketing landing — v0 composition: Hero → Trust → Problem → Lifecycle → Metrics. */
export default function RootPage() {
  return (
    <>
      <LandingHero />
      <LandingBelowFold />
      <ChatbotWidget />
    </>
  );
}
