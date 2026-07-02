'use client';

import React, { useState } from 'react';
import { DealAnalyzerTerminal } from '@/components/intelligence/DealAnalyzerTerminal';
import { ReportsTaxIntelligence } from '@/components/intelligence/ReportsTaxIntelligence';
import PortfolioPerformancePage from './performance/page';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'underwriting' | 'reports' | 'performance';

export default function IntelligenceHub() {
  const [activeTab, setActiveTab] = useState<Tab>('underwriting');

  return (
    <div className="flex h-full w-full flex-col bg-pw-neutral-900 overflow-hidden">
      {/* Header and Tabs */}
      <div className="flex-none border-b border-white/10 bg-pw-neutral-900/50 backdrop-blur-xl">
        <div className="flex items-center px-6 h-16">
          <h1 className="text-xl font-medium text-white mr-8">Intelligence Hub</h1>
          <nav className="flex space-x-1" aria-label="Tabs">
            {[
              { id: 'underwriting', label: 'Underwriting' },
              { id: 'reports', label: 'Reports & Tax' },
              { id: 'performance', label: 'Performance' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'text-white' : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute left-0 right-0 bottom-0 h-0.5 bg-pw-primary-500"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto relative">
        <AnimatePresence mode="wait">
          {activeTab === 'underwriting' && (
            <motion.div
              key="underwriting"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <DealAnalyzerTerminal />
            </motion.div>
          )}
          {activeTab === 'reports' && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="min-h-full"
            >
              <ReportsTaxIntelligence />
            </motion.div>
          )}
          {activeTab === 'performance' && (
            <motion.div
              key="performance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="min-h-full"
            >
              <PortfolioPerformancePage />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
