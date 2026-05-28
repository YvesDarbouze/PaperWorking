import React from 'react';

export default function EquityGrowthChart() {
  return (
    <div className="glass-card rounded-2xl p-8 h-[450px] relative overflow-hidden group">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface">Equity Growth Projection</h3>
          <p className="text-on-surface-variant text-body-sm">Historical performance vs model forecast</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-xs font-label-md text-on-surface hover:border-primary transition-colors">1M</button>
          <button className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container text-xs font-bold transition-colors">YTD</button>
          <button className="px-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-xs font-label-md text-on-surface hover:border-primary transition-colors">ALL</button>
        </div>
      </div>
      {/* Visual Chart Simulation */}
      <div className="absolute bottom-0 left-0 w-full h-2/3 flex items-end">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 300">
          <defs>
            <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#57f1db" stopOpacity="0.3"></stop>
              <stop offset="100%" stopColor="#57f1db" stopOpacity="0"></stop>
            </linearGradient>
          </defs>
          <path d="M0,250 Q150,230 250,180 T500,140 T750,100 T1000,40 V300 H0 Z" fill="url(#chartGradient)"></path>
          <path d="M0,250 Q150,230 250,180 T500,140 T750,100 T1000,40" fill="none" stroke="#57f1db" strokeLinecap="round" strokeWidth="4"></path>
          {/* Simulated Data Points */}
          <circle className="animate-pulse" cx="250" cy="180" fill="#060f15" r="6" stroke="#57f1db" strokeWidth="2"></circle>
          <circle cx="500" cy="140" fill="#060f15" r="6" stroke="#57f1db" strokeWidth="2"></circle>
          <circle cx="750" cy="100" fill="#060f15" r="6" stroke="#57f1db" strokeWidth="2"></circle>
          <circle className="luminous-glow" cx="1000" cy="40" fill="#57f1db" r="8"></circle>
        </svg>
        {/* Tooltip Simulation */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 glass-card rounded-lg p-3 luminous-glow border border-primary">
          <div className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">Current Evaluation</div>
          <div className="jetbrains-mono text-primary font-bold text-lg">$2,842,000.00</div>
        </div>
      </div>
    </div>
  );
}
