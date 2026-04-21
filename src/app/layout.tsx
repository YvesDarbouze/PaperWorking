import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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

import AnnouncementBanner from "@/components/marketing/AnnouncementBanner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased">
        <AuthProvider>
          <AnnouncementBanner />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

