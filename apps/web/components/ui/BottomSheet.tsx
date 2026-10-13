'use client';

import React, { useEffect, useRef } from 'react';
import { X } from '@phosphor-icons/react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
  dataTestId?: string;
}

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
  dataTestId,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'bottom-sheet-title' : undefined}
      aria-describedby={description ? 'bottom-sheet-description' : undefined}
      data-testid={dataTestId}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet / Dialog Container */}
      <div
        ref={sheetRef}
        className={`relative z-10 flex w-full flex-col overflow-hidden border-t md:border border-neutral-800 bg-neutral-900 text-white shadow-2xl rounded-none max-h-[90vh] md:max-h-[85vh] ${maxWidth} animate-in slide-in-from-bottom-6 duration-200 ease-out md:fade-in-once`}
      >
        {/* Mobile Drag Handle */}
        <div className="flex justify-center pt-2.5 pb-1 md:hidden">
          <div className="h-1 w-12 rounded-none bg-neutral-700" aria-hidden="true" />
        </div>

        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between border-b border-neutral-800 px-5 py-4">
            <div className="min-w-0 flex-1 pr-3">
              {title && (
                <h2 id="bottom-sheet-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p id="bottom-sheet-description" className="text-xs text-neutral-400 mt-0.5">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none bg-neutral-800/50 text-neutral-400 hover:text-white hover:bg-neutral-800 transition touch-press"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}
