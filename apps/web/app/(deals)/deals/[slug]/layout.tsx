import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE } from '@/lib/auth/session-cookies';

export const metadata: Metadata = {
  title: 'Deal Detail',
  robots: 'noindex, nofollow',
};

export default async function DealLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  if (!cookieStore.get(SESSION_COOKIE)?.value) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[#0b0d10] text-white">
      <main>{children}</main>
    </div>
  );
}
