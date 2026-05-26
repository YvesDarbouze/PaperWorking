import React from 'react';

interface CardSkeletonProps {
  className?: string;
}

export function CardSkeleton({ className = '' }: CardSkeletonProps) {
  return (
    <div className={`glass-card p-6 min-h-[140px] flex flex-col justify-between border border-pw-border/50 rounded-xl relative overflow-hidden ${className}`} aria-hidden="true">
      {/* Subtle pulse/glow background */}
      <div className="absolute inset-0 bg-pw-primary/5 blur-2xl rounded-full pointer-events-none" />
      
      <div className="space-y-3 relative z-10">
        <div className="h-4 w-1/3 bg-white/10 rounded animate-shimmer" />
        <div className="h-8 w-1/2 bg-white/10 rounded animate-shimmer" />
      </div>
      <div className="flex items-center justify-between mt-6 relative z-10">
        <div className="h-3 w-1/4 bg-white/10 rounded animate-shimmer" />
        <div className="h-3 w-1/4 bg-white/10 rounded animate-shimmer" />
      </div>
    </div>
  );
}

interface ChartSkeletonProps {
  className?: string;
  height?: string;
  showTabs?: boolean;
}

export function ChartSkeleton({ className = '', height = 'h-[300px]', showTabs = true }: ChartSkeletonProps) {
  return (
    <div className={`glass-card p-6 flex flex-col border border-pw-border/50 rounded-xl relative overflow-hidden ${className}`} aria-hidden="true">
      <div className="absolute inset-0 bg-pw-primary/5 blur-3xl rounded-full pointer-events-none" />
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="space-y-2">
          <div className="h-3 w-24 bg-white/10 rounded uppercase animate-shimmer" />
          <div className="h-6 w-48 bg-white/10 rounded animate-shimmer" />
        </div>
        {showTabs && <div className="h-6 w-24 bg-white/10 rounded-full animate-shimmer" />}
      </div>
      
      <div className={`w-full ${height} bg-white/5 rounded-xl border border-pw-border/30 animate-shimmer flex items-end px-6 space-x-2 pb-6 relative z-10`}>
         {/* Fake Bars representing chart loading */}
         <div className="w-full h-1/3 bg-white/10 rounded-t-sm" />
         <div className="w-full h-2/3 bg-white/10 rounded-t-sm" />
         <div className="w-full h-1/2 bg-white/10 rounded-t-sm" />
         <div className="w-full h-3/4 bg-white/10 rounded-t-sm" />
         <div className="w-full h-1/4 bg-white/10 rounded-t-sm" />
      </div>
    </div>
  );
}

interface KanbanColumnSkeletonProps {
  className?: string;
  items?: number;
}

export function KanbanColumnSkeleton({ className = '', items = 3 }: KanbanColumnSkeletonProps) {
  return (
    <div className={`flex flex-col flex-shrink-0 w-80 glass-card bg-white/5 rounded-2xl border border-pw-border/30 p-3 h-full overflow-hidden relative ${className}`} aria-hidden="true">
      <div className="absolute inset-0 bg-pw-primary/5 blur-3xl rounded-full pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 mb-2 relative z-10">
        <div className="h-5 w-32 bg-white/10 rounded-md animate-shimmer" />
        <div className="h-5 w-8 bg-white/10 rounded-full animate-shimmer" />
      </div>
      
      {/* Cards */}
      <div className="flex-1 space-y-3 px-1 relative z-10">
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className="glass-card bg-white/5 p-4 rounded-xl border border-pw-border/20 shadow-sm space-y-3">
             <div className="h-3 w-20 bg-white/10 rounded animate-shimmer mb-4" />
             <div className="h-4 w-3/4 bg-white/10 rounded animate-shimmer" />
             <div className="h-4 w-1/2 bg-white/10 rounded animate-shimmer" />
             
             <div className="pt-4 border-t border-pw-border/20 mt-4 flex justify-between items-center">
                <div className="h-6 w-16 bg-white/10 rounded-full animate-shimmer" />
                <div className="flex -space-x-2">
                   <div className="w-6 h-6 rounded-full bg-white/10 animate-shimmer border-2 border-pw-border/30" />
                   <div className="w-6 h-6 rounded-full bg-white/10 animate-shimmer border-2 border-pw-border/30" />
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
