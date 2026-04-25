import React from 'react';
import { CheckCircle, Circle, MapPin } from 'lucide-react';

interface DealProgressTrackerProps {
  currentPhase: 'Evaluation' | 'Acquisition' | 'Financing' | 'Closing' | 'Rehab' | 'Exit';
}

const PHASES = [
  'Evaluation',
  'Acquisition',
  'Financing',
  'Closing',
  'Rehab',
  'Exit'
] as const;

export default function DealProgressTracker({ currentPhase }: DealProgressTrackerProps) {
  const currentIndex = PHASES.indexOf(currentPhase);

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-40">
       <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-1 sm:space-x-2 w-full">
             {PHASES.map((phase, idx) => {
               const isActive = currentIndex === idx;
               const isCompleted = currentIndex > idx;
               
               return (
                 <React.Fragment key={phase}>
                   <div className="flex flex-col items-center group relative cursor-default">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isActive ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)] scale-110' : isCompleted ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-text-secondary'}`}>
                         {isCompleted ? <CheckCircle className="w-5 h-5"/> : isActive ? <MapPin className="w-4 h-4" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                      </div>
                      <span className={`text-xs mt-1.5 font-bold uppercase tracking-wider ${isActive ? 'text-indigo-300' : isCompleted ? 'text-emerald-400' : 'text-text-secondary'}`}>
                         {phase}
                      </span>
                   </div>
                   
                   {idx < PHASES.length - 1 && (
                      <div className="flex-1 h-0.5 mx-2 rounded overflow-hidden bg-slate-800 hidden sm:block">
                          <div className={`h-full transition-all duration-700 ease-out ${isCompleted ? 'bg-emerald-500 w-full' : 'w-0'}`}></div>
                      </div>
                   )}
                 </React.Fragment>
               )
             })}
          </div>
       </div>
    </div>
  );
}
