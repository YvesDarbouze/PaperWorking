import type { Metadata } from 'next';
import ChatbotWidget from '@/components/marketing/ChatbotWidget';
import SupportCenter from '@/components/marketing/SupportCenter';
import { getFaqEntries, getGlossaryTerms } from '@/lib/support/firestore-support-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Support Center - PaperWorking',
  description:
    'Search the PaperWorking knowledge base, ask Pepper AI, explore the REIL glossary, submit feature requests, or request an investor call back.',
};

export default async function DashboardSupportPage() {
  const [initialFaqs, initialGlossary] = await Promise.all([
    getFaqEntries(),
    getGlossaryTerms(),
  ]);

  return (
    <div data-testid="dashboard-support-page">
      <SupportCenter
        initialSubscriber={true}
        initialFaqs={initialFaqs}
        initialGlossary={initialGlossary}
      />
      <ChatbotWidget />
    </div>
  );
}
