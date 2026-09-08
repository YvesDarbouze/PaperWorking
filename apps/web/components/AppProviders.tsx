'use client';

import dynamic from 'next/dynamic';
import { AuthProvider } from '@/context/AuthContext';
import { CompareProvider } from '@/context/CompareContext';
import { SavedDealsProvider } from '@/context/SavedDealsContext';
import { AssistantProvider } from '@/components/assistant/AssistantProvider';
import PepperLauncher from '@/components/assistant/PepperLauncher';
import PepperDrawer from '@/components/assistant/PepperDrawer';
import PepperGhostCopilot from '@/components/assistant/PepperGhostCopilot';

/** Client-only — mock gate differs SSR vs browser when only private env is set. */
const ChatbotWidget = dynamic(() => import('@/components/shared/ChatbotWidget'), {
  ssr: false,
});

/** App-wide providers — Auth must wrap auth pages + dashboard. */
export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CompareProvider>
        <SavedDealsProvider>
          <AssistantProvider>
            {children}
            <PepperLauncher />
            <PepperDrawer />
            <PepperGhostCopilot />
            <ChatbotWidget />
          </AssistantProvider>
        </SavedDealsProvider>
      </CompareProvider>
    </AuthProvider>
  );
}
