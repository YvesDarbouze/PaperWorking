export default function GlobalLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-bg-canvas relative overflow-hidden">
      <div className="absolute inset-0 bg-pw-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="flex flex-col items-center gap-4 relative z-10">
        <div className="relative w-16 h-16">
          {/* Luminous Glow behind spinner */}
          <div className="absolute inset-0 bg-pw-primary/20 blur-xl rounded-full animate-pulse" />
          <div 
            className="absolute inset-0 rounded-full border-2 border-white/10 animate-spin" 
            style={{ borderTopColor: 'var(--color-primary)' }} 
          />
        </div>
        <p className="text-sm font-medium tracking-wider uppercase text-pw-muted mt-2">
          Loading
        </p>
      </div>
    </div>
  );
}
