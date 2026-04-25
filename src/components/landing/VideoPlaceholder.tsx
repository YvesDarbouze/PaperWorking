import React from 'react';
import { Play } from 'lucide-react';

export default function VideoPlaceholder() {
  return (
    <div className="relative w-full aspect-video bg-bg-primary border border-border-accent rounded-lg overflow-hidden flex items-center justify-center group cursor-pointer transition-colors hover:bg-gray-200">
       <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-bg-surface shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform">
             <Play className="w-6 h-6 text-text-primary ml-1" />
          </div>
       </div>
       <p className="absolute bottom-4 left-4 text-xs font-medium text-text-secondary uppercase tracking-widest">
         Explainer Video (2:15)
       </p>
    </div>
  );
}
