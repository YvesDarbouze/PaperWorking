import React from 'react';
import { PurchaseReadinessItem, PurchaseReadinessItemType } from '@/types/schema';
import { CheckCircle2 } from 'lucide-react';

interface PurchaseReadinessChecklistProps {
  items?: PurchaseReadinessItem[];
  onItemChange: (updatedItems: PurchaseReadinessItem[]) => void;
  phaseColor?: string;
}

const DEFAULT_TYPES: PurchaseReadinessItemType[] = [
  'Operating Agreement',
  'Proof of Funds',
  'Title Commitment',
  'Entity Documents (LLC/Inc)',
];

export function PurchaseReadinessChecklist({ items = [], onItemChange, phaseColor = '#595959' }: PurchaseReadinessChecklistProps) {
  // Ensure all required types exist in the list
  const displayItems = DEFAULT_TYPES.map(type => {
    const existing = items.find(item => item.type === type);
    if (existing) return existing;
    
    // Stub missing item
    return {
      id: crypto.randomUUID(),
      type,
      completed: false,
      notes: ''
    } as PurchaseReadinessItem;
  });

  const handleToggle = (toggledItem: PurchaseReadinessItem) => {
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

  // SVG Progress Ring math
  const radius = 24;
  const stroke = 4;
  const normalizedRadius = radius - stroke; // adjusting so stroke doesn't get clipped
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div 
      className="p-6 rounded-lg space-y-6"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Purchase Readiness</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Mandatory documents required to unlock Phase 2.</p>
        </div>
        
        {/* Progress Ring */}
        <div className="relative flex items-center justify-center">
          <svg
            height={radius * 2}
            width={radius * 2}
            className="transform -rotate-90"
          >
            <circle
              stroke="var(--bg-default)"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            <circle
              stroke={progressPercent === 100 ? '#16A34A' : phaseColor}
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={circumference + ' ' + circumference}
              style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            {progressPercent === 100 ? (
              <CheckCircle2 className="w-5 h-5" style={{ color: '#16A34A' }} />
            ) : (
              <span className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>{progressPercent}%</span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {displayItems.map((item) => (
          <div 
            key={item.id} 
            className="flex items-start gap-4 p-4 rounded-md transition-colors cursor-pointer hover:opacity-90"
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
                  borderColor: item.completed ? '#16A34A' : 'var(--border-ui)',
                  backgroundColor: item.completed ? '#16A34A' : 'transparent'
                }}
              >
                {item.completed && (
                  <svg className="w-3.5 h-3.5" style={{ color: '#FFFFFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
