import React from 'react';
import { ClosingChecklistItem, ClosingChecklistItemType } from '@/types/schema';

interface ClosingChecklistProps {
  items?: ClosingChecklistItem[];
  onItemChange: (updatedItems: ClosingChecklistItem[]) => void;
}

const CHECKLIST_TYPES: ClosingChecklistItemType[] = [
  'Proof of Funds / Hard Money Payoff',
  'Signed Purchase Contract',
  'Closing Disclosure',
  'Title / Deed Transfer',
  'Entity Documents (LLC/Inc)',
];

export function ClosingChecklist({ items = [], onItemChange }: ClosingChecklistProps) {
  // Ensure all required types exist in the list
  const displayItems = CHECKLIST_TYPES.map(type => {
    const existing = items.find(item => item.type === type);
    if (existing) return existing;
    
    // Stub missing item
    return {
      id: crypto.randomUUID(),
      type,
      completed: false,
      notes: ''
    } as ClosingChecklistItem;
  });

  const handleToggle = (toggledItem: ClosingChecklistItem) => {
    const updated = displayItems.map(item => {
      if (item.id === toggledItem.id) {
        return {
          ...item,
          completed: !item.completed,
          completedAt: !item.completed ? new Date() : undefined,
        };
      }
      return item;
    });
    onItemChange(updated);
  };

  const completedCount = displayItems.filter(i => i.completed).length;
  const progressPercent = Math.round((completedCount / displayItems.length) * 100);

  return (
    <div 
      className="p-6 rounded-lg space-y-6"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
    >
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Closing Checklist</h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Track required documents and tasks to clear closing.</p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          <span>Progress</span>
          <span>{progressPercent}% Complete</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-default)' }}>
          <div 
            className="h-full transition-all duration-300 ease-out" 
            style={{ background: 'var(--text-primary)', width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {displayItems.map((item) => (
          <div 
            key={item.id} 
            className="flex items-start gap-4 p-4 rounded-md transition-colors cursor-pointer"
            style={{ 
              border: '1px solid var(--border-ui)', 
              background: item.completed ? 'var(--bg-default)' : 'var(--bg-surface)' 
            }}
            onClick={() => handleToggle(item)}
          >
            <div className="pt-0.5">
              <div 
                className="w-5 h-5 rounded flex items-center justify-center border transition-colors"
                style={{ 
                  borderColor: item.completed ? 'var(--text-primary)' : 'var(--border-ui)',
                  backgroundColor: item.completed ? 'var(--text-primary)' : 'transparent'
                }}
              >
                {item.completed && (
                  <svg className="w-3.5 h-3.5" style={{ color: 'var(--bg-surface)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <span 
                className={`text-sm font-medium transition-colors ${item.completed ? 'line-through' : ''}`}
                style={{ color: item.completed ? 'var(--text-secondary)' : 'var(--text-primary)' }}
              >
                {item.type}
              </span>
              {item.completed && item.completedAt && (
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Completed on {new Date(item.completedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
