'use client';

import { useState, useMemo } from 'react';
import {
  Calendar, Clock, MapPin, User, ChevronLeft, ChevronRight,
  Loader2, AlertCircle, Home, Eye,
} from 'lucide-react';
import { useOpenHouseCalendar } from '@/hooks/useOpenHouseCalendar';
import type { BridgeOpenHouseResult } from '@/types/bridge';

/* ═══════════════════════════════════════════════════════════════
   Open House Calendar — Upcoming Open House Events

   Data:  Bridge Interactive /api/bridge/openhouses
   Style: Antigravity v2 · FinTech-Sharp · Grayscale
   ═══════════════════════════════════════════════════════════════ */

/** Group open houses by date for calendar rendering */
function groupByDate(openHouses: BridgeOpenHouseResult[]): Record<string, BridgeOpenHouseResult[]> {
  const groups: Record<string, BridgeOpenHouseResult[]> = {};
  for (const oh of openHouses) {
    const key = oh.date ?? 'Unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(oh);
  }
  return groups;
}

/** Format a date string like "2026-05-11" into "Sun, May 11" */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** Format time like "13:00:00" → "1:00 PM" */
function formatTime(timeStr: string | null): string {
  if (!timeStr) return '—';
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  } catch {
    return timeStr;
  }
}

/** Check if a date is today */
function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
}

/** Check if a date is tomorrow */
function isTomorrow(dateStr: string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dateStr === tomorrow.toISOString().split('T')[0];
}

function DateLabel({ dateStr }: { dateStr: string }) {
  const label = isToday(dateStr)
    ? 'Today'
    : isTomorrow(dateStr)
    ? 'Tomorrow'
    : formatDate(dateStr);

  return (
    <div className="flex items-center gap-2 mb-3">
      <span
        className={`text-[10px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded
          ${isToday(dateStr) ? 'bg-[#595959] text-white' : 'bg-[#F2F2F2] text-[#7F7F7F]'}`}
      >
        {label}
      </span>
      {!isToday(dateStr) && !isTomorrow(dateStr) && (
        <span className="text-[10px] text-[#A5A5A5]">{dateStr}</span>
      )}
    </div>
  );
}

function OpenHouseCard({ oh }: { oh: BridgeOpenHouseResult }) {
  return (
    <article
      className="bg-[#FFFFFF] border border-[#A5A5A5]/50 rounded-xl p-4
                 hover:border-[#595959] hover:shadow-sm transition-all duration-300"
      id={`open-house-${oh.openHouseKey}`}
    >
      <div className="flex items-start gap-3">
        {/* Time block */}
        <div className="flex-shrink-0 w-[72px] text-center py-2 px-1 rounded-lg bg-[#F2F2F2] border border-[#A5A5A5]/20">
          <p className="text-xs font-bold text-[#595959]">
            {formatTime(oh.startTime)}
          </p>
          <p className="text-[9px] text-[#A5A5A5] mt-0.5">
            to {formatTime(oh.endTime)}
          </p>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          {/* Listing ID */}
          {oh.listingId && (
            <div className="flex items-center gap-1 mb-1.5">
              <Home className="w-3 h-3 text-[#A5A5A5]" aria-hidden="true" />
              <span className="text-xs font-semibold text-[#595959] tracking-tight truncate">
                MLS# {oh.listingId}
              </span>
            </div>
          )}

          {/* Type badge */}
          {oh.type && (
            <span className="inline-block text-[9px] font-bold uppercase tracking-widest
                             bg-[#F2F2F2] text-[#7F7F7F] px-2 py-0.5 rounded mb-2">
              {oh.type}
            </span>
          )}

          {/* Remarks */}
          {oh.remarks && (
            <p className="text-xs text-[#7F7F7F] leading-relaxed line-clamp-2">
              {oh.remarks}
            </p>
          )}

          {/* Showing Agent */}
          {oh.showingAgent && (
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[#A5A5A5]/15">
              <User className="w-3 h-3 text-[#A5A5A5]" aria-hidden="true" />
              <span className="text-[10px] text-[#7F7F7F]">
                Hosted by <strong className="text-[#595959]">{oh.showingAgent}</strong>
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/* ─── Main Component ─── */

export default function OpenHouseCalendar() {
  const { openHouses, loading, error, fetchOpenHouses } = useOpenHouseCalendar();

  // Pagination for dates
  const [visibleDates, setVisibleDates] = useState(7);

  const grouped = useMemo(() => groupByDate(openHouses), [openHouses]);
  const sortedDates = useMemo(
    () => Object.keys(grouped).sort(),
    [grouped]
  );

  const displayDates = sortedDates.slice(0, visibleDates);
  const hasMore = sortedDates.length > visibleDates;

  return (
    <section
      className="bg-[#FFFFFF] border border-[#A5A5A5]/50 rounded-xl overflow-hidden"
      aria-label="Open House Calendar"
      id="open-house-calendar"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#A5A5A5]/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#F2F2F2] flex items-center justify-center">
              <Calendar className="w-4 h-4 text-[#7F7F7F]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#595959] tracking-tight">Open Houses</h2>
              <p className="text-[10px] text-[#A5A5A5]">
                {openHouses.length > 0
                  ? `${openHouses.length} upcoming event${openHouses.length === 1 ? '' : 's'}`
                  : 'Upcoming events'}
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchOpenHouses()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F2F2] border border-[#A5A5A5]/30
                       rounded-lg text-[10px] font-bold uppercase tracking-widest text-[#7F7F7F]
                       hover:bg-[#A5A5A5]/20 transition-colors disabled:opacity-50"
            aria-label="Refresh open houses"
          >
            <Eye className="w-3 h-3" />
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[560px] overflow-y-auto no-scrollbar">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 text-[#A5A5A5] animate-spin" />
            <span className="text-xs text-[#7F7F7F] ml-2">Loading events…</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-6 h-6 text-[#A5A5A5] mb-2" />
            <p className="text-xs text-[#7F7F7F]">{error}</p>
            <button
              onClick={() => fetchOpenHouses()}
              className="mt-3 text-[10px] font-bold uppercase tracking-widest text-[#595959]
                         hover:underline"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && openHouses.length === 0 && (
          <div className="text-center py-16">
            <Calendar className="w-8 h-8 text-[#A5A5A5] mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#595959]">No upcoming open houses</p>
            <p className="text-xs text-[#7F7F7F] mt-1 max-w-[220px] mx-auto leading-relaxed">
              Open house events from MLS listings will appear here when available
            </p>
          </div>
        )}

        {!loading && !error && displayDates.length > 0 && (
          <div className="space-y-6">
            {displayDates.map((dateStr) => (
              <div key={dateStr}>
                <DateLabel dateStr={dateStr} />
                <div className="space-y-2">
                  {grouped[dateStr].map((oh) => (
                    <OpenHouseCard key={oh.openHouseKey} oh={oh} />
                  ))}
                </div>
              </div>
            ))}

            {/* Load more */}
            {hasMore && (
              <button
                onClick={() => setVisibleDates((v) => v + 7)}
                className="w-full py-3 text-xs font-bold uppercase tracking-widest text-[#7F7F7F]
                           bg-[#F2F2F2] rounded-lg hover:bg-[#A5A5A5]/20 transition-colors"
              >
                Show More Dates ({sortedDates.length - visibleDates} remaining)
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
