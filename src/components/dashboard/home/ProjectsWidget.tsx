'use client';

import React from 'react';
import { Plus, CheckCircle2, Clock, MoreHorizontal } from 'lucide-react';
import { Project } from '@/types/schema';

interface ProjectsWidgetProps {
  projects: Project[];
  onCreateProject: () => void;
  isGuest: boolean;
}

export default function ProjectsWidget({ projects, onCreateProject, isGuest }: ProjectsWidgetProps) {
  // Sort projects by some metric, for now just take the first two active ones
  const activeProjects = projects.filter(p => p.status !== 'Sold').slice(0, 2);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex-1 grid grid-cols-2 gap-4">
        {activeProjects.map((project, index) => {
          // Calculate a mock completion percentage based on status
          let completion = 0;
          switch (project.status?.toLowerCase()) {
            case 'lead': completion = 25; break;
            case 'under contract': completion = 50; break;
            case 'renovating': completion = 75; break;
            case 'listed': completion = 90; break;
            case 'sold': completion = 100; break;
            default: completion = 30; break;
          }

          // Alternating grayscale styling for visual interest
          const bgClass = index === 0 
            ? "bg-gradient-to-br from-[#F2F2F2] to-[#CCCCCC] border-[#A5A5A5]"
            : "bg-gradient-to-br from-[#FFFFFF] to-[#E5E5E5] border-[#CCCCCC]";

          return (
            <div key={project.id} className={`${bgClass} border rounded-2xl p-6 relative flex flex-col justify-end overflow-hidden shadow-sm`}>
              <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#FFFFFF] border border-[#A5A5A5] flex items-center justify-center">
                {index === 0 ? <Clock className="w-4 h-4 text-[#595959]" /> : <CheckCircle2 className="w-4 h-4 text-[#595959]" />}
              </div>
              
              <div className="mb-2">
                <p className="text-sm font-semibold text-[#595959] uppercase tracking-wider mb-1">Project</p>
                <h3 className="text-xl font-bold text-[#1A1A1A] leading-tight line-clamp-2">
                  {project.propertyName || project.address || 'Unnamed Project'}
                </h3>
              </div>
              
              <div className="mt-4">
                <p className="text-4xl font-black text-[#1A1A1A] tracking-tighter">{completion}%</p>
                <p className="text-xs text-[#7F7F7F] font-semibold mt-1">Avg. Completed</p>
              </div>
            </div>
          );
        })}

        {activeProjects.length === 0 && (
          <div className="col-span-2 bg-[#F2F2F2] border border-dashed border-[#A5A5A5] rounded-2xl p-6 flex flex-col items-center justify-center text-center">
             <p className="text-[#595959] font-medium">No active projects to display</p>
          </div>
        )}
      </div>

      {!isGuest && (
        <button 
          onClick={onCreateProject}
          className="w-full bg-[#FFFFFF] border border-[#A5A5A5] hover:bg-[#F2F2F2] rounded-2xl p-4 flex items-center justify-center gap-3 transition-colors shadow-sm"
        >
          <Plus className="w-6 h-6 text-[#1A1A1A]" />
          <span className="text-lg font-bold text-[#1A1A1A]">New Project</span>
          <div className="absolute right-6">
             <MoreHorizontal className="w-6 h-6 text-[#A5A5A5]" />
          </div>
        </button>
      )}
    </div>
  );
}
