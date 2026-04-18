'use client';

import React, { Suspense, lazy } from 'react';
import { X, Settings } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   SettingsDrawer — Slide-out Panel

   Contains organization-level settings:
   1. OrgRoleSelector (Lead Investor / Admin toggle)
   2. Quick links to team management
   ═══════════════════════════════════════════════════════ */

const OrgRoleSelector = lazy(() => import('@/components/settings/OrgRoleSelector'));

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsDrawer({ isOpen, onClose }: Props) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[95] transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
              <Settings className="w-4.5 h-4.5 text-gray-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 tracking-tight">Account Settings</h2>
              <p className="text-sm text-gray-500">Organization & role configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto h-[calc(100%-80px)]">
          <Suspense
            fallback={
              <div className="h-32 bg-gray-50 rounded-xl animate-pulse" />
            }
          >
            <OrgRoleSelector />
          </Suspense>

          {/* Additional Settings Sections */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-1 tracking-tight">Team Overview</h3>
            <p className="text-xs text-gray-500 mb-4">Navigate to the Closing Panel to manage deal-specific teams, or the Evaluation Panel to view investor equity tables.</p>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-xs font-medium text-gray-700">Deal Team Assignments</span>
                <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Closing Panel</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-xs font-medium text-gray-700">Investor Cap Table</span>
                <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Evaluation Panel</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-xs font-medium text-gray-700">Crowdfund Invitations</span>
                <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Evaluation Panel</span>
              </div>
            </div>
          </div>

          {/* Info Footer */}
          <div className="rounded-lg bg-indigo-50/60 border border-indigo-100 p-4">
            <p className="text-sm text-indigo-700 leading-relaxed">
              <strong>Multi-Tenant Architecture:</strong> Your organization role determines pipeline-level permissions. 
              Deal-specific team assignments and investor equity are managed at the individual deal level within their respective panels.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
