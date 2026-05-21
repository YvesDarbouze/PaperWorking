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
  
  const displayProjects = activeProjects.map((p) => {
    let completion = 0;
    const actionItems = p.actionItems || [];
    if (actionItems.length > 0) {
      const completedTasks = actionItems.filter((item: any) => item.completed).length;
      completion = Math.round((completedTasks / actionItems.length) * 100);
    }
    const isUp = completion > 0;
    
    return {
      id: p.id || String(Math.random()),
      name: p.propertyName || p.address || 'Unnamed Project',
      completion,
      isUp
    };
  });

  return (
    <div className="bg-[#F2F2F2] border-l border-t border-[#A5A5A5] p-6 h-full flex flex-col">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#1A1A1A] tracking-tight mb-1">Projects</h2>
          <p className="text-xs text-[#7F7F7F] font-bold uppercase tracking-wider">Assigned / To Me</p>
        </div>
        <p className="text-xs text-[#1A1A1A] font-bold uppercase tracking-wider">completion %</p>
      </div>

      <div className="flex-1 flex flex-col justify-start gap-4">
        {displayProjects.length > 0 ? (
          displayProjects.map((project) => (
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
          ))
        ) : (
          <div className="h-full flex items-center justify-center border border-dashed border-[#A5A5A5] rounded-xl p-6 text-center">
            <p className="text-[#595959] font-medium">No active projects yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
