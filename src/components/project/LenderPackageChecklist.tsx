'use client';

import React, { useState, useEffect } from 'react';
import { LenderChecklistItem, DealDocumentCategory, ESignStatus } from '@/types/schema';
import { projectsService } from '@/lib/firebase/deals';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import FileDropzone from '@/components/shared/FileDropzone';
import toast from 'react-hot-toast';
import { 
  Check, 
  Trash2, 
  Plus, 
  Clock, 
  FileText, 
  Edit3, 
  Save, 
  RefreshCw,
  Info,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const CONVENTIONAL_DEFAULTS = [
  '3 years Personal Tax Returns',
  '3 years Business Tax Returns',
  'Profit & Loss Statement (P&L)',
  'Proforma / Financial Projections',
  'Schedule of Debt',
  'Organizational Documents (LLC/Inc)',
  'Project Cost Breakdown / Budget'
];

const HARD_MONEY_DEFAULTS = [
  'Proforma / Financial Projections',
  'Project Cost Breakdown / Budget',
  'Organizational Documents (LLC/Inc)'
];

interface LenderPackageChecklistProps {
  projectId: string;
  checklist: LenderChecklistItem[];
  loans: any[];
}

export function LenderPackageChecklist({ projectId, checklist = [], loans = [] }: LenderPackageChecklistProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<LenderChecklistItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [newItemLabel, setNewItemLabel] = useState('');
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);

  // Determine active route based on loans
  const hasHardMoneyOrBridge = loans.some(
    l => (l.lender === 'hard_money' || l.lender === 'bridge') && !l.archived
  );
  const detectedRoute = hasHardMoneyOrBridge ? 'hard_money' : 'conventional';

  // Initialize checklist if empty
  useEffect(() => {
    if (checklist.length > 0) {
      setItems(checklist);
    } else {
      initializeDefaults(detectedRoute);
    }
  }, [checklist, detectedRoute]);

  const initializeDefaults = async (routeType: 'conventional' | 'hard_money') => {
    const defaults = routeType === 'hard_money' ? HARD_MONEY_DEFAULTS : CONVENTIONAL_DEFAULTS;
    const initialItems: LenderChecklistItem[] = defaults.map(label => ({
      id: crypto.randomUUID(),
      label,
      status: 'pending',
      reminderCadence: 'weekly'
    }));

    setItems(initialItems);
    try {
      await projectsService.updateProject(projectId, { lenderChecklist: initialItems });
    } catch (err) {
      console.error('Failed to save initial lender checklist:', err);
    }
  };

  const handleUpdateItems = async (newItems: LenderChecklistItem[]) => {
    setItems(newItems);
    try {
      await projectsService.updateProject(projectId, { lenderChecklist: newItems });
    } catch (err) {
      console.error('Failed to update lender checklist:', err);
      toast.error('Failed to save changes');
    }
  };

  const handleAddCustomItem = () => {
    if (!newItemLabel.trim()) return;
    const newItem: LenderChecklistItem = {
      id: crypto.randomUUID(),
      label: newItemLabel.trim(),
      status: 'pending',
      reminderCadence: 'weekly'
    };
    const updated = [...items, newItem];
    handleUpdateItems(updated);
    setNewItemLabel('');
    toast.success('Custom requirement added');
  };

  const handleDeleteItem = (id: string) => {
    const updated = items.filter(item => item.id !== id);
    handleUpdateItems(updated);
    toast.success('Requirement removed');
  };

  const handleStartEdit = (item: LenderChecklistItem) => {
    setEditingId(item.id);
    setEditingLabel(item.label);
  };

  const handleSaveEdit = (id: string) => {
    if (!editingLabel.trim()) return;
    const updated = items.map(item => {
      if (item.id === id) {
        return { ...item, label: editingLabel.trim() };
      }
      return item;
    });
    handleUpdateItems(updated);
    setEditingId(null);
    toast.success('Label updated');
  };

  const handleCadenceChange = (id: string, cadence: LenderChecklistItem['reminderCadence']) => {
    const updated = items.map(item => {
      if (item.id === id) {
        return { ...item, reminderCadence: cadence };
      }
      return item;
    });
    handleUpdateItems(updated);
    toast.success(`Reminder cadence updated to ${cadence}`);
  };

  const handleUploadComplete = async (itemId: string, result: any) => {
    const updated = items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          status: 'uploaded' as const,
          fileUrl: result.downloadUrl,
          storagePath: result.storagePath,
          uploadedAt: new Date().toISOString()
        };
      }
      return item;
    });

    // Update Project checklist
    await handleUpdateItems(updated);
    setActiveUploadId(null);

    // Save to the project's documents subcollection with category 'Debt'
    if (user) {
      try {
        const matchingItem = items.find(item => item.id === itemId);
        const docData = {
          projectId,
          category: 'Debt' as DealDocumentCategory,
          fileName: result.fileName,
          fileUrl: result.downloadUrl,
          storagePath: result.storagePath,
          fileSize: result.fileSize || 0,
          mimeType: result.mimeType || 'application/pdf',
          uploadedByUid: user.uid,
          uploadedByName: user.displayName || user.email || 'Sponsor',
          eSignStatus: 'Not Required' as ESignStatus,
          notes: `Uploaded for Lender Package: ${matchingItem?.label || 'Required Document'}`,
        };

        await addDoc(collection(db, 'projects', projectId, 'documents'), {
          ...docData,
          uploadedAt: serverTimestamp(),
        });
        toast.success('Document uploaded and saved to Data Room');
      } catch (err) {
        console.error('Failed to write document metadata to Firestore:', err);
        toast.error('Uploaded but failed to index document in Data Room');
      }
    }
  };

  const handleRemoveFile = async (itemId: string) => {
    const updated = items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          status: 'pending' as const,
          fileUrl: undefined,
          storagePath: undefined,
          uploadedAt: undefined
        };
      }
      return item;
    });
    await handleUpdateItems(updated);
    toast.success('File attachment removed');
  };

  const completedCount = items.filter(i => i.status === 'uploaded').length;
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-white/20 to-transparent"></div>
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white uppercase tracking-wider">F3.2 Lender Package Checklist</h3>
            <span className="bg-[#7A9EAA]/15 border border-[#7A9EAA]/30 text-[#7A9EAA] px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
              {detectedRoute === 'hard_money' ? 'Asset-Focused' : 'Conventional/SBA'}
            </span>
          </div>
          <p className="text-xs text-[#9E9DA0] mt-1 leading-normal">
            Customary package, adjustable to the actual lender's request. Uploaded files automatically land in the Data Room's Debt folder.
          </p>
        </div>

        <button
          onClick={() => {
            if (confirm('Reset checklist to current route defaults? This will lose custom items.')) {
              initializeDefaults(detectedRoute);
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.05em] bg-white/[0.03] border border-white/5 text-[#9E9DA0] hover:bg-white/[0.08] hover:text-white transition-all shrink-0 self-start md:self-auto"
        >
          <RefreshCw size={12} />
          Reset Defaults
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-[#9E9DA0]">
          <span>Package Progress</span>
          <span className="text-[#7A9EAA]">{completedCount} of {items.length} ({progressPercent}% Complete)</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/5 border border-white/5">
          <div 
            className="h-full bg-gradient-to-r from-[#7A9EAA] to-[#b3ccd4] transition-all duration-500 ease-out" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Checklist items */}
      <div className="space-y-3">
        {items.map((item) => {
          const isEditing = editingId === item.id;
          const isUploaded = item.status === 'uploaded';

          return (
            <div 
              key={item.id}
              className={`p-4 rounded-xl border transition-all space-y-3 ${
                isUploaded 
                  ? 'border-emerald-500/20 bg-emerald-500/[0.01]' 
                  : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.02]'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Title / Label editing */}
                <div className="flex items-center gap-3 flex-1">
                  {isUploaded ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/35 flex items-center justify-center text-emerald-400 shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <Clock className="w-3 h-3 text-[#9E9DA0]" />
                    </div>
                  )}

                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingLabel}
                        onChange={(e) => setEditingLabel(e.target.value)}
                        className="bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2.5 py-1 flex-1 focus:outline-none focus:border-[#7A9EAA]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(item.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <button
                        onClick={() => handleSaveEdit(item.id)}
                        className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                      >
                        <Save size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 group">
                      <span className={`text-xs font-semibold ${isUploaded ? 'text-white' : 'text-[#D0CFD1]'}`}>
                        {item.label}
                      </span>
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-[#9E9DA0] hover:text-white transition-opacity"
                        title="Edit label"
                      >
                        <Edit3 size={11} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Cadence Selector & Delete */}
                <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0 text-[11px]">
                  {/* Cadence Dropdown */}
                  <div className="flex items-center gap-1 bg-white/5 border border-white/5 rounded-lg px-2 py-1 text-[#9E9DA0]">
                    <Clock size={11} className="text-[#9E9DA0]" />
                    <select
                      value={item.reminderCadence}
                      onChange={(e) => handleCadenceChange(item.id, e.target.value as any)}
                      className="bg-transparent text-[#9E9DA0] border-none focus:outline-none cursor-pointer pr-1"
                    >
                      <option value="none">No Alerts</option>
                      <option value="daily">Daily Alerts</option>
                      <option value="weekly">Weekly Alerts</option>
                      <option value="biweekly">Bi-weekly Alerts</option>
                    </select>
                  </div>

                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-[#9E9DA0] hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all"
                    title="Delete requirement"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Upload section */}
              <div className="pl-8">
                {isUploaded ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-emerald-400" />
                      <a 
                        href={item.fileUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[11px] font-mono text-[#7A9EAA] hover:underline flex items-center gap-1"
                      >
                        Attached File
                        <ExternalLink size={10} />
                      </a>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(item.id)}
                      className="text-[10px] font-bold uppercase tracking-wider text-red-400 hover:underline"
                    >
                      Remove File
                    </button>
                  </div>
                ) : (
                  <div>
                    {activeUploadId === item.id ? (
                      <div className="p-3 bg-white/[0.01] border border-dashed border-white/10 rounded-xl">
                        <FileDropzone
                          projectId={projectId}
                          path="lender_docs"
                          accept={['application/pdf', 'image/jpeg', 'image/png', 'image/webp']}
                          onUploadComplete={(res) => handleUploadComplete(item.id, res)}
                          onUploadError={(err) => toast.error(err)}
                        />
                        <button
                          onClick={() => setActiveUploadId(null)}
                          className="mt-2 text-[10px] font-bold uppercase text-[#9E9DA0] hover:text-white"
                        >
                          Cancel Upload
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setActiveUploadId(item.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/5 text-[#9E9DA0] hover:bg-white/10 hover:text-white transition-all"
                      >
                        <Plus size={11} />
                        Upload Document
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add custom item form */}
      <div className="flex items-center gap-2 pt-2">
        <input
          type="text"
          placeholder="Add custom lender requirement..."
          value={newItemLabel}
          onChange={(e) => setNewItemLabel(e.target.value)}
          className="bg-white/5 border border-white/5 text-white text-xs rounded-xl px-4 py-2 flex-1 focus:outline-none focus:border-[#7A9EAA] placeholder:text-[#9E9DA0]/50"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddCustomItem();
          }}
        />
        <button
          onClick={handleAddCustomItem}
          className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#7A9EAA] hover:bg-[#8bb0bc] text-[#121317] transition-all"
        >
          <Plus size={14} />
          Add
        </button>
      </div>
    </div>
  );
}
