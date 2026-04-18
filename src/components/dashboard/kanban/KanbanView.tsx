'use client';

import React, { Suspense } from 'react';
import FinancialSummaryHeader from './FinancialSummaryHeader';
import KanbanBoard from './KanbanBoard';
import { motion } from 'framer-motion';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { KanbanColumnSkeleton } from '@/components/ui/skeletons';

function KanbanBoardFallback() {
  return (
    <div className="flex gap-4 p-6 h-full overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <KanbanColumnSkeleton key={i} />
      ))}
    </div>
  );
}

export default function KanbanView() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-screen w-full bg-gray-50 overflow-hidden"
    >
      <ErrorBoundary name="Financial Summary Header">
        <Suspense fallback={<div className="h-20 bg-gray-100 flex-shrink-0 border-b border-gray-200 animate-pulse" />}>
          <FinancialSummaryHeader />
        </Suspense>
      </ErrorBoundary>
      <div className="flex-1 min-h-0">
        <ErrorBoundary name="Kanban Board">
          <Suspense fallback={<KanbanBoardFallback />}>
            <KanbanBoard />
          </Suspense>
        </ErrorBoundary>
      </div>
    </motion.div>
  );
}
