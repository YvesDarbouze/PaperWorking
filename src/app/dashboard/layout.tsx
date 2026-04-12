import React from 'react';
import Link from 'next/link';
import { Toaster } from 'react-hot-toast';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Enforcing the requested #f2f2f2 background (mapped to bg-dashboard via config)
    <div className="min-h-screen bg-dashboard font-sans text-foreground">
      {/* Universal Dashboard Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="flex h-16 items-center px-6">
          <Link href="/dashboard" className="text-xl font-bold tracking-tight">
            Paper<span className="font-light text-gray-500">Working</span>
          </Link>
          <nav className="ml-8 flex items-center space-x-6 text-sm font-medium">
            <Link href="/dashboard" className="text-gray-900 transition-colors hover:text-gray-600">
              Deal Pipeline
            </Link>
            <Link href="/dashboard/evaluation" className="flex items-center text-gray-900 transition-colors hover:text-gray-600">
              Capital Evaluation
            </Link>
            <Link href="/dashboard/closing-room" className="flex items-center text-gray-900 transition-colors hover:text-gray-600">
              Closing Room <span className="ml-2 px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">LOCKED</span>
            </Link>
            <Link href="/dashboard/engine-room" className="text-gray-900 transition-colors hover:text-gray-600">
              The Engine Room
            </Link>
          </nav>
        </div>
      </header>

      {/* Page Content injected here */}
      <main className="p-6">
        {children}
        <Toaster position="bottom-right" />
      </main>
    </div>
  );
}
