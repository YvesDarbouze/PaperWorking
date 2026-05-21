'use client';

import React from 'react';
import { Calendar, ArrowUpRight, Video, AlertCircle } from 'lucide-react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CalendarEvent {
  id: string;
  summary?: string;
  start?: string;
  location?: string;
  htmlLink?: string;
  conferenceData?: {
    entryPoints?: Array<{ uri?: string }>;
  };
}

export default function UpcomingMeetingsWidget() {
  const { data, error, isLoading } = useSWR('/api/calendar/events', fetcher);

  const handleConnect = () => {
    window.location.href = '/api/calendar/auth';
  };

  const formatEventTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const formatEventDate = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(date);
  };

  const getPlatform = (event: CalendarEvent) => {
    if (event.location?.toLowerCase().includes('zoom') || event.summary?.toLowerCase().includes('zoom') || event.conferenceData?.entryPoints?.some((ep) => ep.uri?.includes('zoom'))) {
      return 'Zoom';
    }
    if (event.conferenceData?.entryPoints?.some((ep) => ep.uri?.includes('meet.google'))) {
      return 'Google Meet';
    }
    if (event.location?.toLowerCase().includes('teams') || event.conferenceData?.entryPoints?.some((ep) => ep.uri?.includes('teams'))) {
      return 'Microsoft Teams';
    }
    return event.location ? 'In Person / Other' : 'No Location';
  };

  return (
    <div className="bg-[#F2F2F2] border-l border-[#A5A5A5] p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-semibold text-[#1A1A1A] tracking-tight">Upcoming Meetings</h2>
        <button className="w-10 h-10 rounded-xl bg-[#FFFFFF] border border-[#A5A5A5] flex items-center justify-center hover:bg-[#CCCCCC] transition-colors">
          <Calendar className="w-5 h-5 text-[#595959]" />
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-full text-[#7F7F7F]">
            Loading...
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full text-red-500 gap-2">
            <AlertCircle className="w-6 h-6" />
            <p className="text-sm">Failed to load meetings</p>
          </div>
        )}

        {data && !data.connected && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <Calendar className="w-12 h-12 text-[#A5A5A5]" />
            <p className="text-[#595959] text-sm">Connect your Google Calendar to view upcoming meetings.</p>
            <button 
              onClick={handleConnect}
              className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
            >
              Connect Calendar
            </button>
          </div>
        )}

        {data?.connected && data.events?.length === 0 && (
          <div className="flex items-center justify-center h-full text-[#7F7F7F] text-sm">
            No upcoming meetings found.
          </div>
        )}

        {data?.connected && data.events?.length > 0 && data.events.map((msg: CalendarEvent) => {
          const platform = getPlatform(msg);
          return (
            <div key={msg.id} className="flex items-start justify-between group cursor-pointer" onClick={() => msg.htmlLink && window.open(msg.htmlLink, '_blank')}>
              <div className="w-24 flex-shrink-0">
                <p className="text-xs font-semibold text-[#7F7F7F] mb-1">{formatEventDate(msg.start)}</p>
                <p className="text-sm font-bold text-[#1A1A1A]">{formatEventTime(msg.start)}</p>
              </div>
              
              <div className="flex-1 px-4">
                <p className="text-sm font-bold text-[#1A1A1A] mb-1 line-clamp-1">{msg.summary || 'Busy'}</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                    <Video className="w-2.5 h-2.5 text-[#FFFFFF]" />
                  </div>
                  <p className="text-xs text-[#7F7F7F] font-medium">{platform}</p>
                </div>
              </div>

              <button className="w-8 h-8 rounded-lg border border-[#A5A5A5] flex items-center justify-center text-[#595959] group-hover:bg-[#1A1A1A] group-hover:text-[#FFFFFF] transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {data?.connected && data.events?.length > 0 && (
        <a href="https://calendar.google.com" target="_blank" rel="noreferrer" className="mt-8 text-sm font-medium text-[#7F7F7F] hover:text-[#1A1A1A] transition-colors flex items-center justify-center gap-2">
          See all meetings <ArrowUpRight className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}
