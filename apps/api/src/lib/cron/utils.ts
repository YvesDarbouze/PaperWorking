/**
 * Returns true when local time in timezone is a weekday between 9 AM and 5 PM.
 * Source: PaperWorking src/app/api/cron/send-digest/route.ts
 */
export function isBusinessHours(timezone: string, now: Date = new Date()): boolean {
  try {
    const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
    });
    const weekday = weekdayFormatter.format(now);

    if (weekday === 'Saturday' || weekday === 'Sunday') {
      return false;
    }

    const hourFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    const hour = parseInt(hourFormatter.format(now), 10);
    return hour >= 9 && hour < 17;
  } catch (err) {
    console.error('[send-digest] Error checking business hours:', err);
    return false;
  }
}

export function shouldRemindByCadence(
  cadence: string,
  lastRemindedAt: Date | null,
  now: Date,
): boolean {
  if (cadence === 'none' || !cadence) return false;
  if (!lastRemindedAt) return true;

  const diffMs = now.getTime() - lastRemindedAt.getTime();
  if (cadence === 'daily') return diffMs >= 24 * 60 * 60 * 1000;
  if (cadence === 'weekly') return diffMs >= 7 * 24 * 60 * 60 * 1000;
  return false;
}

export function parseBridgeSyncResources(resourcesParam: string | undefined): Set<string> {
  return new Set((resourcesParam ?? 'property,member,office').split(',').map((s) => s.trim().toLowerCase()));
}

export function shouldAutoDrain(drainParam: string | undefined): boolean {
  return drainParam !== 'false';
}
