'use client';

import React, { useState } from 'react';
import { DollarSign, GripHorizontal } from 'lucide-react';

export const OFFER_STAGES = [
  'Drafting',
  'Offer Sent',
  'Countered',
  'Accepted',
  'Rejected',
] as const;

export type OfferStage = typeof OFFER_STAGES[number];

interface OfferPipelineTrackerProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  offerAmountCents: number;
  propertyAddress: string;
  phaseColor?: string;
  onCounterSubmit?: (priceCents: number, terms: string) => void;
}

export function OfferPipelineTracker({
  currentStatus,
  onStatusChange,
  offerAmountCents,
  propertyAddress,
  phaseColor = 'var(--text-primary)',
  onCounterSubmit,
}: OfferPipelineTrackerProps) {
  // Normalize currentStatus
  const activeStatus = OFFER_STAGES.includes(currentStatus as OfferStage)
    ? currentStatus
    : 'Drafting';

  // For visual drag feedback
  const [draggedOverStage, setDraggedOverStage] = useState<string | null>(null);

  // Counter Offer Modal State
  const [isCounterModalOpen, setIsCounterModalOpen] = useState(false);
  const [counterPriceInput, setCounterPriceInput] = useState('');
  const [counterTermsInput, setCounterTermsInput] = useState('');

  const formattedOffer = offerAmountCents > 0
    ? `$${(offerAmountCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : 'TBD';

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', 'offerCard');
    e.dataTransfer.effectAllowed = 'move';
    // Small timeout to allow the drag image to generate before adding opacity
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '1';
    }
    setDraggedOverStage(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, stage: string) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
    if (draggedOverStage !== stage) {
      setDraggedOverStage(stage);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDraggedOverStage(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, stage: string) => {
    e.preventDefault();
    setDraggedOverStage(null);
    const data = e.dataTransfer.getData('text/plain');
    if (data === 'offerCard' && stage !== activeStatus) {
      if (stage === 'Countered') {
        setIsCounterModalOpen(true);
      } else {
        onStatusChange(stage);
      }
    }
  };

  const submitCounterOffer = () => {
    const parsedAmount = Number(counterPriceInput.replace(/[^0-9.]/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid counter price.');
      return;
    }
    const priceCents = Math.round(parsedAmount * 100);
    if (onCounterSubmit) {
      onCounterSubmit(priceCents, counterTermsInput);
    }
    onStatusChange('Countered');
    setIsCounterModalOpen(false);
    setCounterPriceInput('');
    setCounterTermsInput('');
  };

  const cancelCounterOffer = () => {
    setIsCounterModalOpen(false);
    setCounterPriceInput('');
    setCounterTermsInput('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-primary)' }}>
          Offer Pipeline
        </h3>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest">
          Drag the card to update status
        </p>
      </div>

      {/* Kanban Board Container */}
      <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
        {OFFER_STAGES.map((stage) => {
          const isDragTarget = draggedOverStage === stage;
          
          return (
            <div
              key={stage}
              className="flex-shrink-0 w-48 min-h-[140px] flex flex-col gap-3 p-3 rounded-lg border transition-colors"
              style={{
                background: isDragTarget ? 'var(--bg-inset)' : 'var(--bg-default)',
                borderColor: isDragTarget ? phaseColor : 'var(--border-ui)',
                borderStyle: isDragTarget ? 'dashed' : 'solid'
              }}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-600">
                  {stage}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {activeStatus === stage ? '1' : '0'}
                </span>
              </div>

              {/* Column Body / Drop Zone */}
              <div className="flex-1 flex flex-col gap-2">
                {activeStatus === stage && (
                  <div
                    draggable
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    className="p-3 rounded-md shadow-sm border cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group"
                    style={{
                      background: '#FFFFFF',
                      borderColor: 'var(--border-ui)',
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: phaseColor, opacity: 0.1 }}>
                        <DollarSign className="w-3.5 h-3.5" style={{ color: phaseColor }} />
                      </div>
                      <GripHorizontal className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                      {formattedOffer}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate" title={propertyAddress}>
                      {propertyAddress || 'No Address Set'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Counter Offer Modal */}
      {isCounterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden" style={{ border: `1px solid ${phaseColor}` }}>
            <div className="px-6 py-4 flex items-center gap-2" style={{ background: phaseColor }}>
              <DollarSign className="w-4 h-4 text-white" />
              <h3 className="text-[12px] font-bold uppercase tracking-widest text-white">Record Counter Offer</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">New Counter Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="text"
                    value={counterPriceInput}
                    onChange={(e) => setCounterPriceInput(e.target.value)}
                    placeholder="e.g. 150,000"
                    className="w-full pl-8 pr-4 py-2 border rounded-md text-sm outline-none focus:ring-2"
                    style={{ borderColor: 'var(--border-ui)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Updated Terms (Optional)</label>
                <textarea
                  value={counterTermsInput}
                  onChange={(e) => setCounterTermsInput(e.target.value)}
                  placeholder="e.g. Seller requests 10-day inspection instead of 15..."
                  className="w-full p-3 border rounded-md text-sm outline-none focus:ring-2 resize-none"
                  rows={3}
                  style={{ borderColor: 'var(--border-ui)' }}
                />
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t">
              <button
                onClick={cancelCounterOffer}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitCounterOffer}
                className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-white rounded shadow-sm transition-opacity hover:opacity-90"
                style={{ background: phaseColor }}
              >
                Save Counter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
