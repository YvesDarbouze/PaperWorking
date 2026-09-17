import type { Metadata } from 'next';
import ChatbotWidget from '@/components/marketing/ChatbotWidget';
import SupportCenter from '@/components/marketing/SupportCenter';
import { getFaqEntries, getGlossaryTerms } from '@/lib/support/firestore-support-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Support Center — PaperWorking',
  description:
    'Search the PaperWorking knowledge base, ask Pepper AI, explore the REIL glossary, submit feature requests, or request an investor call back.',
  openGraph: {
    title: 'Support Center — PaperWorking',
    description:
      'Search the PaperWorking knowledge base, ask Pepper AI, explore the REIL glossary, submit feature requests, or request an investor call back.',
  },
};

export default async function SupportPage() {
  const [initialFaqs, initialGlossary] = await Promise.all([
    getFaqEntries(),
    getGlossaryTerms(),
  ]);

  return (
    <>
      <SupportCenter initialFaqs={initialFaqs} initialGlossary={initialGlossary} />
      <ChatbotWidget />
    </>
  );
}
