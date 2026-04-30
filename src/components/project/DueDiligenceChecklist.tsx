'use client';

import React, { useEffect } from 'react';
import { DueDiligenceItem } from '@/types/schema';
import { Check, Circle } from 'lucide-react';
import { projectsService } from '@/lib/firebase/deals';

const REQUIRED_ITEMS = [
  "Credit Report",
  "Tax Returns",
  "Letter of Credit",
  "Letter of Approval"
];

interface DueDiligenceChecklistProps {
  projectId?: string;
  items: DueDiligenceItem[];
  onChange: (items: DueDiligenceItem[]) => void;
}

export function DueDiligenceChecklist({ projectId, items, onChange }: DueDiligenceChecklistProps) {
  // Initialize required items if empty
  useEffect(() => {
    if (!items || items.length === 0) {
      const initialItems: DueDiligenceItem[] = REQUIRED_ITEMS.map((label) => ({
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7),
        label,
        completed: false,
      }));
      onChange(initialItems);
      // Auto-save initial required items if project ID is available
      if (projectId) {
        projectsService.updateDeal(projectId, { dueDiligenceChecklist: initialItems }).catch(console.error);
      }
    }
  }, [items, onChange, projectId]);

  const toggleItem = async (id: string) => {
    const newItems = items.map(item => {
      if (item.id === id) {
        const completed = !item.completed;
        return {
          ...item,
          completed,
          completedAt: completed ? new Date() : undefined
        };
      }
      return item;
    });
    
    // Update local state for immediate UI feedback
    onChange(newItems);
    
    // Update database as required by state management specification
    if (projectId) {
      try {
        await projectsService.updateDeal(projectId, { dueDiligenceChecklist: newItems });
      } catch (error) {
        console.error('Failed to update due diligence checklist in database', error);
      }
    }
  };

  const displayItems = items && items.length > 0 ? items : [];

  return (
    <div className="rounded-lg shadow-sm border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border-ui)' }}>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Due Diligence Checklist</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Track required document milestones for this acquisition.
        </p>
      </div>
      
      <div className="p-6 space-y-3">
        {displayItems.map((item) => (
          <div 
            key={item.id}
            onClick={() => toggleItem(item.id)}
            className="flex items-center gap-3 p-3 rounded-md border hover:bg-gray-50 cursor-pointer transition-colors"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}
          >
            <div className="flex-shrink-0">
              {item.completed ? (
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-transparent hover:border-gray-400" style={{ borderColor: 'var(--border-ui)' }}>
                  <Circle className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
            
            <div className="flex-1 flex justify-between items-center">
              <span 
                className={`font-medium text-sm transition-all ${item.completed ? 'line-through' : ''}`}
                style={{ 
                  color: item.completed ? 'var(--text-secondary)' : 'var(--text-primary)' 
                }}
              >
                {item.label}
              </span>
              
              {item.completed && item.completedAt && (
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(item.completedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
