'use client';

import React from 'react';
import { Project } from '@/types/schema';
import KanbanCard from './KanbanCard';
import { motion, AnimatePresence } from 'framer-motion';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

interface KanbanColumnProps {
  id: string;
  title: string;
  projects: Project[];
  onCardSelect?: (projectId: string) => void;
  onMoveDeal?: (deal: Project, target: string) => void;
  mobileFullWidth?: boolean;
}

export default function KanbanColumn({ id, title, projects, onCardSelect, onMoveDeal, mobileFullWidth }: KanbanColumnProps) {
  const [shouldThrow, setShouldThrow] = React.useState(false);
  if (shouldThrow) {
    throw new Error('Test Error Boundary');
  }

  const isDarkPhase = ['Rehab', 'Listed', 'Closed'].includes(id);
  const bgColorStyle = {
    'Sourcing': '#f2f2f2',
    'Under Contract': '#cccccc',
    'Rehab': '#a5a5a5',
    'Listed': '#7f7f7f',
    'Closed': '#595959',
  }[id] || '#f2f2f2';

  const textColorClass = isDarkPhase ? 'text-white' : 'text-text-primary';
  const subtextColorClass = isDarkPhase ? 'text-white/60' : 'text-text-secondary';

  return (
    <div
      className={`flex flex-col h-full border-r border-border-accent/20 overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,0.01)] ${
        mobileFullWidth
          ? 'w-full'
          : 'w-[85vw] sm:w-[350px] min-w-[300px] sm:min-w-[350px] shrink-0 snap-center'
      }`}
      style={{ backgroundColor: bgColorStyle }}
    >
      {/* Column Header */}
      <div className={`p-6 flex items-center justify-between border-b border-border-accent/10 sticky top-0 z-10 backdrop-blur-sm`}>
        <div className="flex items-center space-x-3">
          <h3 className={`text-xs font-bold ${textColorClass} uppercase tracking-[0.2em]`}>{title}</h3>
          <span className={`${isDarkPhase ? 'bg-bg-surface/10 text-white' : 'bg-black/5 text-text-primary'} px-3 py-1 rounded-full text-[9px] font-bold`}>
            {projects.length}
          </span>
        </div>
        <div className={`w-1.5 h-1.5 rounded-full ${isDarkPhase ? 'bg-bg-surface' : 'bg-black'} opacity-20`} />
      </div>

      <div
        className={`flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar transition-colors duration-200`}
      >
        <ErrorBoundary name={`${title} Column`}>
          <AnimatePresence>
            <button 
              onClick={() => setShouldThrow(true)} 
              className={`w-full py-2 mb-2 text-xs font-bold rounded ${isDarkPhase ? 'bg-red-500/20 text-red-200' : 'bg-red-500/10 text-red-500'}`}
            >
              Trigger Error (Test)
            </button>
            {projects.length > 0 ? (
              projects.map((deal) => (
                <motion.div
                  key={deal.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <KanbanCard 
                    deal={deal} 
                    onSelect={onCardSelect} 
                    onMove={(target) => onMoveDeal?.(deal, target)}
                  />
                </motion.div>
              ))
            ) : (
              <div className={`h-40 flex flex-col items-center justify-center border border-dashed rounded-[32px] ${isDarkPhase ? 'border-white/10' : 'border-black/5'}`}>
                <p className={`text-[10px] font-bold ${isDarkPhase ? 'text-white/20' : 'text-text-secondary/40'} uppercase tracking-[0.2em]`}>
                  Neutral State
                </p>
              </div>
            )}
          </AnimatePresence>
        </ErrorBoundary>
      </div>
    </div>
  );
}
