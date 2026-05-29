import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { NotificationProvider } from "@/context/NotificationContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NotificationProvider>
      <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-surface-container-low via-surface-container-lowest to-surface-container-lowest text-on-surface">
        {/* Sidebar (Desktop) */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-screen relative overflow-hidden">
          {/* Top App Bar (Mobile & Desktop) */}
          <TopAppBar />

          {/* Scrollable Content Canvas */}
          <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
            {children}
          </div>
        </div>

        {/* Bottom Nav (Mobile) */}
        <BottomNav />
      </div>
    </NotificationProvider>
  );
}
