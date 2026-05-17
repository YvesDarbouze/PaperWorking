'use client';

import React from 'react';
import { Calendar, ArrowUpRight } from 'lucide-react';

const MOCK_MESSAGES = [
  { id: 1, date: 'Tue, 11 Jul', time: '08:15 am', title: 'Quick Daily Meeting', platform: 'Zoom' },
  { id: 2, date: 'Tue, 11 Jul', time: '09:30 pm', title: 'John Onboarding', platform: 'Google Meet' },
  { id: 3, date: 'Tue, 12 Jul', time: '02:30 pm', title: 'Call With a New Team', platform: 'Google Meet' },
  { id: 4, date: 'Tue, 15 Jul', time: '04:00 pm', title: 'Lead Designers Event', platform: 'Zoom' },
];

export default function MessagesWidget() {
  return (
    <div className="bg-[#F2F2F2] border-l border-[#A5A5A5] p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-semibold text-[#1A1A1A] tracking-tight">My Messages</h2>
        <button className="w-10 h-10 rounded-xl bg-[#FFFFFF] border border-[#A5A5A5] flex items-center justify-center hover:bg-[#CCCCCC] transition-colors">
          <Calendar className="w-5 h-5 text-[#595959]" />
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-6">
        {MOCK_MESSAGES.map((msg) => (
          <div key={msg.id} className="flex items-start justify-between group cursor-pointer">
            <div className="w-24 flex-shrink-0">
              <p className="text-xs font-semibold text-[#7F7F7F] mb-1">{msg.date}</p>
              <p className="text-sm font-bold text-[#1A1A1A]">{msg.time}</p>
            </div>
            
            <div className="flex-1 px-4">
              <p className="text-sm font-bold text-[#1A1A1A] mb-1 line-clamp-1">{msg.title}</p>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                  <span className="text-[8px] text-[#FFFFFF]">🎥</span>
                </div>
                <p className="text-xs text-[#7F7F7F] font-medium">{msg.platform}</p>
              </div>
            </div>

            <button className="w-8 h-8 rounded-lg border border-[#A5A5A5] flex items-center justify-center text-[#595959] group-hover:bg-[#1A1A1A] group-hover:text-[#FFFFFF] transition-colors">
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <button className="mt-8 text-sm font-medium text-[#7F7F7F] hover:text-[#1A1A1A] transition-colors flex items-center justify-center gap-2">
        See all meetings <ArrowUpRight className="w-4 h-4" />
      </button>
    </div>
  );
}
