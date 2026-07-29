import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search Properties | PaperWorking',
  description: 'Search for active real estate deal listings on PaperWorking.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
