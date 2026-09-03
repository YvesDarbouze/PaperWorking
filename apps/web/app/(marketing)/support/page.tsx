import type { Metadata } from 'next';
import SupportCenter from '@/components/marketing/SupportCenter';

export const metadata: Metadata = {
  title: 'Support Center',
  description:
    'Search the PaperWorking knowledge base, browse goal-based guides, and reach a real person when your deal cannot wait.',
};

export default function SupportPage() {
  return <SupportCenter />;
}
