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
    <div className="glass-card rounded-3xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Upcoming Meetings</h2>
        <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
          <Calendar className="w-5 h-5 text-on-surface-variant" />
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-full text-on-surface-variant">
            Loading...
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full text-error gap-2">
            <AlertCircle className="w-6 h-6" />
            <p className="font-body-sm text-body-sm">Failed to load meetings</p>
          </div>
        )}

        {data && !data.connected && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-on-surface-variant" />
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-[200px]">Connect your Google Calendar to view upcoming meetings.</p>
            <button 
              onClick={handleConnect}
              className="px-6 py-2 bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:brightness-110 transition-all luminous-teal"
            >
              Connect Calendar
            </button>
          </div>
        )}

        {data?.connected && data.events?.length === 0 && (
          <div className="flex items-center justify-center h-full font-body-sm text-body-sm text-on-surface-variant">
            No upcoming meetings found.
          </div>
        )}

        {data?.connected && data.events?.length > 0 && data.events.map((msg: CalendarEvent) => {
          const platform = getPlatform(msg);
          return (
            <div key={msg.id} className="flex items-start justify-between group cursor-pointer p-3 rounded-2xl hover:bg-white/5 transition-colors -mx-3" onClick={() => msg.htmlLink && window.open(msg.htmlLink, '_blank')}>
              <div className="w-24 flex-shrink-0 pt-1">
                <p className="font-label-sm text-label-sm text-on-surface-variant opacity-80 mb-0.5">{formatEventDate(msg.start)}</p>
                <p className="font-label-md text-label-md text-on-surface">{formatEventTime(msg.start)}</p>
              </div>
              
              <div className="flex-1 px-3">
                <p className="font-label-md text-label-md text-on-surface mb-1 line-clamp-1">{msg.summary || 'Busy'}</p>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                    <Video className="w-3 h-3 text-on-surface-variant" />
                  </div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">{platform}</p>
                </div>
              </div>

              <button className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-on-surface-variant group-hover:bg-primary group-hover:text-on-primary group-hover:border-primary transition-all self-center">
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {data?.connected && data.events?.length > 0 && (
        <a href="https://calendar.google.com" target="_blank" rel="noreferrer" className="mt-6 font-label-sm text-label-sm text-primary hover:brightness-110 transition-all flex items-center justify-center gap-1.5 pt-4 border-t border-white/5">
          See all meetings <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}
