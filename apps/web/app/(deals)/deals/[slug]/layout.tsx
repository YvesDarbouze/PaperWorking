import type { Metadata } from 'next';
import { requireServerAuthUser } from '@/lib/api/server-session';

export const metadata: Metadata = {
  title: 'Deal Detail',
  robots: 'noindex, nofollow',
};

export default async function DealLayout({ children }: { children: React.ReactNode }) {
  await requireServerAuthUser('/login');

  return (
    <div className="min-h-screen bg-[#0b0d10] text-white">
      <main>{children}</main>
    </div>
  );
}
