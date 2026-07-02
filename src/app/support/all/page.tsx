import { Metadata } from 'next';
import SupportAllClient from './SupportAllClient';

export const metadata: Metadata = {
  title: 'All Support Articles | PaperWorking',
  description: 'Browse all articles, guides, and tutorials from the PaperWorking Support & Knowledge Base.',
};

export default function SupportAllPage() {
  return <SupportAllClient />;
}
