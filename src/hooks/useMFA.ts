'use client';
import { useCallback, useState } from 'react';
import { multiFactor, MultiFactorInfo } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';

const TOTP_FACTOR_ID = 'totp';

/**
 * Read the authenticated user's TOTP enrollment state from Firebase.
 * The enrollment list is derived from the live Firebase user object —
 * never from local state — so `isMFAEnabled` reflects the server truth.
 * Call `refresh()` after enrollment/unenrollment to force a user.reload().
 */
export function useMFA() {
  const { user } = useAuth();
  const [_tick, setTick] = useState(0);

  const refresh = useCallback(async () => {
    if (user) await user.reload();
    setTick((t) => t + 1);
  }, [user]);

  const enrolledFactors: MultiFactorInfo[] = user
    ? multiFactor(user).enrolledFactors
    : [];

  const isMFAEnabled = enrolledFactors.some((f) => f.factorId === TOTP_FACTOR_ID);
  const totpFactor = enrolledFactors.find((f) => f.factorId === TOTP_FACTOR_ID) ?? null;

  return { isMFAEnabled, totpFactor, enrolledFactors, refresh };
}
