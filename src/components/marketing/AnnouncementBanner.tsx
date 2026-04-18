'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AnnouncementBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed this specific banner version
    const dismissed = localStorage.getItem('pw_announcement_v1');
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pw_announcement_v1', 'true');
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="relative z-50 bg-black text-white overflow-hidden"
        >
          <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between gap-4">
            <div className="flex-1 flex items-center justify-center gap-x-6">
              <div className="flex items-center gap-x-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400">New Release</span>
              </div>
              <p className="text-sm font-medium tracking-tight">
                PaperWorking 2.0 is live: Institutional-grade portfolio analytics and deep-focus Kanban now available for all users.
              </p>
              <a 
                href="/blog/q2-market-update-inventory-deficit"
                className="flex items-center gap-x-1 underline decoration-white/30 underline-offset-4 hover:decoration-white transition-all text-sm font-bold"
              >
                Learn More <ArrowRight className="w-3 h-3" />
              </a>
            </div>
            
            <button 
              onClick={handleDismiss}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Subtle animated border gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
