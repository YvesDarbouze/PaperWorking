import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Real Estate Performance Metrics Playbook — PaperWorking',
  description:
    'The executive guide to the 33 essential real estate performance metrics tracked automatically by PaperWorking.',
};

export default function MetricsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
