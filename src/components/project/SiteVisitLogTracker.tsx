import React, { useState } from 'react';
import { SiteVisitLog } from '@/types/schema';
import { Plus, ClipboardCheck, Trash2, Check, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface SiteVisitLogTrackerProps {
  logs: SiteVisitLog[];
  onChange: (logs: SiteVisitLog[]) => void;
}

const VISIT_TYPES = ['Daily Check', 'Weekly Inspection', 'Milestone Review', 'Issue Report'] as const;

export function SiteVisitLogTracker({ logs, onChange }: SiteVisitLogTrackerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newLog, setNewLog] = useState<Partial<SiteVisitLog>>({
    type: 'Weekly Inspection',
    visitedBy: '',
    notes: '',
    issuesFound: 0,
    photosUploaded: 0,
    resolved: false,
  });

  const handleAdd = () => {
    if (!newLog.visitedBy || !newLog.notes) {
      toast.error('Visitor name and notes are required');
      return;
    }

    const log: SiteVisitLog = {
      id: crypto.randomUUID(),
      date: new Date(),
      type: newLog.type as any,
      visitedBy: newLog.visitedBy,
      notes: newLog.notes,
      issuesFound: Number(newLog.issuesFound) || 0,
      photosUploaded: Number(newLog.photosUploaded) || 0,
      resolved: newLog.issuesFound && newLog.issuesFound > 0 ? (newLog.resolved || false) : true,
    };

    onChange([log, ...logs]);
    setIsAdding(false);
    setNewLog({
      type: 'Weekly Inspection',
      visitedBy: '',
      notes: '',
      issuesFound: 0,
      photosUploaded: 0,
      resolved: false,
    });
    toast.success('Site visit log added');
  };

  const handleDelete = (id: string) => {
    onChange(logs.filter(l => l.id !== id));
    toast.success('Visit log removed');
  };

  const toggleResolved = (id: string, currentResolved: boolean) => {
    onChange(logs.map(l => 
      l.id === id ? { ...l, resolved: !currentResolved } : l
    ));
  };

  const totalIssues = logs.reduce((sum, l) => sum + l.issuesFound, 0);
  const unresolvedIssues = logs.filter(l => !l.resolved && l.issuesFound > 0).reduce((sum, l) => sum + l.issuesFound, 0);

  return (
    <div className="p-6 rounded-lg shadow-sm border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Site Visit Logs</h2>
        </div>
        <div className="text-right">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Visits: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{logs.length}</span></p>
          {unresolvedIssues > 0 && (
            <p className="text-xs text-red-600 flex items-center gap-1 justify-end mt-1">
              <AlertTriangle className="w-3 h-3" />
              {unresolvedIssues} Unresolved Issues
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {logs.map(log => {
          const hasIssues = log.issuesFound > 0;
          return (
            <div key={log.id} className="p-4 rounded-md border flex flex-col gap-3" style={{ borderColor: 'var(--border-ui)' }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>{log.type}</h4>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {log.date instanceof Date ? log.date.toLocaleDateString() : new Date(log.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>By: {log.visitedBy}</p>
                </div>
                <button onClick={() => handleDelete(log.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete Log">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="text-sm bg-gray-50 p-3 rounded border border-gray-100 text-gray-700">
                {log.notes}
              </div>

              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>{log.photosUploaded} Photos</span>
                  {hasIssues && (
                    <span className={`font-medium ${log.resolved ? 'text-green-600' : 'text-red-600'}`}>
                      {log.issuesFound} {log.issuesFound === 1 ? 'Issue' : 'Issues'}
                    </span>
                  )}
                </div>
                {hasIssues && (
                  <button 
                    onClick={() => toggleResolved(log.id, log.resolved)}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      log.resolved 
                        ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' 
                        : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                    }`}
                  >
                    <Check className="w-3 h-3" />
                    {log.resolved ? 'Resolved' : 'Mark Resolved'}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {logs.length === 0 && !isAdding && (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
            No site visits logged yet.
          </div>
        )}

        {isAdding && (
          <div className="p-4 rounded-md border border-blue-200 bg-blue-50 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700">Visit Type</label>
                <select
                  value={newLog.type}
                  onChange={e => setNewLog({...newLog, type: e.target.value as any})}
                  className="w-full px-3 py-2 rounded-md border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                >
                  {VISIT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700">Visited By</label>
                <input
                  type="text"
                  placeholder="e.g., GC Name or Inspector"
                  value={newLog.visitedBy}
                  onChange={e => setNewLog({...newLog, visitedBy: e.target.value})}
                  className="w-full px-3 py-2 rounded-md border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700">Visit Notes / Report</label>
              <textarea
                rows={3}
                placeholder="Details of the visit, progress made, etc."
                value={newLog.notes}
                onChange={e => setNewLog({...newLog, notes: e.target.value})}
                className="w-full px-3 py-2 rounded-md border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700">Issues Found (Optional)</label>
                <input
                  type="number"
                  min="0"
                  value={newLog.issuesFound || ''}
                  onChange={e => setNewLog({...newLog, issuesFound: Number(e.target.value)})}
                  className="w-full px-3 py-2 rounded-md border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700">Photos Uploaded (Optional)</label>
                <input
                  type="number"
                  min="0"
                  value={newLog.photosUploaded || ''}
                  onChange={e => setNewLog({...newLog, photosUploaded: Number(e.target.value)})}
                  className="w-full px-3 py-2 rounded-md border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Save Log
              </button>
            </div>
          </div>
        )}

        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-3 rounded-md border-2 border-dashed flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
            style={{ borderColor: 'var(--border-ui)', color: 'var(--text-secondary)' }}
          >
            <Plus className="w-4 h-4" />
            <span className="font-medium text-sm">Log New Visit</span>
          </button>
        )}
      </div>
    </div>
  );
}
