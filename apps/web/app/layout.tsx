import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'PaperWorking · Real Estate Investment Operating System',
    template: '%s · PaperWorking',
  },
  description:
    'Track deals, manage rehab budgets, and close faster. PaperWorking is the operating system for serious real estate investors: from sourcing to exit.',
  openGraph: {
    title: 'PaperWorking · Real Estate Investment Operating System',
    description: 'Track deals, manage rehab budgets, and close faster.',
    images: [
      {
        url: '/brand/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PaperWorking',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PaperWorking · Real Estate Investment Operating System',
    description: 'Track deals, manage rehab budgets, and close faster.',
    images: ['/brand/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/brand/icon-white.svg', type: 'image/svg+xml' },
      { url: '/brand/icon-white.png', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

import { AuthProvider } from '@/context/AuthContext';
import { CompareProvider } from '@/context/CompareContext';
import { SavedDealsProvider } from '@/context/SavedDealsContext';
import { AssistantProvider } from '@/components/assistant/AssistantProvider';
import PepperLauncher from '@/components/assistant/PepperLauncher';
import PepperDrawer from '@/components/assistant/PepperDrawer';
import PepperGhostCopilot from '@/components/assistant/PepperGhostCopilot';
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("h-full dark", "font-sans", inter.variable)}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
        <script
          id="pw-console-guard"
          dangerouslySetInnerHTML={{
            __html: `(function(){
              if (typeof window === 'undefined') return;
              var filterPatterns = [
                'MaxListenersExceededWarning',
                'ObjectMultiplex',
                'app-init-liveness',
                'background-liveness',
                'SENTRY_DSN is absent',
                'error_capture: unconfigured',
                'OBSERVABILITY WARNING',
                'chrome-extension://',
                'moz-extension://',
                'safari-web-extension://',
                'ethereum#initialized',
                'window.ethereum',
                'Failed to connect to the extension'
              ];
              function shouldFilter(args) {
                try {
                  var str = Array.prototype.map.call(args, function(a) {
                    return typeof a === 'object' ? JSON.stringify(a) : String(a);
                  }).join(' ');
                  for (var i = 0; i < filterPatterns.length; i++) {
                    if (str.indexOf(filterPatterns[i]) !== -1) return true;
                  }
                } catch (e) {}
                return false;
              }
              var origWarn = console.warn;
              console.warn = function() {
                if (shouldFilter(arguments)) return;
                return origWarn.apply(console, arguments);
              };
              var origError = console.error;
              console.error = function() {
                if (shouldFilter(arguments)) return;
                return origError.apply(console, arguments);
              };
              var origLog = console.log;
              console.log = function() {
                if (shouldFilter(arguments)) return;
                return origLog.apply(console, arguments);
              };
              var origInfo = console.info;
              console.info = function() {
                if (shouldFilter(arguments)) return;
                return origInfo.apply(console, arguments);
              };
            })();`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased bg-[#0a0a0f] text-[#fdfffc]">
        <AuthProvider>
          <CompareProvider>
            <SavedDealsProvider>
              <AssistantProvider>
                {children}
                <PepperLauncher />
                <PepperDrawer />
                <PepperGhostCopilot />
              </AssistantProvider>
            </SavedDealsProvider>
          </CompareProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
