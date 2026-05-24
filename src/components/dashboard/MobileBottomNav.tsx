import React from 'react';
import { LayoutDashboard, FolderTree, Store, Mail, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function MobileBottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 w-full z-50 rounded-t-2xl bg-surface-container-lowest/90 backdrop-blur-xl border-t border-white/5 flex justify-around items-center h-20 pb-safe px-2">
      <Link href="/dashboard" className="flex flex-col items-center justify-center text-primary relative">
        <LayoutDashboard className="w-6 h-6" />
        <span className="font-label-sm text-[10px] font-bold mt-1 uppercase tracking-tighter">Dashboard</span>
        <div className="absolute -bottom-2 w-1 h-1 bg-primary rounded-full shadow-[0_0_10px_#2dd4bf]"></div>
      </Link>
      <Link href="/dashboard/projects" className="flex flex-col items-center justify-center text-on-surface-variant opacity-70 hover:opacity-100 transition-opacity">
        <FolderTree className="w-6 h-6" />
        <span className="font-label-sm text-[10px] mt-1 uppercase tracking-tighter">Projects</span>
      </Link>
      <Link href="/dashboard/market" className="flex flex-col items-center justify-center text-on-surface-variant opacity-70 hover:opacity-100 transition-opacity">
        <Store className="w-6 h-6" />
        <span className="font-label-sm text-[10px] mt-1 uppercase tracking-tighter">Market</span>
      </Link>
      <Link href="/dashboard/inbox" className="flex flex-col items-center justify-center text-on-surface-variant opacity-70 hover:opacity-100 transition-opacity">
        <Mail className="w-6 h-6" />
        <span className="font-label-sm text-[10px] mt-1 uppercase tracking-tighter">Inbox</span>
      </Link>
      <Link href="/dashboard/reports" className="flex flex-col items-center justify-center text-on-surface-variant opacity-70 hover:opacity-100 transition-opacity">
        <BarChart3 className="w-6 h-6" />
        <span className="font-label-sm text-[10px] mt-1 uppercase tracking-tighter">Reports</span>
      </Link>
    </nav>
  );
}
