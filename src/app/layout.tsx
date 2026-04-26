import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import Script from "next/script";
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

        {/* Facebook SDK — async loader */}
        <div id="fb-root" />
        <Script
          id="facebook-sdk"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.fbAsyncInit = function() {
                FB.init({
                  appId      : '${process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || 'YOUR_APP_ID'}',
                  cookie     : true,
                  xfbml      : true,
                  version    : 'v22.0'
                });
                FB.AppEvents.logPageView();

                // Probe for an existing Facebook session on page load
                FB.getLoginStatus(function(response) {
                  console.log('[FB SDK] Login status:', response.status);
                  window.dispatchEvent(new CustomEvent('fb-status', {
                    detail: {
                      status: response.status,
                      authResponse: response.authResponse || null
                    }
                  }));
                });
              };

              // Global callback for FB Login Button's onlogin attribute
              window.checkLoginState = function() {
                FB.getLoginStatus(function(response) {
                  window.dispatchEvent(new CustomEvent('fb-status', {
                    detail: {
                      status: response.status,
                      authResponse: response.authResponse || null
                    }
                  }));
                });
              };

              (function(d, s, id){
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) {return;}
                js = d.createElement(s); js.id = id;
                js.src = "https://connect.facebook.net/en_US/sdk.js";
                fjs.parentNode.insertBefore(js, fjs);
              }(document, 'script', 'facebook-jssdk'));
            `,
          }}
        />
      </body>
    </html>
  );
}

