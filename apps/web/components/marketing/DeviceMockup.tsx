'use client';

interface DeviceMockupProps {
  variant?: 'silver' | 'blue';
  className?: string;
}

export default function DeviceMockup({ variant = 'silver', className = '' }: DeviceMockupProps) {
  // Bezel classes based on variant
  const bezelColor =
    variant === 'blue'
      ? 'border-[#1e2a4a] bg-[#0c1020] ring-1 ring-blue-900/30'
      : 'border-[#d1d5db]/30 bg-[#1c1c1e] ring-1 ring-white/10';

  return (
    <div
      className={`relative mx-auto h-[640px] w-[300px] shrink-0 rounded-[44px] p-3 shadow-[0_24px_64px_rgba(0,0,0,0.6)] ${bezelColor} ${className}`}
    >
      {/* Outer thin border border */}
      <div className="absolute inset-0 rounded-[44px] border border-white/15 pointer-events-none" />

      {/* Screen Frame */}
      <div className="relative h-full w-full overflow-hidden rounded-[36px] bg-[#0a0a0f] text-white">
        {/* Dynamic Island / Notch */}
        <div className="absolute left-1/2 top-3 z-30 h-7 w-28 -translate-x-1/2 rounded-full bg-black flex items-center justify-between px-3.5">
          {/* Mock Camera lens & Sensor */}
          <div className="h-1.5 w-1.5 rounded-full bg-[#111] border border-white/5" />
          <div className="h-2 w-2 rounded-full bg-[#0a0f24] border border-blue-950/20" />
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 z-30 h-1 w-32 -translate-x-1/2 rounded-full bg-white/30" />

        {/* Inner Screen Content - Deal Calculator responsive UI */}
        <div className="flex h-full flex-col justify-between px-5 pb-8 pt-14">
          <div className="space-y-5">
            {/* Header */}
            <div>
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-widest text-[color:var(--color-primary)]">
                Deal Calculator
              </span>
              {/* Address Mock Input */}
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 backdrop-blur-md">
                <span className="material-symbols-outlined text-[15px] text-white/40">location_on</span>
                <span className="text-[12px] font-medium text-white/90 truncate">
                  1247 Elm Street, Austin TX
                </span>
              </div>
            </div>

            {/* Inputs Section */}
            <div className="space-y-3">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-white/45">
                Acquisition Inputs
              </span>
              
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  { label: 'Purchase Price', value: '$485,000' },
                  { label: 'After Repair Value', value: '$620,000' },
                  { label: 'Rehab Budget', value: '$68,000' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                  >
                    <span className="text-[11.5px] font-medium text-white/50">{item.label}</span>
                    <span className="text-[12.5px] font-bold text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Outputs Section */}
            <div className="space-y-3">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-white/45">
                Calculated Metrics
              </span>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: 'Cap Rate', value: '6.2%', color: 'text-[color:var(--color-primary)]' },
                  { label: 'Projected IRR', value: '24.8%', color: 'text-[color:var(--color-primary)]' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl"
                  >
                    <span className="mb-1 block text-[9px] font-semibold uppercase tracking-wider text-white/40">
                      {item.label}
                    </span>
                    <span className={`text-[20px] font-bold leading-none tracking-tight ${item.color}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sourcing Stage Badge */}
          <div className="rounded-2xl border border-[color:var(--color-primary)]/10 bg-[color:var(--color-primary)]/[0.03] p-3 text-center">
            <span className="block text-[9px] font-semibold uppercase tracking-widest text-[color:var(--color-primary)]/70">
              Analysis Results
            </span>
            <span className="mt-1 block text-[11.5px] font-medium text-white/70">
              Underwriting cleared for pipeline
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
