import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import AppProviders from '@/components/AppProviders';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'PaperWorking — Real Estate Investment Operating System',
    template: '%s · PaperWorking',
  },
  description:
    'Track deals, manage rehab budgets, and close faster. PaperWorking is the operating system for serious real estate investors — from sourcing to exit.',
  openGraph: {
    title: 'PaperWorking — Real Estate Investment Operating System',
    description: 'Track deals, manage rehab budgets, and close faster.',
    images: [
      {
        url: '/brand/og-image.png?accent=00DD94',
        width: 1200,
        height: 630,
        alt: 'PaperWorking',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PaperWorking — Real Estate Investment Operating System',
    description: 'Track deals, manage rehab budgets, and close faster.',
    images: ['/brand/og-image.png?accent=00DD94'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${jetBrainsMono.variable} h-full dark`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className={`${inter.className} min-h-screen antialiased bg-[#0a0a0f] text-[#fdfffc]`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
