import type { Metadata } from 'next';
import DashboardCalendarPanel from '@/components/dashboard/DashboardCalendarPanel';

export const metadata: Metadata = {
  title: 'Schedule & Calendar | PaperWorking',
  description:
    'Portfolio-wide REIL schedule, contingency hard dates, rehab draw milestones, and assigned operator tasks.',
};

export default function DashboardCalendarPage() {
  return <DashboardCalendarPanel />;
}
