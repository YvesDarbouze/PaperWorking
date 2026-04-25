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
        className="absolute inset-0 bg-pw-black/80 backdrop-blur-sm"
      />
      
      <div className="relative w-full max-w-xl bg-bg-surface border border-border-accent shadow-2xl overflow-hidden">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-1 hover:bg-pw-dashboard transition-colors z-10"
        >
          <X className="w-6 h-6 text-text-secondary" />
        </button>

        {!isSubmitted ? (
          <div className="p-16">
            <header className="mb-12">
              <span className="px-3 py-1 bg-pw-black text-white text-xs font-black uppercase tracking-widest mb-4 inline-block">
                VERIFIED SETTLEMENT
              </span>
              <h2 className="text-3xl font-black text-text-primary tracking-tighter uppercase mb-1">Performance Review</h2>
              <p className="text-xs font-black text-text-secondary uppercase tracking-widest">Transaction: {dealName}</p>
            </header>

            <div className="space-y-12">
              {/* Overall Rating */}
              <div className="text-center bg-pw-dashboard p-10 border border-border-accent">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-text-secondary mb-6">Service Quality: {vendorName}</p>
                <div className="flex justify-center gap-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button 
                      key={star}
                      onClick={() => setRatings({...ratings, overall: star})}
                    >
                      <Star className={`w-10 h-10 transition-all ${
                        ratings.overall >= star ? 'text-text-primary fill-pw-black' : 'text-pw-border hover:text-text-secondary'
                      }`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-xs font-black text-text-primary uppercase tracking-widest">
                    <Clock className="w-4 h-4 text-text-secondary" /> Execution Speed
                  </div>
                  <RatingStrip value={ratings.speed} onChange={(v) => setRatings({...ratings, speed: v})} />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-xs font-black text-text-primary uppercase tracking-widest">
                    <Target className="w-4 h-4 text-text-secondary" /> Work Precision
                  </div>
                  <RatingStrip value={ratings.accuracy} onChange={(v) => setRatings({...ratings, accuracy: v})} />
                </div>
              </div>

              {/* Feedback */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-text-secondary mb-4">Professional Performance Log</label>
                <textarea 
                  className="w-full px-6 py-5 bg-pw-dashboard border border-border-accent rounded-none text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-pw-black transition-all min-h-[140px]"
                  placeholder="DETAIL VENDOR PERFORMANCE PARAMETERS..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>

              <div className="p-6 bg-pw-dashboard border border-border-accent flex items-start gap-4">
                <ShieldCheck className="w-5 h-5 text-text-primary shrink-0" />
                <p className="text-xs font-bold text-text-secondary leading-relaxed uppercase tracking-widest">
                   Double-Blind Disclosure: Vendor access to this rating is restricted until mutual feedback settlement is confirmed.
                </p>
              </div>

              <button 
                disabled={ratings.overall === 0}
                onClick={handleSubmit}
                className="w-full py-5 bg-pw-black text-white rounded-none font-black text-xs uppercase tracking-[0.3em] hover:bg-pw-fg transition-all disabled:opacity-30"
              >
                Log Verified Feedback
              </button>
            </div>
          </div>
        ) : (
          <div className="p-24 text-center">
            <div className="w-20 h-20 border-4 border-pw-black flex items-center justify-center mx-auto mb-10">
              <CheckCircle className="w-10 h-10 text-text-primary" />
            </div>
            <h3 className="text-3xl font-black text-text-primary mb-4 uppercase tracking-tighter">Evaluation Logged</h3>
            <p className="text-xs text-text-secondary font-bold max-w-[320px] mx-auto leading-relaxed uppercase tracking-widest mb-12">
              Performance metrics have been successfully transmitted to the marketplace compliance ledger.
            </p>
            <button 
              onClick={onClose}
              className="px-12 py-5 border border-pw-black text-text-primary font-black text-xs uppercase tracking-[0.3em] hover:bg-pw-black hover:text-white transition-all"
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
          className={`w-4 h-4 border transition-all ${
            value >= v ? 'bg-pw-black border-pw-black' : 'bg-bg-surface border-border-accent hover:border-pw-subtle'
          }`}
        />
      ))}
    </div>
  );
}
