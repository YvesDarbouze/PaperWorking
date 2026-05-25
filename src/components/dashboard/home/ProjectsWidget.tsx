'use client';

import React from 'react';
import { Folder, Home, Building, ChevronRight } from 'lucide-react';
import { Project } from '@/types/schema';
import { computePhaseProgress } from '@/lib/utils/projectProgress';

interface ProjectsWidgetProps {
  projects: Project[];
  onCreateProject: () => void;
  isGuest: boolean;
}

export default function ProjectsWidget({ projects, onCreateProject, isGuest }: ProjectsWidgetProps) {
  // Take up to 3 active projects for the widget
  const activeProjects = projects.filter(p => p.status !== 'Sold').slice(0, 3);

  return (
    <section className="space-y-3">
      <h3 className="font-label-md text-label-md text-on-surface flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold">
        <Folder className="text-primary w-4 h-4" />
        Active Portfolios
      </h3>
      
      {activeProjects.map((project, index) => {
        const completion = computePhaseProgress(project, project.currentPhase || 1);
        
        // Alternate styles for visual interest similar to Stitch
        const isPrimary = index % 2 === 0;
        const iconContainerClass = isPrimary 
          ? "bg-surface-container-high border-primary/20 text-primary" 
          : "bg-surface-container-high border-white/10 text-on-surface-variant";
        const badgeClass = isPrimary
          ? "bg-primary/10 text-primary border border-primary/20"
          : "bg-white/5 text-on-surface-variant border border-white/10";
        const progressBg = isPrimary ? "bg-primary luminous-glow" : "bg-on-surface-variant";

        // Calculate equity if financials are present, else dummy or default
        const value = project.financials?.estimatedCurrentValue || project.financials?.estimatedARV || 0;
        const debt = project.financials?.estimatedExistingDebt || project.financials?.loanAmount || 0;
        const equityPct = value > 0 ? Math.max(0, Math.round(((value - debt) / value) * 100)) : 0;

        return (
          <div key={project.id} className="glass-card p-4 rounded-2xl flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer">
            <div className={`w-11 h-11 rounded-lg border flex items-center justify-center flex-shrink-0 ${iconContainerClass}`}>
              {isPrimary ? <Home className="w-5 h-5" /> : <Building className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-label-md text-body-sm truncate text-on-surface font-bold">
                  {project.propertyName || project.address || 'Unnamed Project'}
                </h4>
                <span className={`px-2 py-0.5 rounded-sm text-[9px] font-black uppercase ${badgeClass}`}>
                  {project.strategyType || 'Deal'}
                </span>
              </div>
              <div className="flex items-center gap-3 font-label-sm text-[10px] text-on-surface-variant mb-2">
                <span>Equity: {equityPct}%</span>
                <span>•</span>
                <span className="truncate">{project.status || 'Active'}</span>
              </div>
              <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
                <div className={`h-full ${progressBg}`} style={{ width: `${completion}%` }}></div>
              </div>
            </div>
            <ChevronRight className="text-on-surface-variant w-5 h-5 flex-shrink-0" />
          </div>
        );
      })}

      {activeProjects.length === 0 && (
        <div className="glass-card border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center">
           <p className="font-label-md text-label-md text-on-surface-variant">No active portfolios</p>
        </div>
      )}
    </section>
  );
}
