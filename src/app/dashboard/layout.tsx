import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { NotificationProvider } from "@/context/NotificationContext";
import { OnboardingRedirectGuard } from "@/components/onboarding/OnboardingRedirectGuard";
import { PaywallRedirectGuard } from "@/components/dashboard/PaywallRedirectGuard";
import SupportWidget from "@/components/support/SupportWidget";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ── Server-Side Paywall Gating ──
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;

  if (!sessionCookie) {
    redirect("/login");
  }

  // Get current pathname from x-pathname header (set in middleware)
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  // Exclude billing and profile settings from server-side redirect checks
  const isExempt =
    pathname.startsWith("/dashboard/settings/billing") ||
    pathname.startsWith("/dashboard/settings/profile") ||
    pathname === "/dashboard/settings" ||
    pathname.startsWith("/dashboard/settings/general");

  const isMock = sessionCookie === "mock_session_token_123";

  if (!isExempt && !isMock) {
    try {
      // __session may hold a Firebase session cookie OR a raw ID token — the
      // session route falls back to the ID token when createSessionCookie is
      // unavailable. verifySessionCookie rejects ID tokens, so try both, else
      // the fallback-issued cookie causes a loader→/login redirect loop.
      let decoded: { uid?: string } | null;
      try {
        decoded = await adminAuth.verifySessionCookie(sessionCookie);
      } catch {
        decoded = await adminAuth.verifyIdToken(sessionCookie);
      }
      if (decoded?.uid) {
        const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
        const userData = userDoc.data();
        const status = userData?.subscriptionStatus;
        const isPaid = status === "active" || status === "trialing" || status === "past_due";
        const isGuest = userData?.inviteToken && userData?.invitedToProjectId;

        if (!isPaid && !isGuest) {
          redirect("/pricing");
        }
      } else {
        redirect("/login");
      }
    } catch (err) {
      // redirect() above throws NEXT_REDIRECT — never swallow it into /login,
      // or the real /pricing redirect is lost.
      if ((err as { digest?: string })?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
      console.error("[DashboardLayout Server Gate] Auth verification failed:", err);
      redirect("/login");
    }
  }

  return (
    <NotificationProvider>
      <OnboardingRedirectGuard />
      <PaywallRedirectGuard />
      <div className="dashboard-context mesh-bg flex flex-col md:flex-row h-screen overflow-hidden text-on-surface">
        {/* Sidebar (Desktop) */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-screen relative overflow-hidden">
          {/* Top App Bar (Mobile & Desktop) */}
          <TopAppBar />

          {/* Scrollable Content Canvas */}
          <div className="flex-1 overflow-y-auto pb-24 md:pb-8 custom-scrollbar">
            {children}
          </div>
        </div>

        {/* Bottom Nav (Mobile) */}
        <BottomNav />
        
        {/* Support Chat Widget */}
        <SupportWidget />
      </div>
    </NotificationProvider>
  );
}

