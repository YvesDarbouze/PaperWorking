'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { LenderPackageItem } from '@/types/schema';
import { 
  FileText,
  Upload,
  CheckCircle2,
  Trash2,
  Plus,
  Clock,
  ExternalLink,
  Loader2,
  X,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  projectId: string;
}

export function LenderPackageTracker({ projectId }: Props) {
  const [items, setItems] = useState<LenderPackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Listen to checklist subcollection
  useEffect(() => {
    if (!projectId) return;

    // Check for E2E testing mock
    if (typeof window !== 'undefined' && document.cookie.includes('__e2e_test')) {
      const key = `pw_e2e_lender_package_${projectId}`;
      const load = () => {
        try {
          const val = localStorage.getItem(key);
          setItems(val ? JSON.parse(val) : []);
          setLoading(false);
        } catch (e) {
          console.error(e);
        }
      };
      load();
      window.addEventListener('storage', (e) => {
        if (e.key === key) load();
      });
      return;
    }

    const q = query(
      collection(db, 'projects', projectId, 'lenderPackage'),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as LenderPackageItem[];
        setItems(docs);
        setLoading(false);
      },
      (err) => {
        console.error('[LenderPackageTracker] subcollection read failed, trying to trigger seed:', err);
        // Trigger initial fetch/GET to auto-seed the customary items
        const triggerSeed = async () => {
          try {
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();
            if (token) {
              const res = await fetch(`/api/projects/${projectId}/lender-package`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (res.ok) {
                const data = await res.json();
                setItems(data.items || []);
              }
            }
          } catch (e) {
            console.error('Trigger seed failed:', e);
          } finally {
            setLoading(false);
          }
        };
        triggerSeed();
      }
    );

    return unsub;
  }, [projectId]);

  // Fallback trigger if no items exist on page load
  useEffect(() => {
    if (loading || items.length > 0) return;
    const triggerSeed = async () => {
      try {
        const auth = getAuth();
        const token = await auth.currentUser?.getIdToken();
        if (token) {
          const res = await fetch(`/api/projects/${projectId}/lender-package`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setItems(data.items || []);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    triggerSeed();
  }, [projectId, loading, items.length]);

  const handleAddCustomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    setAddingItem(true);
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication token required.');

      const res = await fetch(`/api/projects/${projectId}/lender-package`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name: newItemName.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to add checklist item.');
      }

      setNewItemName('');
      toast.success('Custom checklist item added.');
    } catch (err: any) {
      toast.error(err.message || 'Error adding item.');
    } finally {
      setAddingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}"?`)) return;

    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication token required.');

      const res = await fetch(`/api/projects/${projectId}/lender-package/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete item.');
      }

      toast.success('Checklist item removed.');
    } catch (err: any) {
      toast.error(err.message || 'Error deleting item.');
    }
  };

  const handleUpdateCadence = async (itemId: string, cadence: 'none' | 'daily' | 'weekly') => {
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication token required.');

      const res = await fetch(`/api/projects/${projectId}/lender-package/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          reminderCadence: cadence,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update cadence.');
      }

      toast.success('Reminder cadence updated.');
    } catch (err: any) {
      toast.error(err.message || 'Error updating cadence.');
    }
  };

  const handleFileUpload = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF documents are allowed.');
      return;
    }

    setUploadingItemId(itemId);
    const toastId = toast.loading('Uploading document to Data Room Debt folder...');

    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication token required.');

      // 1. Ensure Debt folder exists
      const folderRes = await fetch(`/api/projects/${projectId}/lender-package/debt-folder`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!folderRes.ok) {
        throw new Error('Failed to provision Debt folder in the Data Room.');
      }
      const { folderId } = await folderRes.json();

      // 2. Upload the file to documents endpoint
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderId', folderId);
      formData.append('category', 'Other');
      formData.append('documentType', 'other');

      const uploadRes = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json();
        throw new Error(errData.error || 'Document upload failed.');
      }

      const { docId, downloadUrl } = await uploadRes.json();

      // 3. Update checklist item in database
      const updateRes = await fetch(`/api/projects/${projectId}/lender-package/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          status: 'Uploaded',
          fileId: docId,
          fileName: file.name,
          fileUrl: downloadUrl,
        }),
      });

      if (!updateRes.ok) {
        throw new Error('Failed to link document to checklist item.');
      }

      toast.success('Document uploaded and saved to Data Room Debt folder.', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Error uploading document.', { id: toastId });
    } finally {
      setUploadingItemId(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleClearFile = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to remove this document link?')) return;

    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication token required.');

      const res = await fetch(`/api/projects/${projectId}/lender-package/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          status: 'Pending',
          fileId: null,
          fileName: null,
          fileUrl: null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to clear document.');
      }

      toast.success('Document removed.');
    } catch (err: any) {
      toast.error(err.message || 'Error clearing document.');
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[150px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#7A9EAA] mb-2" />
        <span className="text-xs text-pw-muted font-light uppercase tracking-wider">Loading customary package checklist...</span>
      </div>
    );
  }

  const uploadedCount = items.filter(i => i.status === 'Uploaded').length;
  const totalCount = items.length;
  const completionPct = totalCount > 0 ? Math.round((uploadedCount / totalCount) * 100) : 0;

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-pw-border pb-4 gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-light uppercase tracking-widest text-pw-black flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#7A9EAA]" />
            Lender Package (Customary Checklist)
          </h3>
          <p className="text-xs text-pw-muted font-light mt-1">
            Manage and upload the customary underwriting package required by the lender.
          </p>
          <div className="flex items-start gap-2.5 mt-3 p-3 bg-blue-50/40 border border-blue-100 rounded-lg text-[11px] text-blue-900 font-light leading-relaxed max-w-2xl">
            <AlertCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <p>
              These documents represent a <strong>customary lender package</strong> and are not absolute mandates. 
              You can adjust this checklist by adding or removing items to match your lender's specific requests.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-semibold text-pw-black block">{uploadedCount} of {totalCount} Uploaded</span>
            <span className="text-[10px] text-pw-muted block">{completionPct}% Complete</span>
          </div>
          <div className="w-16 bg-gray-200 h-2 rounded-full overflow-hidden border border-gray-300">
            <div className="bg-[#7A9EAA] h-full transition-all" style={{ width: `${completionPct}%` }} />
          </div>
        </div>
      </div>

      {/* Main checklist table */}
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="p-4 rounded border border-dashed border-pw-border text-center text-xs text-pw-muted font-light">
            No items in the customary package yet.
          </div>
        ) : (
          items.map((item) => {
            const isUploaded = item.status === 'Uploaded';
            const isUploading = uploadingItemId === item.id;

            return (
              <div 
                key={item.id}
                className={`p-3.5 border rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-all ${
                  isUploaded 
                    ? 'border-emerald-200 bg-emerald-50/20' 
                    : 'border-pw-border bg-pw-white'
                }`}
              >
                {/* Info block */}
                <div className="flex items-start gap-3 shrink-0 max-w-full md:max-w-[45%]">
                  {isUploaded ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-pw-black block truncate">{item.name}</span>
                    {item.isCustom && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] bg-purple-50 text-purple-700 border border-purple-200 uppercase font-black tracking-widest inline-block mt-0.5">
                        Custom
                      </span>
                    )}
                  </div>
                </div>

                {/* Upload Action */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                  {isUploaded ? (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded px-2.5 py-1 text-xs">
                      <a 
                        href={item.fileUrl || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-emerald-800 hover:text-emerald-950 font-medium underline flex items-center gap-1 max-w-[120px] truncate"
                      >
                        {item.fileName}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button 
                        onClick={() => handleClearFile(item.id)}
                        className="text-emerald-700 hover:text-red-600 ml-1"
                        title="Remove file link"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input 
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => handleFileUpload(item.id, e)}
                        className="hidden"
                        id={`file-upload-${item.id}`}
                        disabled={!!uploadingItemId}
                      />
                      <label 
                        htmlFor={`file-upload-${item.id}`}
                        className={`pw-interactive px-3 py-1.5 border border-pw-border text-[10px] font-bold uppercase tracking-wider bg-pw-white text-pw-black hover:bg-gray-50 flex items-center gap-1.5 rounded cursor-pointer transition-all ${
                          isUploading || uploadingItemId ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isUploading ? (
                          <Loader2 className="w-3 h-3 animate-spin text-[#7A9EAA]" />
                        ) : (
                          <Upload className="w-3 h-3 text-pw-muted" />
                        )}
                        {isUploading ? 'Uploading...' : 'Upload PDF'}
                      </label>
                    </div>
                  )}

                  {/* Reminder Cadence */}
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-pw-muted" />
                    <select 
                      value={item.reminderCadence}
                      onChange={(e) => handleUpdateCadence(item.id, e.target.value as any)}
                      className="bg-transparent border-0 text-[11px] text-pw-muted hover:text-pw-black font-light focus:ring-0 cursor-pointer outline-none"
                    >
                      <option value="none">No reminder</option>
                      <option value="daily">Daily reminder</option>
                      <option value="weekly">Weekly reminder</option>
                    </select>
                  </div>

                  {/* Delete Item */}
                  <button 
                    onClick={() => handleDeleteItem(item.id, item.name)}
                    className="text-pw-muted hover:text-red-600 transition-colors p-1"
                    title="Delete item"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Custom Item Form */}
      <form onSubmit={handleAddCustomItem} className="border-t border-pw-border pt-4 flex gap-3">
        <input 
          type="text"
          placeholder="Add custom lender document ask (e.g. Credit Memo)..."
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          className="flex-1 bg-pw-bg border border-pw-border focus:border-[#7A9EAA] focus:ring-0 rounded-lg px-3 py-2 text-xs placeholder:text-pw-muted placeholder:font-light outline-none"
          disabled={addingItem}
        />
        <button 
          type="submit"
          disabled={!newItemName.trim() || addingItem}
          className={`pw-interactive px-4 py-2 text-xs font-semibold uppercase tracking-wider text-pw-white flex items-center gap-1 transition-all ${
            newItemName.trim() && !addingItem 
              ? 'bg-[#7A9EAA] hover:bg-[#688a95] shadow-sm' 
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {addingItem ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Add Item
        </button>
      </form>
    </div>
  );
}
