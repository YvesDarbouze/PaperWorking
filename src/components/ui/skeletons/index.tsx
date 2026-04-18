import React from 'react';

interface CardSkeletonProps {
  className?: string;
}

export function CardSkeleton({ className = '' }: CardSkeletonProps) {
  return (
    <div className={`ag-card p-6 min-h-[140px] flex flex-col justify-between ${className}`} aria-hidden="true">
      <div className="space-y-3">
        <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-1/2 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="flex items-center justify-between mt-6">
        <div className="h-3 w-1/4 bg-gray-200 rounded animate-pulse" />
        <div className="h-3 w-1/4 bg-gray-200 rounded animate-pulse" />
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
    <div className={`ag-card p-6 flex flex-col ${className}`} aria-hidden="true">
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-2">
          <div className="h-3 w-24 bg-gray-200 rounded uppercase animate-pulse" />
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        {showTabs && <div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse" />}
      </div>
      <div className={`w-full ${height} bg-gray-100 rounded-xl border border-gray-100 animate-pulse flex items-end px-6 space-x-2 pb-6`}>
         {/* Fake Bars representing chart loading */}
         <div className="w-full h-1/3 bg-gray-200 rounded-t-sm" />
         <div className="w-full h-2/3 bg-gray-200 rounded-t-sm" />
         <div className="w-full h-1/2 bg-gray-200 rounded-t-sm" />
         <div className="w-full h-3/4 bg-gray-200 rounded-t-sm" />
         <div className="w-full h-1/4 bg-gray-200 rounded-t-sm" />
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
    <div className={`flex flex-col flex-shrink-0 w-80 bg-gray-50/50 rounded-2xl border border-gray-100 p-3 h-full overflow-hidden ${className}`} aria-hidden="true">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 mb-2">
        <div className="h-5 w-32 bg-gray-200 rounded-md animate-pulse" />
        <div className="h-5 w-8 bg-gray-200 rounded-full animate-pulse" />
      </div>
      
      {/* Cards */}
      <div className="flex-1 space-y-3 px-1">
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
             <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-4" />
             <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
             <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
             
             <div className="pt-4 border-t border-gray-100 mt-4 flex justify-between items-center">
                <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex -space-x-2">
                   <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse border-2 border-white" />
                   <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse border-2 border-white" />
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
