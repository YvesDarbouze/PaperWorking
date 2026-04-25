import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import ChatbotWidget from "@/components/shared/ChatbotWidget";
import "./globals.css";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PaperWorking — The Operational Engine for Real Estate Investors",
  description:
    "Automate document workflows, enforce role-based access, and close projects 3× faster. PaperWorking replaces spreadsheets, shared drives, and manual processes with one secure platform built for real estate teams.",
  openGraph: {
    title: "PaperWorking — The Operational Engine for Real Estate Investors",
    description:
      "Automate document workflows, enforce role-based access, and close projects 3× faster.",
    siteName: "PaperWorking",
    type: "website",
  },
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
          {children}
          <ChatbotWidget />
        </AuthProvider>
      </body>
    </html>
  );
}

