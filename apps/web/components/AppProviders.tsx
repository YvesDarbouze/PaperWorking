'use client';

import dynamic from 'next/dynamic';
import { AuthProvider } from '@/context/AuthContext';

/** Client-only — mock gate differs SSR vs browser when only private env is set. */
const ChatbotWidget = dynamic(() => import('@/components/shared/ChatbotWidget'), {
  ssr: false,
});

/** App-wide providers — Auth must wrap auth pages + dashboard. */
export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <ChatbotWidget />
    </AuthProvider>
  );
}
