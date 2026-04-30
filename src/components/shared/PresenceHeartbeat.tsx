// src/components/shared/PresenceHeartbeat.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

/**
 * PresenceHeartbeat
 * 
 * Invisible background component that pings the presence API while the 
 * user is active in the dashboard.
 */
export default function PresenceHeartbeat() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const sendHeartbeat = async () => {
      try {
        const idToken = await user.getIdToken();
        await fetch('/api/presence/heartbeat', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (err) {
        // Silent fail — presence is non-critical for core app function
        console.warn('[Presence] Heartbeat failed');
      }
    };

    // Initial ping
    sendHeartbeat();

    // Repeat every 45 seconds (Redis TTL is 60s)
    intervalRef.current = setInterval(sendHeartbeat, 45000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user]);

  return null;
}
