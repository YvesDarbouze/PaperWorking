'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, CheckSquare, Plus, Clock, ChevronRight, ChevronLeft } from 'lucide-react';

const MOCK_TODOS = [
  { id: '1', task: 'Review Inspection Report - 452 Oak St', priority: 'High', dueDate: 'Today' },
  { id: '2', task: 'Follow up with Hard Money Lender', priority: 'Medium', dueDate: 'Tomorrow' },
  { id: '3', task: 'Finalize Kitchen Design', priority: 'Medium', dueDate: 'Oct 24' },
  { id: '4', task: 'Appraisal Booking', priority: 'High', dueDate: 'Oct 25' },
];

export default function CalendarTodo() {
  const [activeTab, setActiveTab] = useState<'CALENDAR' | 'TODOS'>('TODOS');

  return (
    <div className="flex flex-col h-full bg-bg-surface border border-border-accent overflow-hidden">
      <header className="p-6 border-b border-border-accent flex justify-between items-center bg-bg-primary">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveTab('TODOS')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'TODOS' ? 'text-text-primary border-b-2 border-pw-accent' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Tactical To-Dos
          </button>
          <button 
            onClick={() => setActiveTab('CALENDAR')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'CALENDAR' ? 'text-text-primary border-b-2 border-pw-accent' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Asset Timeline
          </button>
        </div>
        <button className="p-2 bg-pw-black text-pw-white hover:bg-pw-accent transition-all">
          <Plus className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'TODOS' ? (
          <div className="space-y-4">
            {MOCK_TODOS.map((todo) => (
              <div key={todo.id} className="group p-4 bg-bg-primary border border-border-accent flex items-center gap-4 hover:border-border-accent transition-all">
                <button className="w-5 h-5 border-2 border-pw-muted rounded-none group-hover:border-pw-accent transition-all" />
                <div className="flex-1">
                  <p className="text-xs font-black text-text-primary uppercase tracking-tight">{todo.task}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${todo.priority === 'High' ? 'text-red-500' : 'text-text-secondary'}`}>{todo.priority}</span>
                    <span className="text-[10px] text-text-secondary font-mono flex items-center">
                      <Clock className="w-2.5 h-2.5 mr-1" />
                      {todo.dueDate}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-secondary opacity-0 group-hover:opacity-100 transition-all" />
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-sm font-black text-text-primary uppercase tracking-widest">October 2026</h4>
              <div className="flex gap-2">
                <button className="p-1 hover:bg-bg-primary transition-all"><ChevronLeft className="w-4 h-4" /></button>
                <button className="p-1 hover:bg-bg-primary transition-all"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['S','M','T','W','T','F','S'].map(d => (
                <div key={d} className="text-center text-[10px] font-black text-text-secondary uppercase py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-200 border border-border-accent flex-1 min-h-[300px]">
              {Array.from({ length: 31 }).map((_, i) => (
                <div key={i} className="bg-bg-surface p-2 min-h-[60px] relative group hover:bg-bg-primary transition-all">
                  <span className="text-[10px] font-mono text-text-secondary">{i + 1}</span>
                  {i === 18 && (
                   <div className="mt-1 w-full h-1 bg-pw-accent" title="Closing Date" />
                  )}
                  {i === 24 && (
                   <div className="mt-1 w-full h-1 bg-pw-black" title="Inspection" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
