import type { Metadata } from 'next';
import ChatbotWidget from '@/components/marketing/ChatbotWidget';
import GlossaryPanel from '@/components/marketing/GlossaryPanel';

export const metadata: Metadata = {
  title: 'Real Estate Glossary',
  description:
    'Industry terminology and PaperWorking platform definitions — from ARV to Zoning Scan.',
};

export default function SupportGlossaryPage() {
  return (
    <>
      <GlossaryPanel />
      <ChatbotWidget />
    </>
  );
}
