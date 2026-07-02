import React from 'react';
import { CardSkeleton, ChartSkeleton } from '@/components/ui/skeletons';

export default function DashboardLoading() {
  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-bg-canvas">
      {/* Sidebar Skeleton */}
      <div className="w-64 border-r border-pw-border/30 p-6 hidden md:flex flex-col gap-6 bg-surface/40 backdrop-blur-xl relative">
        <div className="absolute inset-0 bg-pw-primary/5 blur-3xl rounded-full pointer-events-none" />
        <div className="h-8 w-3/4 rounded bg-white/10 animate-shimmer relative z-10"></div>
        <div className="flex flex-col gap-4 mt-8 relative z-10">
          <div className="h-6 w-full rounded bg-white/10 animate-shimmer"></div>
          <div className="h-6 w-5/6 rounded bg-white/10 animate-shimmer"></div>
          <div className="h-6 w-4/6 rounded bg-white/10 animate-shimmer"></div>
          <div className="h-6 w-full rounded bg-white/10 animate-shimmer"></div>
          <div className="h-6 w-3/4 rounded bg-white/10 animate-shimmer"></div>
        </div>
      </div>
      
      {/* Main Content Area Skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Header Skeleton */}
        <div className="h-16 border-b border-pw-border/30 px-8 flex items-center justify-between bg-surface/40 backdrop-blur-xl">
          <div className="h-6 w-48 rounded bg-white/10 animate-shimmer"></div>
          <div className="h-8 w-24 rounded bg-white/10 animate-shimmer"></div>
        </div>
        
        {/* Body Skeleton */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="h-32 w-full glass-card border border-pw-border/30 rounded-xl relative overflow-hidden flex items-center px-6">
              <div className="absolute inset-0 bg-pw-primary/5 blur-2xl rounded-full pointer-events-none" />
              <div className="space-y-2 w-full relative z-10">
                <div className="h-4 w-1/4 bg-white/10 rounded animate-shimmer" />
                <div className="h-6 w-2/4 bg-white/10 rounded animate-shimmer" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
            
            <ChartSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
