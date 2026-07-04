import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'FAQ — PaperWorking Real Estate Investment OS',
  description:
    'Answers to common questions about PaperWorking: deal lifecycle management, financial reporting, vendor portals, billing, and security for real estate investors.',
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
