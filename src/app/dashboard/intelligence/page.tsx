'use client';

import React, { useState } from 'react';
import { DealAnalyzerTerminal } from '@/components/intelligence/DealAnalyzerTerminal';
import { ReportsTaxIntelligence } from '@/components/intelligence/ReportsTaxIntelligence';
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
              className="flex h-full items-center justify-center"
            >
              <div className="text-center space-y-4 max-w-md">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h2 className="text-xl font-medium text-white">Performance Metrics</h2>
                <p className="text-sm text-white/50">
                  Track ROI, IRR, and portfolio performance metrics. This section is currently under construction.
                </p>
                <div className="pt-4">
                  <a href="/dashboard/intelligence/irr" className="text-sm text-pw-primary-400 hover:text-pw-primary-300 transition-colors">
                    View Legacy IRR Calculator &rarr;
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
