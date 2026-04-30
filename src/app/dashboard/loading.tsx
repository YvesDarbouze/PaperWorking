export default function DashboardLoading() {
  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-bg-canvas animate-pulse">
      {/* Sidebar Skeleton */}
      <div className="w-64 border-r p-6 hidden md:flex flex-col gap-6" style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="h-8 w-3/4 rounded bg-[#CCCCCC] opacity-40"></div>
        <div className="flex flex-col gap-4 mt-8">
          <div className="h-6 w-full rounded bg-[#CCCCCC] opacity-30"></div>
          <div className="h-6 w-5/6 rounded bg-[#CCCCCC] opacity-30"></div>
          <div className="h-6 w-4/6 rounded bg-[#CCCCCC] opacity-30"></div>
          <div className="h-6 w-full rounded bg-[#CCCCCC] opacity-30"></div>
          <div className="h-6 w-3/4 rounded bg-[#CCCCCC] opacity-30"></div>
        </div>
      </div>
      
      {/* Main Content Area Skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Header Skeleton */}
        <div className="h-16 border-b px-8 flex items-center justify-between" style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-surface)' }}>
          <div className="h-6 w-48 rounded bg-[#CCCCCC] opacity-40"></div>
          <div className="h-8 w-24 rounded bg-[#CCCCCC] opacity-30"></div>
        </div>
        
        {/* Body Skeleton */}
        <div className="flex-1 p-8 overflow-hidden">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="h-32 w-full rounded bg-[#CCCCCC] opacity-20"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-48 rounded bg-[#CCCCCC] opacity-20"></div>
              <div className="h-48 rounded bg-[#CCCCCC] opacity-20"></div>
              <div className="h-48 rounded bg-[#CCCCCC] opacity-20"></div>
            </div>
            
            <div className="h-64 w-full rounded bg-[#CCCCCC] opacity-20"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
