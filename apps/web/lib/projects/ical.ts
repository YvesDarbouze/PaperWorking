import type { ProjectScheduleEvent } from './types';
import { PHASE_LABELS } from './phase-utils';

const CRLF = '\r\n';
const MAX_LINE_OCTETS = 75;

/** RFC 5545 §3.3.11 TEXT escaping. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * RFC 5545 §3.1 line folding: at most 75 octets per physical line, continuation
 * lines start with a single space. Never splits a multi-byte UTF-8 character.
 */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= MAX_LINE_OCTETS) return line;

  const parts: string[] = [];
  let current = '';
  let currentOctets = 0;
  let limit = MAX_LINE_OCTETS;
  for (const char of line) {
    const charOctets = encoder.encode(char).length;
    if (currentOctets + charOctets > limit) {
      parts.push(current);
      current = '';
      currentOctets = 0;
      limit = MAX_LINE_OCTETS - 1; // leading space of the continuation line
    }
    current += char;
    currentOctets += charOctets;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

/** Day after a YYYY-MM-DD date (all-day DTEND is exclusive). */
export function nextIsoDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

function compactDate(date: string): string {
  return date.replace(/-/g, '');
}

function toIcsUtc(isoInstant: string): string | null {
  const instant = new Date(isoInstant);
  if (Number.isNaN(instant.getTime())) return null;
  return `${instant.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

/**
 * DTSTAMP must not change between exports of unchanged data, so it comes from
 * the event's creation time, or the event date itself for derived entries.
 */
function stableDtstamp(evt: ProjectScheduleEvent & { createdAt?: string }): string {
  return (evt.createdAt && toIcsUtc(evt.createdAt)) || `${compactDate(evt.date)}T000000Z`;
}

function describe(evt: ProjectScheduleEvent): string {
  const lines: string[] = [];
  if (evt.notes) lines.push(evt.notes);
  if (evt.source === 'contingency') {
    if (evt.status) lines.push(`Contingency status: ${evt.status}`);
    if (evt.responsibleParty) lines.push(`Responsible: ${evt.responsibleParty}`);
  }
  lines.push(`Phase: ${PHASE_LABELS[evt.phase] ?? evt.phase}`);
  return lines.join('\n');
}

export function buildProjectIcs(input: {
  calendarName: string;
  events: Array<ProjectScheduleEvent & { createdAt?: string }>;
}): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PaperWorking//REIL Project Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(input.calendarName)}`,
  ];

  for (const evt of input.events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${evt.id}@paperworking.com`,
      `DTSTAMP:${stableDtstamp(evt)}`,
      `DTSTART;VALUE=DATE:${compactDate(evt.date)}`,
      `DTEND;VALUE=DATE:${compactDate(nextIsoDate(evt.date))}`,
      `SUMMARY:${escapeIcsText(`${evt.isHardDate ? '[CRITICAL] ' : ''}${evt.title}`)}`,
      `DESCRIPTION:${escapeIcsText(describe(evt))}`,
      `CATEGORIES:${escapeIcsText(evt.category.toUpperCase())}`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldIcsLine).join(CRLF) + CRLF;
}
