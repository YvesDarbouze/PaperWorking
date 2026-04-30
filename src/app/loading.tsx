export default function GlobalLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-bg-canvas">
      <div className="flex flex-col items-center gap-4">
        {/* Subtle loading spinner using #CCCCCC as the neutral color base */}
        <div className="relative w-12 h-12">
          <div 
            className="absolute inset-0 rounded-full border-2 border-transparent animate-spin" 
            style={{ borderTopColor: '#0d0d0d', borderRightColor: '#CCCCCC', borderBottomColor: '#CCCCCC', borderLeftColor: '#CCCCCC' }} 
          />
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Loading...
        </p>
      </div>
    </div>
  );
}
