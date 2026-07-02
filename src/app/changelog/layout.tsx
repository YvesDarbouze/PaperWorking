import type { Metadata } from 'next';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';

export const metadata: Metadata = {
  title: 'Changelog | PaperWorking',
  description: 'Track all changes, improvements, and updates to the PaperWorking real estate investment platform.',
};

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
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
        aria-label="Changelog content"
      >
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}
