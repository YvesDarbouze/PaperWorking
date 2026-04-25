'use client';

import React from 'react';
import { HardDrive, Cloud, ExternalLink, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function GoogleDriveSync() {
  return (
    <div className="bg-bg-surface border border-border-accent p-8 h-full flex flex-col justify-center items-center text-center">
      <div className="w-20 h-20 bg-blue-50 flex items-center justify-center rounded-2xl mb-6 relative">
        <Cloud className="w-10 h-10 text-blue-600" />
        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-bg-surface rounded-full flex items-center justify-center border-2 border-blue-50">
          <RefreshCw className="w-4 h-4 text-blue-400" />
        </div>
      </div>
      
      <h3 className="text-xl font-black text-text-primary uppercase tracking-tighter mb-4">
        Google Drive Operational Sync
      </h3>
      
      <p className="text-sm text-text-secondary font-medium leading-relaxed max-w-sm mb-8">
        Automatically provision and mirror asset folders, permits, and closing documents across your cloud infrastructure.
      </p>

      <div className="w-full max-w-md space-y-3 mb-10">
        {[
          'Auto-generate folder hierarchy on new deals',
          'Two-way sync for contractor uploads',
          'Institutional security policies applied'
        ].map((feature, i) => (
          <div key={i} className="flex items-center gap-3 text-left p-3 border border-border-accent bg-bg-primary/50">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-black text-text-primary uppercase tracking-widest">{feature}</span>
          </div>
        ))}
      </div>

      <button className="flex items-center gap-3 px-8 py-4 bg-pw-black text-pw-white text-xs font-black uppercase tracking-[0.3em] hover:bg-pw-accent transition-all shadow-2xl">
        <span>AUTHORIZE DRIVE CONNECTION</span>
        <ExternalLink className="w-4 h-4" />
      </button>
      
      <p className="mt-8 text-[10px] text-text-secondary font-black uppercase tracking-widest">
        SYSTEM MECHANICS: OAuth 2.0 Restricted Scope
      </p>
    </div>
  );
}
