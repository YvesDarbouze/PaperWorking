import type { Metadata } from "next";
import { Hanken_Grotesk, Plus_Jakarta_Sans, JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";
import PresenceHeartbeat from "@/components/shared/PresenceHeartbeat";
import { AuthProvider } from "@/context/AuthContext";
import { TenantProvider } from "@/context/TenantContext";
import { ThemeProvider } from "@/lib/utils/ThemeProvider";
import ChatbotWidget from "@/components/shared/ChatbotWidget";
import { CustomToaster } from "@/components/ui/CustomToaster";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import CookieConsent from "@/components/legal/CookieConsent";
import { QueryProvider } from "@/components/providers/QueryProvider";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PaperWorking — Real Estate Investment Operating System",
  description: "Track deals, manage rehab budgets, and close faster. PaperWorking is the operating system for serious real estate investors — from sourcing to exit.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${hankenGrotesk.variable} ${plusJakartaSans.variable} ${jetBrainsMono.variable} ${inter.variable} h-full dark`} data-theme="dark">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                document.documentElement.setAttribute('data-theme', 'dark');
                document.documentElement.classList.add('dark');
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans antialiased bg-pw-bg text-pw-black mesh-bg relative overflow-x-hidden">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none z-[-1]" />
        <QueryProvider>
        <PostHogProvider>
          <AuthProvider>
            <TenantProvider>
              <ThemeProvider>
                <PresenceHeartbeat />
                <CustomToaster position="top-center" />
                {children}
                <ChatbotWidget />
                <CookieConsent />
              </ThemeProvider>
            </TenantProvider>
          </AuthProvider>
        </PostHogProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
