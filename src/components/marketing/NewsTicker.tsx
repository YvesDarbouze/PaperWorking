'use client';

import React from 'react';

const TICKER_ITEMS = [
  { label: '30Y FIXED', value: '7.12%', change: '+0.05', trend: 'up' },
  { label: '15Y FIXED', value: '6.45%', change: '-0.02', trend: 'down' },
  { label: 'JUMBO', value: '7.38%', change: '0.00', trend: 'neutral' },
  { label: 'MARKET SIGHT', value: 'Single-family inventory up 4.2% YoY', trend: 'neutral' },
  { label: 'FED WATCH', value: 'Rates expected to hold in Q2', trend: 'neutral' },
  { label: 'SUN BELT', value: 'Austin median price stabilizing', trend: 'down' },
];

export default function NewsTicker() {
  return (
    <div className="w-full bg-gray-50 border-b border-gray-100 py-2 overflow-hidden select-none">
      <div className="flex whitespace-nowrap animate-marquee">
        {/* We double the items to create a seamless loop */}
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => (
          <div key={idx} className="flex items-center mx-12">
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest mr-3">
              {item.label}
            </span>
            <span className="text-xs font-bold text-gray-900 tracking-tight">
              {item.value}
            </span>
            {item.change && (
              <span className={`ml-2 text-xs font-bold ${
                item.trend === 'up' ? 'text-red-500' : 
                item.trend === 'down' ? 'text-emerald-500' : 'text-gray-400'
              }`}>
                {item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : ''} {item.change}
              </span>
            )}
            <div className="ml-12 w-1 h-1 rounded-full bg-gray-200" />
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
