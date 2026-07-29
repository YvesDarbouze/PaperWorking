/**
 * Calculates the number of business days strictly between date1 and date2.
 * Excludes Saturdays and Sundays.
 * If date1 >= date2, returns 0.
 */
export function getBusinessDaysDiff(date1Str: string, date2Str: string): number {
  if (!date1Str || !date2Str) return 0;
  
  const d1 = new Date(date1Str + 'T12:00:00');
  const d2 = new Date(date2Str + 'T12:00:00');
  
  if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d1 >= d2) {
    return 0;
  }
  
  let count = 0;
  const current = new Date(d1.getTime());
  current.setDate(current.getDate() + 1);
  
  while (current < d2) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Adds a specified number of business days to a date, skipping weekends.
 */
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) { // Skip Sunday (0) and Saturday (6)
      added++;
    }
  }
  return result;
}
