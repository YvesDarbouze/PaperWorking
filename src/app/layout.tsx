import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import PresenceHeartbeat from "@/components/shared/PresenceHeartbeat";
import { AuthProvider } from "@/context/AuthContext";
import ChatbotWidget from "@/components/shared/ChatbotWidget";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PaperWorking",
  description: "Real estate project management platform",
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
          {children}
          <ChatbotWidget />
        </AuthProvider>

      </body>
    </html>
  );
}

