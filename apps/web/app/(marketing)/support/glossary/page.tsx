import type { Metadata } from 'next';
import { Suspense } from 'react';
import GlossaryPanel from '@/components/marketing/GlossaryPanel';

export const metadata: Metadata = {
  title: 'Real Estate Glossary',
  description:
    'Industry terminology and PaperWorking platform definitions — from ARV to Zoning Scan.',
};

export default function SupportGlossaryPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-5 py-16 md:px-10">Loading glossary…</div>}>
      <GlossaryPanel />
    </Suspense>
  );
}
