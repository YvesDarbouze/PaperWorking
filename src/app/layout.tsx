import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import PresenceHeartbeat from "@/components/shared/PresenceHeartbeat";
import { AuthProvider } from "@/context/AuthContext";
import ChatbotWidget from "@/components/shared/ChatbotWidget";
import { Toaster } from "react-hot-toast";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
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
    <html lang="en" className={`${hankenGrotesk.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased bg-bg-primary text-text-primary">
        <AuthProvider>
          <PresenceHeartbeat />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#1a1a2e',
                color: '#e0e0e0',
                border: '1px solid rgba(255,255,255,0.08)',
              },
            }}
          />
          {children}
          <ChatbotWidget />
        </AuthProvider>

      </body>
    </html>
  );
}

