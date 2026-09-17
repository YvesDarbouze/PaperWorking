'use client';

import React, { useState } from 'react';
import DashboardBottomNav from '@/components/dashboard/DashboardBottomNav';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardTopBar from '@/components/dashboard/DashboardTopBar';
import DashboardMobileDrawer from '@/components/dashboard/DashboardMobileDrawer';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="dashboard-context flex h-screen overflow-hidden bg-[#0d0a0b] text-[#fdfffc]">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopBar onOpenMenu={() => setDrawerOpen(true)} />
        <div className="flex-1 overflow-y-auto pb-24 md:pb-8">{children}</div>
      </div>
      <DashboardBottomNav onOpenDrawer={() => setDrawerOpen(true)} isDrawerOpen={drawerOpen} />
      <DashboardMobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
