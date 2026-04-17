'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PropertyDeal } from '@/types/schema';
import { usePanelContext, LaneDef } from './HorizontalPanelShell';
import {
  Search, FileSignature, HardHat, LogOut, Building2,
  X,
} from 'lucide-react';
import DealFolder from './DealFolder';

/* ═══════════════════════════════════════════════════════
   MinimizedDashboardView — Board Overlay

   Full-screen bird's-eye overlay showing all property deals
   distributed across the 5 Kanban phase columns.

   • Desktop: 5-column grid (one per phase)
   • Mobile:  vertically-stacked accordion columns
   • Tapping a deal → expanded mode at the relevant lane
   ═══════════════════════════════════════════════════════ */

interface MinimizedDashboardViewProps {
  deals: PropertyDeal[];
  onSelectDeal: (dealId: string) => void;
}

/* ─── Map deal status → lane index ─── */
function statusToLaneIndex(status: string): number {
  switch (status) {
    case 'Lead':             return 0; // Pipeline
    case 'Under Contract':   return 1; // Evaluation
    case 'Renovating':       return 2; // Closing
    case 'Listed':           return 3; // Engine
    case 'Sold':             return 4; // Exit
    default:                 return 0;
  }
}

function getPhaseIcon(status: string) {
  switch (status) {
    case 'Lead':           return <Search className="w-3.5 h-3.5" />;
    case 'Under Contract': return <FileSignature className="w-3.5 h-3.5" />;
    case 'Renovating':     return <HardHat className="w-3.5 h-3.5" />;
    case 'Listed':         return <LogOut className="w-3.5 h-3.5" />;
    case 'Sold':           return <LogOut className="w-3.5 h-3.5 text-green-600" />;
    default:               return <Building2 className="w-3.5 h-3.5" />;
  }
}

/* ─── Phase accent colors for column headers ───
   Monochromatic ramp: Dashboard → Phase 1 → Phase 2 → Phase 3 → Phase 4 */
const PHASE_ACCENTS = [
  'bg-dashboard text-phase-4 border-phase-1',     // Pipeline  (#f2f2f2)
  'bg-phase-1 text-phase-4 border-phase-2',       // Evaluation (#cccccc)
  'bg-phase-2 text-white border-phase-3',          // Closing   (#a5a5a5)
  'bg-phase-3 text-white border-phase-4',          // Engine    (#7f7f7f)
  'bg-phase-4 text-white border-phase-4',          // Exit      (#595959)
];

export default function MinimizedDashboardView({ deals, onSelectDeal }: MinimizedDashboardViewProps) {
  const { lanes, scrollToPanel, setViewMode } = usePanelContext();

  /* Bucket deals into lanes */
  const buckets: PropertyDeal[][] = lanes.map(() => []);
  deals.forEach((deal) => {
    const idx = statusToLaneIndex(deal.status);
    buckets[idx].push(deal);
  });

  const handleDealClick = (deal: PropertyDeal) => {
    const laneIdx = statusToLaneIndex(deal.status);
    scrollToPanel(laneIdx);
    setViewMode('expanded');
    onSelectDeal(deal.id);
  };

  const handleClose = () => {
    setViewMode('expanded');
  };

  return (
    <motion.div
      className="board-overlay pt-20 px-4 sm:px-6 lg:px-8 pb-8"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-light tracking-tight text-gray-900">Board View</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            All {deals.length} deal{deals.length !== 1 ? 's' : ''} across your workflow
          </p>
        </div>
        <button
          onClick={handleClose}
          className="p-2 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition"
          aria-label="Close board view"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Desktop: 5-column grid ── */}
      <div className="hidden md:grid max-w-7xl mx-auto grid-cols-5 gap-3">
        {lanes.map((lane, colIdx) => (
          <BoardColumn
            key={lane.id}
            lane={lane}
            deals={buckets[colIdx]}
            accent={PHASE_ACCENTS[colIdx]}
            onDealClick={handleDealClick}
          />
        ))}
      </div>

      {/* ── Mobile: stacked accordion ── */}
      <div className="md:hidden max-w-lg mx-auto space-y-3">
        {lanes.map((lane, colIdx) => (
          <MobileColumn
            key={lane.id}
            lane={lane}
            deals={buckets[colIdx]}
            accent={PHASE_ACCENTS[colIdx]}
            onDealClick={handleDealClick}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Desktop Column ─── */
function BoardColumn({
  lane,
  deals,
  accent,
  onDealClick,
}: {
  lane: LaneDef;
  deals: PropertyDeal[];
  accent: string;
  onDealClick: (deal: PropertyDeal) => void;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Column header */}
      <div className={`px-4 py-3 border-b ${accent}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-widest">
            {lane.shortLabel}
          </span>
          <span className="text-xs font-mono bg-white/60 px-2 py-0.5 rounded-full">
            {deals.length}
          </span>
        </div>
      </div>

      {/* Deal cards */}
      <div className="flex-1 p-2.5 space-y-2 min-h-[120px] max-h-[calc(100vh-280px)] overflow-y-auto">
        {deals.length === 0 ? (
          <div className="h-20 flex items-center justify-center text-sm text-gray-400 italic">
            No deals
          </div>
        ) : (
          deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} onClick={() => onDealClick(deal)} />
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Mobile Accordion Column ─── */
function MobileColumn({
  lane,
  deals,
  accent,
  onDealClick,
}: {
  lane: LaneDef;
  deals: PropertyDeal[];
  accent: string;
  onDealClick: (deal: PropertyDeal) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(deals.length > 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 flex items-center justify-between text-left border-b ${accent}`}
      >
        <span className="text-sm font-bold uppercase tracking-widest">
          {lane.label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-white/60 px-2 py-0.5 rounded-full">
            {deals.length}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-current"
          >
            ›
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-2">
              {deals.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-3">No deals in this phase</p>
              ) : (
                deals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} onClick={() => onDealClick(deal)} />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Deal Card (delegates to standardized DealFolder) ─── */
function DealCard({ deal, onClick }: { deal: PropertyDeal; onClick: () => void }) {
  return (
    <DealFolder
      deal={deal}
      size="sm"
      showPrice
      onClick={onClick}
    />
  );
}
