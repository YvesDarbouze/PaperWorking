'use client';

import DashboardBottomNav from '@/components/dashboard/DashboardBottomNav';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardTopBar from '@/components/dashboard/DashboardTopBar';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-context flex h-screen overflow-hidden bg-[#0d0a0b] text-[#fdfffc]">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopBar />
        <div className="flex-1 overflow-y-auto pb-24 md:pb-8">{children}</div>
      </div>
      <DashboardBottomNav />
    </div>
  );
}
