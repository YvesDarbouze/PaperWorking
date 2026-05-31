import type { Metadata } from 'next';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';

export const metadata: Metadata = {
  title: 'Help Center | PaperWorking',
  description: 'Technical documentation, metric formulas, and direct support for real estate investors.',
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col font-sans"
      style={{
        backgroundColor: 'var(--pw-bg)',
        color: 'var(--pw-fg)',
      }}
    >
      <LandingHeader />
      <main
        className="flex-1 w-full mx-auto max-w-container-max px-container-padding pt-20"
        role="main"
        aria-label="Help Center content"
      >
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}
