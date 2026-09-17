/**
 * Contractual Deadline & Timezone Semantics Engine.
 *
 * Implements real estate investment lifecycle (REIL) deadline rules:
 * - Deterministic IANA timezone derivation from property address.
 * - Dual storage representation: absolute UTC instant and local contract representation.
 * - Calculation modes: 'calendar_days', 'business_days', 'exact_hours'.
 * - Wall-clock preservation across Daylight Saving Time (DST) boundaries (Spring Forward / Fall Back)
 *   and month ends.
 */

export type DeadlineCalculationType = 'calendar_days' | 'business_days' | 'exact_hours';

export interface ContractualDeadlineInput {
  baseDate: string | Date; // Anchor date (e.g., PSA execution date, contingency deadline)
  offsetValue: number; // e.g., 3 days, 10 days, 48 hours
  offsetType: DeadlineCalculationType;
  deadlineTime?: string; // Contractual wall-clock time, defaults to '17:00:00' (5:00 PM local)
  ianaTimezone?: string; // e.g. 'America/New_York', 'America/Chicago'
}

export interface LocalContractRepresentation {
  localDate: string; // 'YYYY-MM-DD'
  localTime: string; // 'HH:mm:ss'
  timezone: string; // 'America/New_York'
  formatted: string; // 'YYYY-MM-DD HH:mm:ss [America/New_York]'
}

export interface ContractualDeadlineResult {
  utcInstant: Date;
  utcIso: string;
  localRepresentation: LocalContractRepresentation;
  offsetType: DeadlineCalculationType;
  offsetValue: number;
}

// ── State to IANA Timezone Mapping ──────────────────────────────────────────

const STATE_TIMEZONE_MAP: Record<string, string> = {
  // Eastern
  CT: 'America/New_York',
  DE: 'America/New_York',
  FL: 'America/New_York',
  GA: 'America/New_York',
  IN: 'America/Indiana/Indianapolis',
  KY: 'America/New_York',
  ME: 'America/New_York',
  MD: 'America/New_York',
  MA: 'America/New_York',
  MI: 'America/Detroit',
  NH: 'America/New_York',
  NJ: 'America/New_York',
  NY: 'America/New_York',
  NC: 'America/New_York',
  OH: 'America/New_York',
  PA: 'America/New_York',
  RI: 'America/New_York',
  SC: 'America/New_York',
  VT: 'America/New_York',
  VA: 'America/New_York',
  WV: 'America/New_York',
  DC: 'America/New_York',

  // Central
  AL: 'America/Chicago',
  AR: 'America/Chicago',
  IL: 'America/Chicago',
  IA: 'America/Chicago',
  KS: 'America/Chicago',
  LA: 'America/Chicago',
  MN: 'America/Chicago',
  MS: 'America/Chicago',
  MO: 'America/Chicago',
  NE: 'America/Chicago',
  ND: 'America/Chicago',
  OK: 'America/Chicago',
  SD: 'America/Chicago',
  TN: 'America/Chicago',
  TX: 'America/Chicago',
  WI: 'America/Chicago',

  // Mountain
  CO: 'America/Denver',
  ID: 'America/Boise',
  MT: 'America/Denver',
  NM: 'America/Denver',
  UT: 'America/Denver',
  WY: 'America/Denver',

  // Mountain (No DST)
  AZ: 'America/Phoenix',

  // Pacific
  CA: 'America/Los_Angeles',
  NV: 'America/Los_Angeles',
  OR: 'America/Los_Angeles',
  WA: 'America/Los_Angeles',

  // Alaska & Hawaii
  AK: 'America/Anchorage',
  HI: 'America/Honolulu',
};

const STATE_NAME_MAP: Record<string, string> = {
  texas: 'TX',
  california: 'CA',
  florida: 'FL',
  'new york': 'NY',
  illinois: 'IL',
  georgia: 'GA',
  arizona: 'AZ',
  colorado: 'CO',
  washington: 'WA',
  pennsylvania: 'PA',
  ohio: 'OH',
  massachusetts: 'MA',
  tennessee: 'TN',
  nevada: 'NV',
  oregon: 'OR',
  michigan: 'MI',
  utah: 'UT',
  virginia: 'VA',
  'north carolina': 'NC',
};

/**
 * Derives the canonical IANA timezone from a property address string.
 * Defaults to 'America/New_York' if address does not contain identifiable US state.
 */
export function deriveIanaTimezoneFromAddress(address: string): string {
  if (!address || typeof address !== 'string') {
    return 'America/New_York';
  }

  // 1. Search for 2-letter state postal code before zip code or near end: e.g. "Austin, TX 78704" or "Austin, TX"
  const stateRegex = /\b([A-Z]{2})\b(?:\s+\d{5}(?:-\d{4})?)?$/i;
  const match = address.trim().match(stateRegex);
  if (match && match[1]) {
    const code = match[1].toUpperCase();
    if (STATE_TIMEZONE_MAP[code]) {
      return STATE_TIMEZONE_MAP[code];
    }
  }

  // 2. Search anywhere for ", <STATE> " or ", <STATE>,"
  const commaStateRegex = /,\s*([A-Za-z]{2})\b/;
  const commaMatch = address.match(commaStateRegex);
  if (commaMatch && commaMatch[1]) {
    const code = commaMatch[1].toUpperCase();
    if (STATE_TIMEZONE_MAP[code]) {
      return STATE_TIMEZONE_MAP[code];
    }
  }

  // 3. Search for full state names
  const lower = address.toLowerCase();
  for (const [name, code] of Object.entries(STATE_NAME_MAP)) {
    if (lower.includes(name)) {
      return STATE_TIMEZONE_MAP[code];
    }
  }

  return 'America/New_York';
}

/**
 * Checks if a given Date represents a weekend in local time.
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6;
}

/**
 * Adds business days (Monday-Friday) to a local calendar date.
 */
export function addBusinessDaysToLocalDate(
  year: number,
  month: number, // 1-12
  day: number,
  businessDays: number,
): { year: number; month: number; day: number } {
  // Work with a pure calendar date at noon to avoid boundary shifts
  const current = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  let remaining = businessDays;

  while (remaining > 0) {
    current.setUTCDate(current.getUTCDate() + 1);
    const dayOfWeek = current.getUTCDay();
    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      remaining--;
    }
  }

  return {
    year: current.getUTCFullYear(),
    month: current.getUTCMonth() + 1,
    day: current.getUTCDate(),
  };
}

/**
 * Adds calendar days to a local calendar date.
 */
export function addCalendarDaysToLocalDate(
  year: number,
  month: number, // 1-12
  day: number,
  calendarDays: number,
): { year: number; month: number; day: number } {
  const current = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  current.setUTCDate(current.getUTCDate() + calendarDays);
  return {
    year: current.getUTCFullYear(),
    month: current.getUTCMonth() + 1,
    day: current.getUTCDate(),
  };
}

/**
 * Extracts local date parts { year, month, day, hour, minute, second } in a given IANA timezone.
 */
export function getLocalDateParts(
  date: Date,
  timeZone: string,
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      partMap[part.type] = parseInt(part.value, 10);
    }
  }

  // Handle midnight 24 hour formatting in some Intl implementations
  let hour = partMap.hour ?? 0;
  if (hour === 24) hour = 0;

  return {
    year: partMap.year ?? date.getUTCFullYear(),
    month: partMap.month ?? date.getUTCMonth() + 1,
    day: partMap.day ?? date.getUTCDate(),
    hour,
    minute: partMap.minute ?? 0,
    second: partMap.second ?? 0,
  };
}

/**
 * Converts a contractual local wall-clock date and time in an IANA timezone
 * into the exact UTC Date instant.
 *
 * Preserves contractual wall-clock intent across DST boundaries (e.g., 5:00 PM
 * is guaranteed to be 5:00 PM local time).
 */
export function createUtcInstantFromLocalWallClock(
  year: number,
  month: number,
  day: number,
  timeStr: string, // 'HH:mm' or 'HH:mm:ss'
  timeZone: string,
): Date {
  const [hourStr, minStr = '00', secStr = '00'] = timeStr.split(':');
  const targetHour = parseInt(hourStr, 10);
  const targetMin = parseInt(minStr, 10);
  const targetSec = parseInt(secStr, 10);

  // Initial approximation in UTC
  let guess = new Date(Date.UTC(year, month - 1, day, targetHour, targetMin, targetSec));

  // Iteratively converge to match local parts in the target timezone
  // This cleanly handles DST offsets (e.g. UTC-4 vs UTC-5)
  for (let i = 0; i < 3; i++) {
    const local = getLocalDateParts(guess, timeZone);
    const localDateAsUtc = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second,
    );
    const targetDateAsUtc = Date.UTC(year, month - 1, day, targetHour, targetMin, targetSec);
    const diffMs = targetDateAsUtc - localDateAsUtc;

    if (diffMs === 0) {
      break;
    }
    guess = new Date(guess.getTime() + diffMs);
  }

  return guess;
}

/**
 * Computes a contractual deadline with delivery semantics:
 * - calendar-days: Adds N calendar days and pins to local deadlineTime.
 * - business-days: Adds N weekdays (skipping weekends) and pins to local deadlineTime.
 * - exact-hours: Applies an exact millisecond offset from the base date instant.
 */
export function computeContractualDeadline(
  input: ContractualDeadlineInput,
): ContractualDeadlineResult {
  const base = input.baseDate instanceof Date ? input.baseDate : new Date(input.baseDate);
  if (Number.isNaN(base.getTime())) {
    throw new Error(`Invalid baseDate provided: ${String(input.baseDate)}`);
  }

  const timeZone = input.ianaTimezone || 'America/New_York';
  const deadlineTime = input.deadlineTime || '17:00:00';

  if (input.offsetType === 'exact_hours') {
    // Exact hour offset from the base instant
    const offsetMs = input.offsetValue * 3600 * 1000;
    const targetInstant = new Date(base.getTime() + offsetMs);
    const parts = getLocalDateParts(targetInstant, timeZone);

    const pad = (n: number) => String(n).padStart(2, '0');
    const localDate = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
    const localTime = `${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;

    return {
      utcInstant: targetInstant,
      utcIso: targetInstant.toISOString(),
      localRepresentation: {
        localDate,
        localTime,
        timezone: timeZone,
        formatted: `${localDate} ${localTime} [${timeZone}]`,
      },
      offsetType: 'exact_hours',
      offsetValue: input.offsetValue,
    };
  }

  // For calendar_days and business_days, extract the local date of base in target timezone
  const baseLocal = getLocalDateParts(base, timeZone);

  let targetDate: { year: number; month: number; day: number };
  if (input.offsetType === 'business_days') {
    targetDate = addBusinessDaysToLocalDate(
      baseLocal.year,
      baseLocal.month,
      baseLocal.day,
      input.offsetValue,
    );
  } else {
    // calendar_days
    targetDate = addCalendarDaysToLocalDate(
      baseLocal.year,
      baseLocal.month,
      baseLocal.day,
      input.offsetValue,
    );
  }

  const utcInstant = createUtcInstantFromLocalWallClock(
    targetDate.year,
    targetDate.month,
    targetDate.day,
    deadlineTime,
    timeZone,
  );

  const pad = (n: number) => String(n).padStart(2, '0');
  const localDate = `${targetDate.year}-${pad(targetDate.month)}-${pad(targetDate.day)}`;
  const localTime = deadlineTime.length === 5 ? `${deadlineTime}:00` : deadlineTime;

  return {
    utcInstant,
    utcIso: utcInstant.toISOString(),
    localRepresentation: {
      localDate,
      localTime,
      timezone: timeZone,
      formatted: `${localDate} ${localTime} [${timeZone}]`,
    },
    offsetType: input.offsetType,
    offsetValue: input.offsetValue,
  };
}
