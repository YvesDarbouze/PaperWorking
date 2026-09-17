import { checkDurableRateLimit } from './durable-rate-limiter';

export const INTERNAL_SUPPORT_DESTINATION_EMAIL =
  process.env.SUPPORT_INTERNAL_EMAIL || 'hi@paperworking.co';

export const FIELD_LENGTH_CAPS = {
  name: 100,
  email: 255,
  phone: 30,
  category: 50,
  subject: 200,
  message: 5000,
  preferredTime: 100,
  topic: 1000,
  projectAddress: 200,
} as const;

export function validateFieldLengths(
  fields: Record<string, string | null | undefined>,
): { valid: boolean; field?: string; max?: number; current?: number } {
  for (const [key, val] of Object.entries(fields)) {
    if (typeof val === 'string') {
      const max = (FIELD_LENGTH_CAPS as Record<string, number>)[key];
      if (max && val.length > max) {
        return { valid: false, field: key, max, current: val.length };
      }
    }
  }
  return { valid: true };
}

export const HOURLY_SUPPORT_ANOMALY_THRESHOLD = 50;

/**
 * Tracks global support submission velocity and triggers an anomaly alarm if threshold is crossed.
 */
export async function checkSupportSendVolumeAnomaly(
  deps: { getFirestore?: () => any } = {},
): Promise<{ anomalyDetected: boolean; count: number }> {
  // We use checkDurableRateLimit with a generous limit to track global count in 1 hour
  const res = await checkDurableRateLimit(
    {
      key: 'support:global:hourly_submissions',
      limit: HOURLY_SUPPORT_ANOMALY_THRESHOLD,
      windowSeconds: 3600,
    },
    deps,
  );

  if (!res.allowed || res.current >= HOURLY_SUPPORT_ANOMALY_THRESHOLD) {
    console.warn(
      `[SUPPORT ANOMALY ALERT] High send-volume anomaly detected: ${res.current} requests in the last hour (threshold: ${HOURLY_SUPPORT_ANOMALY_THRESHOLD})`,
    );
    return { anomalyDetected: true, count: res.current };
  }

  return { anomalyDetected: false, count: res.current };
}
