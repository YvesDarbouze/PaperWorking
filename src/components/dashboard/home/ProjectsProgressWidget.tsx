'use client';

import React from 'react';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Project } from '@/types/schema';
import { computePhaseProgress } from '@/lib/utils/projectProgress';

interface ProjectsProgressWidgetProps {
  projects: Project[];
}

export default function ProjectsProgressWidget({ projects }: ProjectsProgressWidgetProps) {
  // Take top 5 active projects for display
  const activeProjects = projects.filter(p => p.status !== 'Sold').slice(0, 5);
  
  const displayProjects = activeProjects.map((p) => {
    const completion = computePhaseProgress(p, p.currentPhase || 1);
    const isUp = completion > 0;
    
    return {
      id: p.id || String(Math.random()),
      name: p.propertyName || p.address || 'Unnamed Project',
      completion,
      isUp
    };
  });

  return (
    <div className="glass-card rounded-3xl p-6 h-full flex flex-col">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight mb-1">Projects</h2>
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest opacity-80">Assigned / To Me</p>
        </div>
        <p className="font-label-sm text-label-sm text-on-surface uppercase tracking-widest">Completion</p>
      </div>

      <div className="flex-1 flex flex-col justify-start gap-6">
        {displayProjects.length > 0 ? (
          displayProjects.map((project) => (
            <div key={project.id} className="flex items-center justify-between group">
              <p className="font-label-md text-label-md text-on-surface w-32 line-clamp-1">{project.name}</p>
              
              <div className="flex-1 px-4">
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full luminous-teal transition-all duration-500 ease-out" 
                    style={{ width: `${project.completion}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 w-16 justify-end">
                <span className="font-label-md text-label-md text-on-surface-variant">{project.completion}%</span>
                {project.isUp ? (
                  <ArrowUpCircle className="w-4 h-4 text-primary" />
                ) : (
                  <ArrowDownCircle className="w-4 h-4 text-on-surface-variant" />
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex items-center justify-center border border-dashed border-white/10 rounded-2xl p-6 text-center">
            <p className="font-body-sm text-body-sm text-on-surface-variant">No active projects yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
