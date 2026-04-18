'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function TrustBanner() {
  return (
    <div className="bg-white py-12 border-b border-gray-100/50 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-10">
          Trusted by the World&apos;s Most Sophisticated Operators
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-10 opacity-40 grayscale transition-all hover:opacity-70">
           {/* Placeholder for Logos - In production, these would be SVG components or Images */}
           <div className="flex items-center space-x-2 font-black text-xl tracking-tight text-gray-900">
              <span className="w-5 h-5 bg-gray-900 rounded-sm" />
              <span>GOOGLE</span>
           </div>
           
           <div className="flex items-center space-x-1 font-black text-xl tracking-tighter text-gray-900 italic">
              <span className="text-2xl font-black">S</span>
              <span>STRIPE</span>
           </div>

           <div className="flex flex-col items-center">
              <span className="text-xs font-bold leading-none tracking-widest text-gray-900 mb-0.5">COMPASS</span>
              <div className="w-12 h-0.5 bg-gray-900" />
           </div>

           <div className="flex items-center space-x-2 group">
              <div className="w-8 h-8 rounded-full border-4 border-gray-900 flex items-center justify-center font-bold text-xs">CB</div>
              <span className="text-sm font-black tracking-tight text-gray-900">COLDWELL BANKER</span>
           </div>

           <div className="flex flex-col items-end">
              <span className="text-lg font-black tracking-tighter text-gray-900">ZILLOW</span>
              <span className="text-xs font-extrabold text-gray-900 uppercase tracking-[0.3em] -mt-1">PREMIER AGENT</span>
           </div>
        </div>
      </div>
      
      {/* Subtle fade line */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mt-12 opacity-50" />
    </div>
  );
}
