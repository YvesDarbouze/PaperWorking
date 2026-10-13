'use client';

import { useMemo } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

export default function BasecampMiniCalendar({
  events,
  selectedDate,
  onSelectDate,
}: {
  events: Array<{ date: string; isHardDate?: boolean; title: string }>;
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
}) {
  // Determine reference month based on first event or current date
  const displayDate = useMemo(() => {
    if (events.length > 0 && events[0]?.date) {
      const d = new Date(events[0].date);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }, [events]);

  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();

  const monthName = displayDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Event dates lookup set
  const eventDatesMap = useMemo(() => {
    const map = new Map<string, { isHardDate: boolean; count: number }>();
    for (const ev of events) {
      if (!ev.date) continue;
      const key = ev.date.split('T')[0]!;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (ev.isHardDate) existing.isHardDate = true;
      } else {
        map.set(key, { isHardDate: Boolean(ev.isHardDate), count: 1 });
      }
    }
    return map;
  }, [events]);

  // Calendar grid math
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun

  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarCells = useMemo(() => {
    const cells: Array<{
      dayNumber: number;
      dateString: string;
      isCurrentMonth: boolean;
      hasEvent: boolean;
      isHardDate: boolean;
    }> = [];

    // Prev month days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      const dateString = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        dayNumber: day,
        dateString,
        isCurrentMonth: false,
        hasEvent: eventDatesMap.has(dateString),
        isHardDate: Boolean(eventDatesMap.get(dateString)?.isHardDate),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const evInfo = eventDatesMap.get(dateString);
      cells.push({
        dayNumber: d,
        dateString,
        isCurrentMonth: true,
        hasEvent: Boolean(evInfo),
        isHardDate: Boolean(evInfo?.isHardDate),
      });
    }

    // Next month padding to fill grid to 35 or 42 cells
    const remaining = 35 - cells.length;
    if (remaining > 0) {
      for (let n = 1; n <= remaining; n++) {
        const m = month === 11 ? 1 : month + 2;
        const y = month === 11 ? year + 1 : year;
        const dateString = `${y}-${String(m).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
        cells.push({
          dayNumber: n,
          dateString,
          isCurrentMonth: false,
          hasEvent: eventDatesMap.has(dateString),
          isHardDate: Boolean(eventDatesMap.get(dateString)?.isHardDate),
        });
      }
    }

    return cells;
  }, [year, month, daysInMonth, firstDayIndex, daysInPrevMonth, eventDatesMap]);

  const weekHeaders = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <div className="w-full select-none rounded-none border border-border bg-card p-3">
      {/* Calendar Header Month Title */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
        <h4 className="text-xs font-semibold text-foreground font-mono uppercase tracking-wider">
          {monthName}
        </h4>
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="text-[10px] font-mono">
            {events.length} event{events.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Weekday Row */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono font-medium text-muted-foreground pb-1">
        {weekHeaders.map((w) => (
          <div key={w} className="py-0.5">
            {w}
          </div>
        ))}
      </div>

      {/* Day Cells Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {calendarCells.map((cell, idx) => {
          const isSelected = selectedDate === cell.dateString;
          return (
            <button
              key={`${cell.dateString}-${idx}`}
              type="button"
              onClick={() => onSelectDate?.(cell.dateString)}
              className={`relative flex flex-col items-center justify-center h-8 rounded-none text-xs transition min-h-[32px] ${
                !cell.isCurrentMonth
                  ? 'text-muted-foreground/40'
                  : isSelected
                  ? 'bg-foreground text-background font-bold'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <span className={cell.hasEvent ? 'font-bold' : 'font-normal'}>{cell.dayNumber}</span>
              {cell.hasEvent && (
                <span
                  className={`absolute bottom-1 h-1 w-1 rounded-full ${
                    cell.isHardDate ? 'bg-destructive' : 'bg-primary'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
