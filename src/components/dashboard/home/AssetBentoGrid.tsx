import React from 'react';

export default function AssetBentoGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
      <div className="glass-card rounded-xl p-6 h-64 relative group cursor-pointer overflow-hidden">
        <img 
          className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity" 
          alt="A low-angle cinematic architectural photograph of a futuristic glass and steel skyscraper" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFHqwmUkC3PS5VHhJJSjF3XiCTyyJZqNhoH_Tl5UBS5FJkmZXy-llTrwFcvgoLAgNde1EUKF6Focm5RKSUoqCss_zP3DwfHRfnTShkN7nWc2P0GGX90tZ3G9rw25RqPoguIvmdjGNJq4WkyQGkfaUi-5vKnEIphcM6JN3TvH-TG7rK_HoszoYr6WuA0pWuafzJ-M2rs5SLhIXZi9tuKZ1IrG2YszfqaMBUOQNkpO_9z2bed0iNyN0OvbmeUCSco2CW3sSdR--16l5K" 
        />
        <div className="relative z-10 flex flex-col h-full">
          <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-[10px] font-bold w-fit mb-4">REAL ESTATE</span>
          <h4 className="text-xl font-bold mb-2">Nexus Alpha Plaza</h4>
          <p className="text-sm text-on-surface-variant flex-1">San Francisco, CA • Core Office</p>
          <div className="flex items-center justify-between mt-auto">
            <span className="jetbrains-mono text-lg font-bold text-on-surface">$1.2M</span>
            <span className="material-symbols-outlined text-primary">arrow_outward</span>
          </div>
        </div>
      </div>
      <div className="glass-card rounded-xl p-6 h-64 relative group cursor-pointer overflow-hidden">
        <img 
          className="absolute inset-0 w-full h-full object-cover opacity-10 group-hover:opacity-30 transition-opacity" 
          alt="A high-fidelity digital rendering of complex blockchain nodes" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAChj7MJ4bB_HlY4cxYrRaoD2koVqvcAYmeUByjyVeLIQ4TZpUJUuony-cdQ1_Tlet9SbuYSVOWdJklvPnKea9LKdOEjc1bmqhETh71TP5geYpofMad0pG_qDDYnwoDmW5_-i-7WMlPGssQe5M9V0RCN0dUWgA9_iG4BpcIbOHwp9YI2gOPExjmllihppBz-YHd8Fz1shUmL1tvOlgcKgYPMeQ96XefKRCfrbq44l7CGqK70bmsHvX8vLKT9l-kTEV5897Lf87jUBjZ" 
        />
        <div className="relative z-10 flex flex-col h-full">
          <span className="bg-tertiary/20 text-tertiary px-3 py-1 rounded-full text-[10px] font-bold w-fit mb-4">DIGITAL ASSETS</span>
          <h4 className="text-xl font-bold mb-2">Liquid Venture Pool</h4>
          <p className="text-sm text-on-surface-variant flex-1">Web3 Infrastructure • Series B</p>
          <div className="flex items-center justify-between mt-auto">
            <span className="jetbrains-mono text-lg font-bold text-on-surface">$640K</span>
            <span className="material-symbols-outlined text-primary">arrow_outward</span>
          </div>
        </div>
      </div>
    </div>
  );
}
