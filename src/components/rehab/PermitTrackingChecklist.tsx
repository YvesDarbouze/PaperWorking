'use client';

import React, { useState } from 'react';
import { FileText, CheckCircle, Clock, AlertTriangle, Plus, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   Permit Tracking Checklist — Phase 3 Module
   Ensures legal compliance across all renovation work.
   Tracks permit filing, inspection, and approval status.
   ═══════════════════════════════════════════════════════ */

type PermitStatus = 'Not Filed' | 'Filed' | 'Under Review' | 'Approved' | 'Denied' | 'Inspection Scheduled';

interface PermitItem {
  id: string;
  type: string;
  municipality: string;
  status: PermitStatus;
  filedDate?: string;
  inspectionDate?: string;
  notes?: string;
}

const STATUS_CONFIG: Record<PermitStatus, { color: string; bg: string; icon: React.ReactNode }> = {
  'Not Filed': { color: 'text-text-secondary', bg: 'bg-bg-primary', icon: <Clock className="w-3.5 h-3.5" /> },
  Filed: { color: 'text-blue-600', bg: 'bg-blue-50', icon: <FileText className="w-3.5 h-3.5" /> },
  'Under Review': { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: <Clock className="w-3.5 h-3.5" /> },
  Approved: { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  Denied: { color: 'text-red-600', bg: 'bg-red-50', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  'Inspection Scheduled': { color: 'text-purple-600', bg: 'bg-purple-50', icon: <FileText className="w-3.5 h-3.5" /> },
};

const INITIAL_PERMITS: PermitItem[] = [
  { id: '1', type: 'Building / Structural', municipality: 'Miami-Dade County', status: 'Approved', filedDate: '2026-03-15', notes: 'Load-bearing wall modification approved' },
  { id: '2', type: 'Electrical', municipality: 'Miami-Dade County', status: 'Filed', filedDate: '2026-04-01', notes: 'Panel upgrade 100A to 200A' },
  { id: '3', type: 'Plumbing', municipality: 'Miami-Dade County', status: 'Under Review', filedDate: '2026-04-05' },
  { id: '4', type: 'HVAC / Mechanical', municipality: 'Miami-Dade County', status: 'Not Filed', notes: 'New ductwork — requires engineering sign-off' },
  { id: '5', type: 'Demolition', municipality: 'Miami-Dade County', status: 'Approved', filedDate: '2026-03-10' },
  { id: '6', type: 'Final Inspection (CO)', municipality: 'Miami-Dade County', status: 'Not Filed', notes: 'Required before sale — all permits must be closed' },
];

export default function PermitTrackingChecklist() {
  const [permits, setPermits] = useState<PermitItem[]>(INITIAL_PERMITS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPermitType, setNewPermitType] = useState('');

  const approvedCount = permits.filter(p => p.status === 'Approved').length;
  const deniedCount = permits.filter(p => p.status === 'Denied').length;
  const isFullyCompliant = approvedCount === permits.length;

  const handleAddPermit = () => {
    if (!newPermitType.trim()) return;
    setPermits([
      ...permits,
      {
        id: Math.random().toString(36).slice(2, 8),
        type: newPermitType,
        municipality: 'Miami-Dade County',
        status: 'Not Filed',
      },
    ]);
    setNewPermitType('');
    setShowAddForm(false);
    toast.success('Permit added to tracker');
  };

  const advanceStatus = (id: string) => {
    const order: PermitStatus[] = ['Not Filed', 'Filed', 'Under Review', 'Inspection Scheduled', 'Approved'];
    setPermits(permits.map(p => {
      if (p.id === id) {
        const idx = order.indexOf(p.status);
        if (idx >= 0 && idx < order.length - 1) {
          const next = order[idx + 1];
          toast.success(`${p.type} → ${next}`);
          return { ...p, status: next, filedDate: p.filedDate || new Date().toISOString().slice(0, 10) };
        }
      }
      return p;
    }));
  };

  return (
    <div className="bg-bg-surface rounded-xl shadow-sm border border-border-accent overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border-accent">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-text-primary" />
            <h3 className="text-lg font-medium tracking-tight text-text-primary">Permit Compliance</h3>
          </div>
          <div className="flex items-center gap-2">
            {isFullyCompliant ? (
              <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> COMPLIANT
              </span>
            ) : deniedCount > 0 ? (
              <span className="bg-red-50 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full border border-red-200 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {deniedCount} DENIED
              </span>
            ) : null}
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-bg-primary text-text-primary rounded-md hover:bg-gray-200 transition"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-text-secondary mb-1">
            <span>Compliance Progress</span>
            <span>{approvedCount}/{permits.length} approved</span>
          </div>
          <div className="w-full bg-bg-primary rounded-full h-2 flex overflow-hidden">
            <div className="bg-emerald-500 h-2 transition-all" style={{ width: `${(approvedCount / permits.length) * 100}%` }} />
            {deniedCount > 0 && (
              <div className="bg-red-400 h-2 transition-all" style={{ width: `${(deniedCount / permits.length) * 100}%` }} />
            )}
          </div>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="flex items-center gap-2 p-3 bg-bg-primary rounded-lg border border-border-accent">
            <input
              type="text"
              placeholder="e.g., Roofing Permit"
              value={newPermitType}
              onChange={(e) => setNewPermitType(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddPermit()}
              className="flex-1 text-sm border border-border-accent rounded px-3 py-1.5 focus:ring-1 focus:ring-gray-400 focus:outline-none"
            />
            <button onClick={handleAddPermit} className="px-4 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded hover:bg-gray-800 transition">
              Add
            </button>
          </div>
        )}
      </div>

      {/* Permits List */}
      <div className="divide-y divide-gray-100">
        {permits.map(permit => {
          const config = STATUS_CONFIG[permit.status];
          return (
            <div key={permit.id} className="flex items-center justify-between px-6 py-4 hover:bg-bg-primary transition group">
              <div className="flex items-center space-x-3">
                <span className={config.color}>{config.icon}</span>
                <div>
                  <p className="text-sm font-medium text-text-primary">{permit.type}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-text-secondary">{permit.municipality}</p>
                    {permit.filedDate && (
                      <p className="text-xs text-text-secondary">Filed: {permit.filedDate}</p>
                    )}
                  </div>
                  {permit.notes && (
                    <p className="text-xs text-text-secondary mt-0.5 italic">{permit.notes}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${config.bg} ${config.color}`}>
                  {permit.status}
                </span>
                {permit.status !== 'Approved' && permit.status !== 'Denied' && (
                  <button
                    onClick={() => advanceStatus(permit.id)}
                    className="opacity-0 group-hover:opacity-100 transition text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Advance →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
