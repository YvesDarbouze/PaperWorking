import React from 'react';
import { LoanStatus } from '@/types/schema';
import { Check } from 'lucide-react';

interface LoanProcessingPipelineProps {
  currentStatus?: LoanStatus;
  onStatusChange: (status: LoanStatus) => void;
}

const STATUSES: LoanStatus[] = [
  'Application-Submitted',
  'Appraisal-Ordered',
  'Underwriting-Review',
  'Clear-To-Close',
];

export function LoanProcessingPipeline({ currentStatus, onStatusChange }: LoanProcessingPipelineProps) {
  const currentIndex = currentStatus ? STATUSES.indexOf(currentStatus) : -1;

  return (
    <div 
      className="p-6 rounded-lg space-y-6"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
    >
      <div className="flex flex-col gap-2 mb-2">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Loan Approval Pipeline</h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Track the financing progress for the acquisition.</p>
      </div>

      <div className="relative">
        {/* Vertical connecting line */}
        <div 
          className="absolute top-4 bottom-4 w-0.5 z-0" 
          style={{ background: 'var(--border-ui)', left: '15px' }}
        />

        <div className="relative z-10 flex flex-col gap-8">
          {STATUSES.map((status, index) => {
            const isCompleted = index <= currentIndex;
            const isCurrent = index === currentIndex;

            let bgColor = 'var(--bg-default)';
            let borderColor = 'var(--border-ui)';
            let textColor = 'var(--text-secondary)';

            if (isCompleted) {
              bgColor = 'var(--text-primary)';
              borderColor = 'var(--text-primary)';
              textColor = 'var(--bg-surface)';
            }

            return (
              <div 
                key={status} 
                className="flex items-center gap-4 cursor-pointer group relative"
                onClick={() => onStatusChange(status)}
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors border-2 shrink-0 bg-white"
                  style={{ 
                    backgroundColor: bgColor,
                    borderColor: borderColor,
                    color: textColor
                  }}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--border-ui)' }} />
                  )}
                </div>
                <div className="flex flex-col">
                  <span 
                    className="text-sm font-medium transition-colors"
                    style={{ 
                      color: isCompleted ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: isCurrent ? '700' : '500'
                    }}
                  >
                    {status.replace(/-/g, ' ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
