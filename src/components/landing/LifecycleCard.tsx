import React from 'react';

interface LifecycleCardProps {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export default function LifecycleCard({ number, title, description, icon }: LifecycleCardProps) {
  return (
    <div className="flex flex-col border border-phase-1 bg-bg-surface p-8 hover:bg-dashboard transition-colors group">
      <div className="flex items-center justify-between mb-4">
        <span className="text-phase-2 font-mono text-sm tracking-tighter">0{number} //</span>
        <div className="w-8 h-8 bg-dashboard flex items-center justify-center text-phase-4 border border-phase-1 group-hover:bg-bg-surface transition-colors">
          {icon}
        </div>
      </div>
      <h3 className="text-xl font-medium text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-phase-3 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
