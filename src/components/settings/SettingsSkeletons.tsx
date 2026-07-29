import React from 'react';

export function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div className={`bg-white/5 animate-pulse rounded-lg ${className}`} />
  );
}

export function ProfileCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-6 flex items-center justify-between relative overflow-hidden">
      <div className="flex items-center gap-6">
        <SkeletonPulse className="w-20 h-20 rounded-full" />
        <div className="space-y-3">
          <SkeletonPulse className="h-6 w-48" />
          <SkeletonPulse className="h-4 w-32" />
        </div>
      </div>
      <SkeletonPulse className="hidden sm:block h-7 w-24 rounded-full" />
    </div>
  );
}

export function FormSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="glass-card rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-2 border-b border-pw-border/30 pb-4">
        <SkeletonPulse className="w-5 h-5" />
        <SkeletonPulse className="h-5 w-40" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="space-y-2">
            <SkeletonPulse className="h-3 w-28" />
            <SkeletonPulse className="h-10 w-full" />
          </div>
        ))}
        <SkeletonPulse className="h-10 w-full mt-2" />
      </div>
    </div>
  );
}

export function BentoStatsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="glass-card rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-2 border-b border-pw-border/30 pb-4">
        <SkeletonPulse className="w-5 h-5" />
        <SkeletonPulse className="h-5 w-24" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="p-4 rounded-xl border border-pw-border/30 space-y-2">
            <SkeletonPulse className="h-3 w-24" />
            <SkeletonPulse className="h-5 w-36" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConnectedServicesSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="p-5 rounded-2xl border border-pw-border/30 flex flex-col justify-between space-y-6">
          <div className="flex items-start gap-4">
            <SkeletonPulse className="w-10 h-10 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1">
              <SkeletonPulse className="h-4 w-32" />
              <SkeletonPulse className="h-3 w-full" />
              <SkeletonPulse className="h-3 w-3/4" />
            </div>
          </div>
          <div className="flex justify-end border-t border-pw-border/20 pt-3">
            <SkeletonPulse className="h-8 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
