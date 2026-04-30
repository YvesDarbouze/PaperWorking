import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import Script from "next/script";
import PresenceHeartbeat from "@/components/shared/PresenceHeartbeat";

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

