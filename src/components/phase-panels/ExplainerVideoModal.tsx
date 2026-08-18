'use client';

import React from 'react';
import { X, Play } from 'lucide-react';

interface ExplainerVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  videoUrl: string;
}

export default function ExplainerVideoModal({ isOpen, onClose, title, videoUrl }: ExplainerVideoModalProps) {
  if (!isOpen) return null;

  return (
    <div
      data-testid="explainer-video-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <div className="bg-slate-900 border border-white/20 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            data-testid="close-video-modal-btn"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10">
          <iframe
            src={videoUrl}
            title={title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
