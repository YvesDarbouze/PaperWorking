'use client';

import { AuthProvider } from '@/context/AuthContext';
import ChatbotWidget from '@/components/shared/ChatbotWidget';

/** App-wide providers — Auth must wrap auth pages + dashboard. */
export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <ChatbotWidget />
    </AuthProvider>
  );
}
