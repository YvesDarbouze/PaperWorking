'use client';

import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Bath, ChefHat, CheckCircle, Circle, ArrowUpRight, DollarSign, Star, Hammer } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   ROI Renovation Tasks — Phase 3 Module
   Task lists for specific ROI-focused areas 
   (kitchens, bathrooms, curb appeal).
   ═══════════════════════════════════════════════════════ */

type ROICategory = 'Kitchen' | 'Bathroom' | 'Curb Appeal' | 'Flooring' | 'Lighting';

interface RenovationTask {
  id: string;
  category: ROICategory;
  title: string;
  estimatedCost: number;
  estimatedROILift: number; // Percentage lift to ARV
  completed: boolean;
  priority: 'High' | 'Medium' | 'Low';
}

const CATEGORY_ICONS: Record<ROICategory, React.ReactNode> = {
  Kitchen: <ChefHat className="w-4 h-4" />,
  Bathroom: <Bath className="w-4 h-4" />,
  'Curb Appeal': <Star className="w-4 h-4" />,
  Flooring: <Hammer className="w-4 h-4" />,
  Lighting: <Star className="w-4 h-4" />,
};

const PRIORITY_STYLES: Record<RenovationTask['priority'], string> = {
  High: 'bg-red-50 text-red-700',
  Medium: 'bg-yellow-50 text-yellow-700',
  Low: 'bg-gray-50 text-gray-500',
};

const INITIAL_TASKS: RenovationTask[] = [
  { id: '1', category: 'Kitchen', title: 'Full cabinet refinishing + soft-close hardware', estimatedCost: 8500, estimatedROILift: 4.2, completed: false, priority: 'High' },
  { id: '2', category: 'Kitchen', title: 'Quartz countertop installation', estimatedCost: 4800, estimatedROILift: 3.1, completed: false, priority: 'High' },
  { id: '3', category: 'Kitchen', title: 'Stainless steel appliance package', estimatedCost: 3200, estimatedROILift: 2.5, completed: true, priority: 'Medium' },
  { id: '4', category: 'Bathroom', title: 'Master bath tile + vanity replacement', estimatedCost: 6200, estimatedROILift: 3.8, completed: false, priority: 'High' },
  { id: '5', category: 'Bathroom', title: 'Guest bath fixture update (faucets, mirror, lighting)', estimatedCost: 1800, estimatedROILift: 1.5, completed: false, priority: 'Medium' },
  { id: '6', category: 'Curb Appeal', title: 'Front door replacement + landscaping', estimatedCost: 2400, estimatedROILift: 2.8, completed: false, priority: 'Medium' },
  { id: '7', category: 'Flooring', title: 'LVP flooring throughout (1,200 sq.ft.)', estimatedCost: 5600, estimatedROILift: 3.5, completed: false, priority: 'High' },
  { id: '8', category: 'Lighting', title: 'Recessed lighting + modern fixture upgrade', estimatedCost: 1400, estimatedROILift: 1.2, completed: true, priority: 'Low' },
];

export default function ROIRenovationTasks() {
  const currentProject = useProjectStore(state => state.currentProject);
  const [tasks, setTasks] = useState<RenovationTask[]>(INITIAL_TASKS);
  const [filterCategory, setFilterCategory] = useState<ROICategory | 'All'>('All');

  const toggleComplete = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const filtered = filterCategory === 'All' ? tasks : tasks.filter(t => t.category === filterCategory);
  const totalCost = tasks.reduce((s, t) => s + t.estimatedCost, 0);
  const completedCost = tasks.filter(t => t.completed).reduce((s, t) => s + t.estimatedCost, 0);
  const totalROILift = tasks.reduce((s, t) => s + t.estimatedROILift, 0);
  const completedCount = tasks.filter(t => t.completed).length;
  const arv = currentProject?.financials?.estimatedARV || 260000;
  const projectedLift = (arv * totalROILift) / 100;

  // Group by category
  const categories = Array.from(new Set(tasks.map(t => t.category)));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-medium tracking-tight text-gray-900">ROI-Focused Renovation</h3>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {completedCount}/{tasks.length} Tasks
          </span>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs uppercase tracking-widest text-gray-400">Total Budget</p>
            <p className="text-lg font-light text-gray-900">${totalCost.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs uppercase tracking-widest text-gray-400">Spent</p>
            <p className="text-lg font-light text-gray-900">${completedCost.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
            <p className="text-xs uppercase tracking-widest text-emerald-600">Projected ARV Lift</p>
            <p className="text-lg font-light text-emerald-700">+${projectedLift.toLocaleString()}</p>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterCategory('All')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition ${
              filterCategory === 'All' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition flex items-center gap-1 ${
                filterCategory === cat ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {CATEGORY_ICONS[cat]} {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="divide-y divide-gray-50">
        {filtered.map(task => (
          <div
            key={task.id}
            className={`flex items-start justify-between px-6 py-4 transition group ${
              task.completed ? 'bg-gray-50/50 opacity-60' : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start space-x-3">
              <button
                onClick={() => toggleComplete(task.id)}
                className="mt-0.5 flex-shrink-0"
              >
                {task.completed ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition" />
                )}
              </button>
              <div>
                <p className={`text-sm font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    {CATEGORY_ICONS[task.category]} {task.category}
                  </span>
                  <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${PRIORITY_STYLES[task.priority]}`}>
                    {task.priority}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              <p className="text-sm font-mono text-gray-700">${task.estimatedCost.toLocaleString()}</p>
              <p className="text-xs text-emerald-600 flex items-center justify-end mt-0.5">
                <ArrowUpRight className="w-3 h-3 mr-0.5" />+{task.estimatedROILift}% ARV
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
