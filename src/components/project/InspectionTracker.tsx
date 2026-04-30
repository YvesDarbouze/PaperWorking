'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { InspectionItem, InspectionStatus } from '@/types/schema';
import { projectsService } from '@/lib/firebase/deals';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const MANDATORY_CATEGORIES = ['Foundation', 'Electrical', 'Plumbing'];

interface InspectionTrackerProps {
  projectId: string;
  initialInspections: InspectionItem[];
  onLocalChange?: (items: InspectionItem[]) => void;
}

export function InspectionTracker({ projectId, initialInspections, onLocalChange }: InspectionTrackerProps) {
  const [inspections, setInspections] = useState<InspectionItem[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);

  // Initialize and merge mandatory categories
  useEffect(() => {
    if (hasInitialized.current) return;
    
    let hasChanges = false;
    const currentItems = [...(initialInspections || [])];
    
    MANDATORY_CATEGORIES.forEach(cat => {
      if (!currentItems.find(i => i.category === cat)) {
        currentItems.push({
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7),
          category: cat,
          status: 'Pending',
          notes: ''
        });
        hasChanges = true;
      }
    });

    // Sort so mandatory categories are at the top
    currentItems.sort((a, b) => {
      const idxA = MANDATORY_CATEGORIES.indexOf(a.category);
      const idxB = MANDATORY_CATEGORIES.indexOf(b.category);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });

    setInspections(currentItems);
    setIsInitializing(false);
    hasInitialized.current = true;

    if (hasChanges) {
      // Save initialization immediately
      saveToDatabase(currentItems);
      if (onLocalChange) onLocalChange(currentItems);
    }
  }, [initialInspections, onLocalChange]);

  const saveToDatabase = async (itemsToSave: InspectionItem[]) => {
    setIsSaving(true);
    try {
      // Firestore supports dot notation keys for nested updates
      await projectsService.updateDeal(projectId, {
        'financials.inspections': itemsToSave
      } as any);
    } catch (error) {
      console.error('Error saving inspections:', error);
      toast.error('Failed to save inspection updates');
    } finally {
      setIsSaving(false);
    }
  };

  const scheduleSave = useCallback((itemsToSave: InspectionItem[]) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setIsSaving(true); // Show visual indicator immediately
    
    saveTimeoutRef.current = setTimeout(() => {
      saveToDatabase(itemsToSave);
    }, 1000); // 1s debounce
  }, [projectId]);

  const updateItem = (id: string, updates: Partial<InspectionItem>) => {
    const newItems = inspections.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    setInspections(newItems);
    if (onLocalChange) onLocalChange(newItems);
    scheduleSave(newItems);
  };

  if (isInitializing) {
    return (
      <div className="flex justify-center p-8 border rounded-md" style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-surface)' }}>
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="rounded-lg shadow-sm border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
      <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-ui)' }}>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Inspection Tracker</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Identify and track hidden CapEx issues across major categories.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-xs flex items-center gap-1 font-medium text-blue-600">
              <Loader2 className="w-3 h-3 animate-spin" /> Auto-saving
            </span>
          )}
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        {inspections.map((item) => (
          <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border-b pb-6 last:border-0 last:pb-0" style={{ borderColor: 'var(--border-ui)' }}>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Category</label>
              <div className="font-semibold text-base py-2" style={{ color: 'var(--text-primary)' }}>{item.category}</div>
            </div>
            
            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Status</label>
              <select
                value={item.status}
                onChange={(e) => updateItem(item.id, { status: e.target.value as InspectionStatus })}
                className="w-full rounded-md border p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
                style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-default)', color: 'var(--text-primary)' }}
              >
                <option value="Pending">Pending</option>
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
                <option value="Needs Negotiation">Needs Negotiation</option>
              </select>
            </div>
            
            <div className="md:col-span-6">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Inspection Notes / Hidden Issues</label>
              <textarea
                value={item.notes}
                onChange={(e) => updateItem(item.id, { notes: e.target.value })}
                placeholder="Log any hidden issues, structural observations, or repair notes..."
                className="w-full rounded-md border p-2 text-sm min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
                style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-default)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
