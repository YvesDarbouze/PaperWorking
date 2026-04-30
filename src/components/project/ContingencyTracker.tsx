import React, { useEffect } from 'react';
import { Contingency, ContingencyType } from '@/types/schema';
import { Clock, AlertCircle } from 'lucide-react';

interface ContingencyTrackerProps {
  contingencies: Contingency[];
  onChange: (contingencies: Contingency[]) => void;
}

const REQUIRED_TYPES: ContingencyType[] = ['Inspection', 'Financing'];

export function ContingencyTracker({ contingencies, onChange }: ContingencyTrackerProps) {
  useEffect(() => {
    let changed = false;
    const newContingencies = [...contingencies];

    REQUIRED_TYPES.forEach(type => {
      if (!newContingencies.find(c => c.type === type)) {
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 14); // Default to 14 days out
        
        newContingencies.push({
          id: crypto.randomUUID(),
          type,
          deadlineDate: defaultDate,
          isWaived: false,
          isSatisfied: false,
        });
        changed = true;
      }
    });

    if (changed) {
      onChange(newContingencies);
    }
  }, [contingencies, onChange]);

  const updateContingency = (id: string, updates: Partial<Contingency>) => {
    onChange(contingencies.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const calculateDaysRemaining = (deadlineDate: Date | string | undefined | null) => {
    if (!deadlineDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const deadline = deadlineDate instanceof Date 
      ? deadlineDate 
      // @ts-expect-error - firestore timestamp fallback
      : deadlineDate.toDate ? deadlineDate.toDate() 
      : new Date(deadlineDate);
      
    deadline.setHours(0, 0, 0, 0);
    
    const diffTime = deadline.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const displayContingencies = contingencies.filter(c => REQUIRED_TYPES.includes(c.type));

  return (
    <div className="p-6 rounded-lg shadow-sm border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
      <div className="flex items-center gap-3 mb-6">
        <Clock className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Contingency Deadlines</h2>
      </div>

      <div className="space-y-6">
        {displayContingencies.map(contingency => {
          const daysRemaining = calculateDaysRemaining(contingency.deadlineDate);
          const isWarning = daysRemaining !== null && daysRemaining <= 2;
          
          let dateString = '';
          if (contingency.deadlineDate) {
            const dateObj = contingency.deadlineDate instanceof Date 
              ? contingency.deadlineDate 
              // @ts-expect-error - firestore timestamp fallback
              : contingency.deadlineDate.toDate ? contingency.deadlineDate.toDate() 
              : new Date(contingency.deadlineDate);
            
            if (!isNaN(dateObj.getTime())) {
              const year = dateObj.getFullYear();
              const month = String(dateObj.getMonth() + 1).padStart(2, '0');
              const day = String(dateObj.getDate()).padStart(2, '0');
              dateString = `${year}-${month}-${day}`;
            }
          }

          return (
            <div 
              key={contingency.id} 
              className={`p-4 rounded-md border-2 transition-all ${
                isWarning ? 'border-red-500 bg-red-50' : 'border-transparent'
              }`}
              style={{
                borderColor: !isWarning ? 'var(--border-ui)' : undefined,
                backgroundColor: !isWarning ? 'var(--bg-default)' : undefined,
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    {contingency.type} Contingency
                  </label>
                  <input
                    type="date"
                    value={dateString}
                    onChange={(e) => {
                      if (e.target.value) {
                         const [year, month, day] = e.target.value.split('-').map(Number);
                         const newDate = new Date(year, month - 1, day);
                         updateContingency(contingency.id, { deadlineDate: newDate });
                      }
                    }}
                    className="w-full sm:w-auto px-3 py-2 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ 
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-ui)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div className="flex items-center gap-2 justify-end">
                  {isWarning && <AlertCircle className="w-5 h-5 text-red-600" />}
                  <div 
                    className="font-bold text-lg"
                    style={{ color: isWarning ? 'var(--color-red-600, #dc2626)' : 'var(--text-secondary)' }}
                  >
                    {daysRemaining !== null ? (
                      daysRemaining > 0 
                        ? `${daysRemaining} Days Remaining` 
                        : daysRemaining === 0 
                          ? 'Expires Today' 
                          : `${Math.abs(daysRemaining)} Days Expired`
                    ) : 'Not Set'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
