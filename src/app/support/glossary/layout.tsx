import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Real Estate Glossary — PaperWorking',
  description:
    'A comprehensive glossary of real estate investing terms — from ARV and Cap Rate to NOI and 1031 Exchange — plus PaperWorking platform-specific definitions.',
};

export default function GlossaryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
