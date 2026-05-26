'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Clock, Target, CheckCircle, ShieldCheck, X, AlertCircle } from 'lucide-react';

interface VendorRatingModalProps {
  vendorName: string;
  dealName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function VendorRatingModal({ vendorName, dealName, isOpen, onClose }: VendorRatingModalProps) {
  const [ratings, setRatings] = useState({
    overall: 0,
    speed: 0,
    accuracy: 0
  });
  const [feedback, setFeedback] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = () => {
    setIsSubmitted(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-md"
      />
      
      <div className="relative w-full max-w-xl bg-pw-glass-bg border border-pw-border backdrop-blur-[20px] rounded-2xl shadow-2xl overflow-hidden">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 w-8 h-8 flex items-center justify-center rounded-full transition-colors text-pw-black hover:bg-pw-glass-bg/25 z-10"
        >
          <X className="w-6 h-6 text-pw-black" />
        </button>

        {!isSubmitted ? (
          <div className="p-12">
            <header className="mb-8">
              <span className="px-3 py-1 bg-pw-black text-pw-white text-[10px] font-black uppercase tracking-widest mb-4 inline-block rounded-full">
                VERIFIED SETTLEMENT
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-pw-black mb-1 uppercase">Performance Review</h2>
              <p className="text-[10px] font-black text-pw-muted uppercase tracking-[0.3em]">Transaction: {dealName}</p>
            </header>

            <div className="space-y-8">
              {/* Overall Rating */}
              <div className="text-center bg-pw-glass-bg/50 p-8 border border-pw-border rounded-2xl">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-pw-muted mb-6">Service Quality: {vendorName}</p>
                <div className="flex justify-center gap-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button 
                      key={star}
                      onClick={() => setRatings({...ratings, overall: star})}
                    >
                      <Star className={`w-10 h-10 transition-all ${
                        ratings.overall >= star ? 'text-pw-black fill-pw-black' : 'text-pw-border hover:text-pw-black'
                      }`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-[10px] font-black text-pw-black uppercase tracking-widest">
                    <Clock className="w-4 h-4 text-pw-muted" /> Execution Speed
                  </div>
                  <RatingStrip value={ratings.speed} onChange={(v) => setRatings({...ratings, speed: v})} />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-[10px] font-black text-pw-black uppercase tracking-widest">
                    <Target className="w-4 h-4 text-pw-muted" /> Work Precision
                  </div>
                  <RatingStrip value={ratings.accuracy} onChange={(v) => setRatings({...ratings, accuracy: v})} />
                </div>
              </div>

              {/* Feedback */}
              <div>
                <label className="block text-[10px] font-black text-pw-muted uppercase tracking-[0.3em] mb-4">Professional Performance Log</label>
                <textarea 
                  className="glass-input w-full px-6 py-5 text-xs font-bold rounded-2xl focus:outline-none transition-colors min-h-[140px] resize-none"
                  placeholder="DETAIL VENDOR PERFORMANCE PARAMETERS..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>

              <div className="p-6 bg-pw-glass-bg/50 border border-pw-border rounded-2xl flex items-start gap-4">
                <ShieldCheck className="w-5 h-5 text-pw-black shrink-0" />
                <p className="text-[10px] font-bold text-pw-muted leading-relaxed uppercase tracking-[0.2em]">
                   Double-Blind Disclosure: Vendor access to this rating is restricted until mutual feedback settlement is confirmed.
                </p>
              </div>

              <button 
                disabled={ratings.overall === 0}
                onClick={handleSubmit}
                className="pw-btn pw-btn--primary pw-btn--pill w-full py-4 text-pw-white font-black text-xs uppercase tracking-[0.3em] transition-colors disabled:opacity-30"
              >
                Log Verified Feedback
              </button>
            </div>
          </div>
        ) : (
          <div className="p-16 text-center">
            <div className="w-20 h-20 rounded-full border-4 border-pw-black flex items-center justify-center mx-auto mb-10 bg-pw-glass-bg">
              <CheckCircle className="w-10 h-10 text-pw-black" />
            </div>
            <h3 className="text-3xl font-bold tracking-tight text-pw-black mb-4 uppercase">Evaluation Logged</h3>
            <p className="text-xs text-pw-muted font-bold max-w-[320px] mx-auto leading-relaxed uppercase tracking-widest mb-12">
              Performance metrics have been successfully transmitted to the marketplace compliance ledger.
            </p>
            <button 
              onClick={onClose}
              className="pw-btn pw-btn--primary pw-btn--pill px-12 py-4 text-pw-white font-black text-xs uppercase tracking-[0.3em] transition-colors"
            >
              Close Ledger
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function RatingStrip({ value, onChange }: { value: number, onChange: (v: number) => void }) {
  return (
    <div className="flex gap-2 w-fit">
      {[1, 2, 3, 4, 5].map(v => (
        <button 
          key={v}
          onClick={() => onChange(v)}
          className={`w-4 h-4 border rounded-full transition-all ${
            value >= v ? 'bg-pw-black border-pw-black' : 'bg-pw-glass-bg border-pw-border hover:border-pw-black'
          }`}
        />
      ))}
    </div>
  );
}
