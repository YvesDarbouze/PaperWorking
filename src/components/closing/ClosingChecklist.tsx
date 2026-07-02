'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import {
  ShieldCheck,
  CheckCircle2,
  Circle,
  FileText,
  Banknote,
  FileSignature,
  Building2,
  Landmark,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Upload,
  Lock,
} from 'lucide-react';
import type { ClosingChecklistItem, ClosingChecklistItemType } from '@/types/schema';
import toast from 'react-hot-toast';
import FileDropzone from '@/components/shared/FileDropzone';

/* ═══════════════════════════════════════════════════════
   Closing Checklist — Final Settlement Validation
   Must be 100% complete before a deal is marked "Closed"

   Items:
     1. Proof of Funds / Hard Money Payoff
     2. Signed Purchase Contract
     3. Closing Disclosure
     4. Title / Deed Transfer
     5. Entity Documents (LLC/Inc)
   ═══════════════════════════════════════════════════════ */

const CHECKLIST_META: Record<ClosingChecklistItemType, { icon: React.ReactNode; description: string }> = {
  'Proof of Funds / Hard Money Payoff': {
    icon: <Banknote className="w-5 h-5" />,
    description: 'Verified proof of funds or documentation of hard money loan payoff',
  },
  'Signed Purchase Contract': {
    icon: <FileSignature className="w-5 h-5" />,
    description: 'Fully executed purchase agreement with all addenda',
  },
  'Closing Disclosure': {
    icon: <FileText className="w-5 h-5" />,
    description: 'Final closing disclosure reviewed and signed by all parties',
  },
  'Title / Deed Transfer': {
    icon: <Landmark className="w-5 h-5" />,
    description: 'Clean title with deed transfer recorded at county level',
  },
  'Entity Documents (LLC/Inc)': {
    icon: <Building2 className="w-5 h-5" />,
    description: 'Operating agreement, articles of organization, or corporate docs',
  },
};

const DEFAULT_CHECKLIST: ClosingChecklistItem[] = [
  { id: 'cc-1', type: 'Proof of Funds / Hard Money Payoff', completed: false, notes: '' },
  { id: 'cc-2', type: 'Signed Purchase Contract', completed: false, notes: '' },
  { id: 'cc-3', type: 'Closing Disclosure', completed: false, notes: '' },
  { id: 'cc-4', type: 'Title / Deed Transfer', completed: false, notes: '' },
  { id: 'cc-5', type: 'Entity Documents (LLC/Inc)', completed: false, notes: '' },
];

export default function ClosingChecklist() {
  const currentProject = useProjectStore(s => s.currentProject);
  const updateClosingChecklist = useProjectStore(s => s.updateClosingChecklist);

  const [items, setItems] = useState<ClosingChecklistItem[]>(
    () => currentProject?.closingChecklist ?? DEFAULT_CHECKLIST.map(c => ({ ...c }))
  );
  const [expanded, setExpanded] = useState(true);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);

  const persist = useCallback(
    (next: ClosingChecklistItem[]) => {
      setItems(next);
      if (currentProject) updateClosingChecklist(currentProject.id, next);
    },
    [currentProject, updateClosingChecklist]
  );

  const toggleComplete = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const completed = !item.completed;
    persist(
      items.map(item =>
        item.id === id
          ? {
              ...item,
              completed,
              completedAt: completed ? new Date() : undefined,
            }
          : item
      )
    );
    toast.success(completed ? `${item.type} completed` : `${item.type} marked incomplete`);
  };

  const updateNotes = (id: string, notes: string) => {
    persist(items.map(item => (item.id === id ? { ...item, notes } : item)));
  };

  const handleUploadComplete = (id: string, url: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    persist(
      items.map(item =>
        item.id === id
          ? {
              ...item,
              documentUrl: url,
              completed: true,
              completedAt: new Date(),
            }
          : item
      )
    );
    toast.success(`${item.type} document uploaded`);
  };

  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;
  const allComplete = completedCount === totalCount;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Can we close the deal?
  const canClose = allComplete && items.every(i => i.documentUrl);

  return (
    <div className="bg-bg-surface rounded-xl shadow-sm border border-border-accent overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-bg-primary transition"
      >
        <div className="flex items-center gap-2 text-left">
          {expanded ? <ChevronDown className="w-4 h-4 text-text-secondary" /> : <ChevronRight className="w-4 h-4 text-text-secondary" />}
          <ShieldCheck className="w-5 h-5 text-text-secondary" />
          <div>
            <h3 className="text-lg font-medium tracking-tight text-text-primary">Closing Checklist</h3>
            <p className="text-xs text-text-secondary mt-0.5">All items must be completed before deal can be marked &ldquo;Closed&rdquo;</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-mono font-medium ${allComplete ? 'text-green-600' : 'text-text-primary'}`}>
            {completedCount}/{totalCount}
          </span>
          {allComplete ? (
            <span className="bg-green-100 text-green-700 text-xs font-bold uppercase px-2 py-0.5 rounded-full">Ready</span>
          ) : (
            <span className="bg-amber-100 text-amber-700 text-xs font-bold uppercase px-2 py-0.5 rounded-full">Incomplete</span>
          )}
        </div>
      </button>

      {expanded && (
        <>
          {/* Progress bar */}
          <div className="px-6 pb-4">
            <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  allComplete ? 'bg-green-500' : 'bg-gradient-to-r from-[#a5a5a5] to-[#7f7f7f]'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Checklist items */}
          <div className="px-6 pb-4 space-y-3">
            {items.map(item => {
              const meta = CHECKLIST_META[item.type];
              return (
                <div
                  key={item.id}
                  className={`rounded-lg border transition ${
                    item.completed
                      ? 'bg-green-50 border-green-200'
                      : 'border-border-accent hover:border-border-accent'
                  }`}
                >
                  <div className="p-4 flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleComplete(item.id)}
                      className={`mt-0.5 flex-shrink-0 transition ${
                        item.completed ? 'text-green-500' : 'text-gray-300 hover:text-text-secondary'
                      }`}
                    >
                      {item.completed ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={item.completed ? 'text-green-600' : 'text-text-secondary'}>
                          {meta.icon}
                        </span>
                        <h4
                          className={`text-sm font-semibold ${
                            item.completed ? 'text-green-800 line-through' : 'text-text-primary'
                          }`}
                        >
                          {item.type}
                        </h4>
                      </div>
                      <p className="text-xs text-text-secondary mt-1">{meta.description}</p>

                      {/* Document status */}
                      <div className="flex flex-col gap-2 mt-2 w-full">
                        {item.documentUrl ? (
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                              <FileText className="w-3 h-3" /> Document Uploaded
                            </span>
                            <button
                              onClick={() => {
                                persist(
                                  items.map(i =>
                                    i.id === item.id
                                      ? { ...i, documentUrl: undefined, completed: false, completedAt: undefined }
                                      : i
                                  )
                                );
                                toast.success(`${item.type} document removed`);
                              }}
                              className="text-xs text-red-500 hover:text-red-400 hover:underline cursor-pointer"
                            >
                              Remove
                            </button>
                            {item.documentUrl.startsWith('http') && (
                              <a
                                href={item.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 hover:underline flex items-center gap-0.5"
                              >
                                View File
                              </a>
                            )}
                          </div>
                        ) : activeUploadId === item.id ? (
                          <div className="w-full max-w-md bg-surface-container/10 p-4 rounded-xl border border-border-accent">
                            <FileDropzone
                              projectId={currentProject?.id || 'unknown'}
                              path="closing_docs"
                              onUploadComplete={(res) => {
                                handleUploadComplete(item.id, res.downloadUrl);
                                setActiveUploadId(null);
                              }}
                            />
                            <div className="flex justify-end mt-2">
                              <button
                                onClick={() => setActiveUploadId(null)}
                                className="text-xs text-text-secondary hover:text-text-primary transition px-2 py-1 rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <button
                              onClick={() => setActiveUploadId(item.id)}
                              className="flex items-center gap-1 text-xs text-text-secondary bg-bg-primary border border-border-accent px-2 py-0.5 rounded hover:bg-bg-primary transition"
                            >
                              <Upload className="w-3 h-3" /> Upload Document
                            </button>
                          </div>
                        )}
                        {item.completedAt && (
                          <span className="text-xs text-text-secondary">
                            Completed {new Date(item.completedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Notes */}
                      <input
                        type="text"
                        value={item.notes}
                        onChange={e => updateNotes(item.id, e.target.value)}
                        placeholder="Add notes..."
                        className="mt-2 w-full text-xs bg-transparent border-b border-border-accent focus:border-gray-400 outline-none py-1 text-text-secondary placeholder:text-gray-300"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Close Deal Gate */}
          <div className="px-6 py-4 border-t border-border-accent">
            {canClose ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-900">All settlement requirements met</p>
                  <p className="text-xs text-green-700 mt-0.5">This deal is ready to be marked as &ldquo;Closed.&rdquo;</p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-bg-primary border border-border-accent rounded-lg flex items-center gap-3">
                <Lock className="w-5 h-5 text-text-secondary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {totalCount - completedCount} item{totalCount - completedCount !== 1 ? 's' : ''} remaining
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Complete all checklist items and upload supporting documents to close this deal.
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
