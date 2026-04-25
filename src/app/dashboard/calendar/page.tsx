'use client';

import React from 'react';
import CalendarTodo from '@/components/dashboard/CalendarTodo';

export default function CalendarPage() {
  return (
    <div className="p-8 max-w-[1400px] mx-auto h-[calc(100vh-64px)]">
      <header className="mb-10">
        <h1 className="text-4xl font-light tracking-tight text-text-primary mb-2">Asset Timeline</h1>
        <p className="text-text-secondary font-medium">Coordinate logistics, milestones, and tactical to-dos across your portfolio.</p>
      </header>
      
      <div className="h-[calc(100%-120px)]">
        <CalendarTodo />
      </div>
    </div>
  );
}
