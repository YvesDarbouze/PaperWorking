'use client';

import React, { useState, useCallback } from 'react';
import { useProjectStore } from '@/store/projectStore';
import {
  ClipboardCheck,
  MapPin,
  Plus,
  Trash2,
  CheckCircle,
  Circle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Camera,
  CalendarDays,
} from 'lucide-react';
import type { SiteVisitLog } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   Site Visit Checklist — Phase 3 (The Engine Room)
   Field logistics: Deal Leads log daily/weekly visits,
   track inspection results, photo count, and issues.
   ═══════════════════════════════════════════════════════ */

type VisitType = SiteVisitLog['type'];

const VISIT_TYPE_COLORS: Record<VisitType, string> = {
  'Daily Check': 'bg-blue-100 text-blue-700',
  'Weekly Inspection': 'bg-purple-100 text-purple-700',
  'Milestone Review': 'bg-green-100 text-green-700',
  'Issue Report': 'bg-red-100 text-red-700',
};

export default function SiteVisitChecklist() {
  const currentProject = useProjectStore(s => s.currentProject);
  const updateSiteVisitLogs = useProjectStore(s => s.updateSiteVisitLogs);

  const [visits, setVisits] = useState<SiteVisitLog[]>(
    () => currentProject?.siteVisitLogs ?? []
  );
  const [expanded, setExpanded] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [newVisitDate, setNewVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newVisitedBy, setNewVisitedBy] = useState('');
  const [newType, setNewType] = useState<VisitType>('Daily Check');
  const [newNotes, setNewNotes] = useState('');
  const [newPhotos, setNewPhotos] = useState('0');
  const [newIssues, setNewIssues] = useState('0');

  const persist = useCallback(
    (next: SiteVisitLog[]) => {
      setVisits(next);
      if (currentProject) updateSiteVisitLogs(currentProject.id, next);
    },
    [currentProject, updateSiteVisitLogs]
  );

  const addVisit = () => {
    if (!newVisitedBy) return;
    const visit: SiteVisitLog = {
      id: `sv-${Date.now()}`,
      date: new Date(newVisitDate),
      visitedBy: newVisitedBy,
      type: newType,
      notes: newNotes,
      photosUploaded: parseInt(newPhotos) || 0,
      issuesFound: parseInt(newIssues) || 0,
      resolved: false,
    };
    persist([visit, ...visits]); // newest first
    setNewVisitedBy('');
    setNewNotes('');
    setNewPhotos('0');
    setNewIssues('0');
    setShowForm(false);
  };

  const toggleResolved = (id: string) => {
    persist(visits.map(v => (v.id === id ? { ...v, resolved: !v.resolved } : v)));
  };

  const removeVisit = (id: string) => {
    persist(visits.filter(v => v.id !== id));
  };

  const totalIssues = visits.reduce((s, v) => s + v.issuesFound, 0);
  const unresolvedCount = visits.filter(v => v.issuesFound > 0 && !v.resolved).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-2 text-left">
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <ClipboardCheck className="w-5 h-5 text-pw-subtle" />
          <div>
            <h3 className="text-lg font-medium tracking-tight text-gray-900">Field Logistics</h3>
            <p className="text-xs text-gray-400 mt-0.5">Site visits, inspections & issue tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-400">{visits.length} visits</span>
          {unresolvedCount > 0 && (
            <span className="bg-red-100 text-red-700 py-0.5 px-2 rounded-full text-xs font-bold">
              {unresolvedCount} open
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <>
          {/* Summary */}
          <div className="px-6 pb-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs uppercase tracking-widest text-gray-400">Total Visits</p>
                <p className="text-xl font-light text-gray-900">{visits.length}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs uppercase tracking-widest text-gray-400">Photos</p>
                <p className="text-xl font-light text-gray-900">{visits.reduce((s, v) => s + v.photosUploaded, 0)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs uppercase tracking-widest text-gray-400">Issues Found</p>
                <p className="text-xl font-light text-gray-900">{totalIssues}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs uppercase tracking-widest text-gray-400">Unresolved</p>
                <p className={`text-xl font-light ${unresolvedCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{unresolvedCount}</p>
              </div>
            </div>
          </div>

          {/* Visit log */}
          <div className="px-6 pb-4 space-y-2">
            {visits.map(v => {
              const dateStr = new Date(v.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const hasIssues = v.issuesFound > 0;
              return (
                <div
                  key={v.id}
                  className={`p-3 rounded-lg border transition ${
                    v.resolved ? 'bg-gray-50 border-gray-100 opacity-70' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Resolve toggle */}
                    <button
                      onClick={() => toggleResolved(v.id)}
                      className={`mt-0.5 flex-shrink-0 ${
                        v.resolved ? 'text-green-500' : hasIssues ? 'text-red-400' : 'text-gray-300'
                      }`}
                    >
                      {v.resolved ? <CheckCircle className="w-4 h-4" /> : hasIssues ? <AlertCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${VISIT_TYPE_COLORS[v.type]}`}>
                          {v.type}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <CalendarDays className="w-3 h-3" />{dateStr}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">{v.visitedBy}</span>
                      </div>
                      {v.notes && (
                        <p className={`text-sm mt-1 ${v.resolved ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                          {v.notes}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-0.5">
                          <Camera className="w-3 h-3" /> {v.photosUploaded} photos
                        </span>
                        {hasIssues && (
                          <span className="flex items-center gap-0.5 text-red-500">
                            <AlertCircle className="w-3 h-3" /> {v.issuesFound} issue{v.issuesFound !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => removeVisit(v.id)}
                      className="text-gray-300 hover:text-red-500 transition flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {visits.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-400">
                No site visits logged yet. Record your first visit below.
              </div>
            )}
          </div>

          {/* Add visit form */}
          <div className="px-6 py-4 border-t border-gray-100">
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition"
              >
                <Plus className="w-3 h-3" /> Log Site Visit
              </button>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="date"
                    value={newVisitDate}
                    onChange={e => setNewVisitDate(e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-gray-400 outline-none"
                  />
                  <input
                    type="text"
                    value={newVisitedBy}
                    onChange={e => setNewVisitedBy(e.target.value)}
                    placeholder="Visited By"
                    className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-gray-400 outline-none"
                  />
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as VisitType)}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-gray-400 outline-none"
                  >
                    <option value="Daily Check">Daily Check</option>
                    <option value="Weekly Inspection">Weekly Inspection</option>
                    <option value="Milestone Review">Milestone Review</option>
                    <option value="Issue Report">Issue Report</option>
                  </select>
                </div>
                <textarea
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="Notes (e.g., 'Drywall install 80% complete, plumbing rough-in passed')"
                  rows={2}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-gray-400 outline-none resize-none"
                />
                <div className="flex gap-3">
                  <div className="flex items-center gap-1.5 flex-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="number"
                      value={newPhotos}
                      onChange={e => setNewPhotos(e.target.value)}
                      placeholder="Photos"
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-gray-400 outline-none"
                    />
                    <span className="text-xs text-gray-400 whitespace-nowrap">photos</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-1">
                    <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="number"
                      value={newIssues}
                      onChange={e => setNewIssues(e.target.value)}
                      placeholder="Issues"
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-gray-400 outline-none"
                    />
                    <span className="text-xs text-gray-400 whitespace-nowrap">issues</span>
                  </div>
                  <button
                    onClick={addVisit}
                    disabled={!newVisitedBy}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition disabled:opacity-40"
                  >
                    Log
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
