'use client';

import React from 'react';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Project } from '@/types/schema';

interface ProjectsProgressWidgetProps {
  projects: Project[];
}

export default function ProjectsProgressWidget({ projects }: ProjectsProgressWidgetProps) {
  // Take top 5 active projects for display
  const activeProjects = projects.filter(p => p.status !== 'Sold').slice(0, 5);
  
  // Use mock data if no real projects exist yet to show the UI
  const displayProjects = activeProjects.length > 0 ? activeProjects.map((p, i) => {
    // Generate some mock progression data for demonstration
    const completion = [71, 92, 33, 56, 79][i % 5];
    const isUp = [false, true, false, true, true][i % 5];
    return {
      id: p.id || String(i),
      name: p.propertyName || p.address || 'Unnamed Project',
      completion,
      isUp
    };
  }) : [
    { id: '1', name: '500 Green Ave', completion: 71, isUp: false },
    { id: '2', name: '162 Skidoo St', completion: 92, isUp: true },
    { id: '3', name: '513 Melissa', completion: 33, isUp: false },
    { id: '4', name: '30 5th Ave', completion: 56, isUp: true },
    { id: '5', name: '5 Dryden Ct', completion: 79, isUp: true },
  ];

  return (
    <div className="bg-[#F2F2F2] border-l border-t border-[#A5A5A5] p-6 h-full flex flex-col">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#1A1A1A] tracking-tight mb-1">Projects</h2>
          <p className="text-xs text-[#7F7F7F] font-bold uppercase tracking-wider">Assigned / To Me</p>
        </div>
        <p className="text-xs text-[#1A1A1A] font-bold uppercase tracking-wider">completion %</p>
      </div>

      <div className="flex-1 flex flex-col justify-between gap-4">
        {displayProjects.map((project) => (
          <div key={project.id} className="flex items-center justify-between group">
            <p className="text-sm font-bold text-[#1A1A1A] w-32 line-clamp-1">{project.name}</p>
            
            <div className="flex-1 px-4">
              <div className="h-2 w-full bg-[#CCCCCC] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#1A1A1A] rounded-full" 
                  style={{ width: `${project.completion}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 w-16 justify-end">
              <span className="text-sm font-medium text-[#595959]">{project.completion}%</span>
              {project.isUp ? (
                <ArrowUpCircle className="w-4 h-4 text-[#1A1A1A]" />
              ) : (
                <ArrowDownCircle className="w-4 h-4 text-[#7F7F7F]" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
