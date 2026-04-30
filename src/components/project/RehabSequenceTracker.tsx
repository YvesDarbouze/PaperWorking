import React from 'react';
import { Hammer, Wrench, PaintRoller, Sparkles, CheckCircle2, Circle } from 'lucide-react';

interface RehabSequenceTrackerProps {
  currentStage: 'Demolition' | 'Rough-In/MEP' | 'Finishes' | 'Staging' | 'Complete';
  onStageChange: (stage: 'Demolition' | 'Rough-In/MEP' | 'Finishes' | 'Staging' | 'Complete') => void;
}

export function RehabSequenceTracker({ currentStage, onStageChange }: RehabSequenceTrackerProps) {
  const stages = [
    { id: 'Demolition', label: 'Demolition', icon: Hammer, desc: 'Tear down & removal' },
    { id: 'Rough-In/MEP', label: 'Rough-In/MEP', icon: Wrench, desc: 'HVAC, Plumbing, Electrical' },
    { id: 'Finishes', label: 'Finishes', icon: PaintRoller, desc: 'Drywall, Paint, Fixtures' },
    { id: 'Staging', label: 'Staging', icon: Sparkles, desc: 'Prep for sale/rent' },
  ] as const;

  const currentIndex = stages.findIndex(s => s.id === currentStage);
  // If 'Complete', index is -1, but we treat it as all complete (index 4)
  const effectiveIndex = currentStage === 'Complete' ? 4 : currentIndex;

  return (
    <div className="p-6 rounded-lg shadow-sm border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
      <div className="mb-6">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Rehab Sequence Pipeline</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Track the progression of your renovation project</p>
      </div>

      <div className="relative">
        <div className="absolute top-1/2 left-0 w-full h-1 -translate-y-1/2 bg-gray-200 rounded-full" />
        <div 
          className="absolute top-1/2 left-0 h-1 -translate-y-1/2 bg-blue-600 rounded-full transition-all duration-500" 
          style={{ width: `${(effectiveIndex / (stages.length - 1)) * 100}%` }}
        />

        <div className="relative flex justify-between">
          {stages.map((stage, idx) => {
            const Icon = stage.icon;
            const isCompleted = idx < effectiveIndex;
            const isCurrent = idx === effectiveIndex;
            
            return (
              <div 
                key={stage.id} 
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => onStageChange(stage.id)}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-colors z-10 
                  ${isCompleted ? 'bg-blue-600 border-blue-200 text-white' : 
                    isCurrent ? 'bg-white border-blue-600 text-blue-600' : 
                    'bg-white border-gray-200 text-gray-400 group-hover:border-blue-300'}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="mt-3 text-center">
                  <div className={`font-medium text-sm ${isCurrent ? 'text-blue-600' : 'text-gray-700'}`}>
                    {stage.label}
                  </div>
                  <div className="text-xs text-gray-500 hidden sm:block w-24">
                    {stage.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {currentStage !== 'Complete' && (
        <div className="mt-8 text-center">
           <button 
            onClick={() => onStageChange('Complete')}
            className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-gray-50 transition-colors"
            style={{ color: 'var(--text-primary)', borderColor: 'var(--border-ui)' }}
          >
            Mark Pipeline as Complete
          </button>
        </div>
      )}
    </div>
  );
}
