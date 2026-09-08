/**
 * Funding deadline countdown calculation and human-readable formatting.
 */
export interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  formatted: string;
  isExpired: boolean;
  urgency: 'critical' | 'warning' | 'normal';
}

export function calculateDeadlineCountdown(
  deadlineDate: string | Date | number,
  currentDate: string | Date | number = Date.now(),
): CountdownResult {
  const targetTime = new Date(deadlineDate).getTime();
  const now = new Date(currentDate).getTime();
  const diffMs = targetTime - now;

  if (diffMs <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      formatted: 'Allocation Closed',
      isExpired: true,
      urgency: 'critical',
    };
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  let formatted = '';
  let urgency: CountdownResult['urgency'] = 'normal';

  if (days > 1) {
    formatted = `${days} Days Remaining`;
    urgency = days <= 3 ? 'warning' : 'normal';
  } else if (days === 1) {
    formatted = `1 Day ${hours}h Remaining`;
    urgency = 'warning';
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m Remaining`;
    urgency = 'critical';
  } else {
    formatted = `${minutes}m Remaining`;
    urgency = 'critical';
  }

  return {
    days,
    hours,
    minutes,
    formatted,
    isExpired: false,
    urgency,
  };
}
