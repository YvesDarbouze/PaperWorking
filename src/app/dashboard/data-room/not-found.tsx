'use client';

import Link from 'next/link';

export default function DataRoomNotFound() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-[#0d0a0b] text-white p-6 min-h-[60vh]">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">404</h1>
        <p className="text-sm text-[#9E9DA0]">This section is no longer available.</p>
        <div className="pt-4 border-t border-white/10">
          <Link
            href="/dashboard/projects"
            className="text-emerald-400 hover:text-emerald-300 font-medium underline text-sm"
          >
            Go to Projects
          </Link>
        </div>
      </div>
    </div>
  );
}
