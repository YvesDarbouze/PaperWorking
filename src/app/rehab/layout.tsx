import React from 'react';
import DashboardLayout from '@/app/dashboard/layout';

export default function RehabLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
