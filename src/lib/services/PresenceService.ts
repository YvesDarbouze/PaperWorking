// src/lib/services/PresenceService.ts
import redis from '@/lib/redis';

/**
 * PresenceService — Redis-backed user activity tracking
 * 
 * Tracks whether a user is 'online' based on a TTL-backed heartbeat.
 * Key format: presence:{uid}
 */

const PRESENCE_TTL = 60; // seconds

export const PresenceService = {
  /**
   * markUserOnline
   * Called by the heartbeat API to refresh the user's online status.
   */
  async markUserOnline(uid: string): Promise<void> {
    if (!redis || redis.status === 'client-mock') return;

    try {
      await redis.set(`presence:${uid}`, 'active', 'EX', PRESENCE_TTL);
    } catch (err) {
      console.warn(`[PresenceService] Failed to set presence for ${uid}:`, err);
    }
  },

  /**
   * isUserOnline
   * Checks if the user has a valid, non-expired presence key in Redis.
   */
  async isUserOnline(uid: string): Promise<boolean> {
    if (!redis || redis.status === 'client-mock') {
      // In development/mock mode, assume everyone is offline to test notifications
      return false;
    }

    try {
      const exists = await redis.exists(`presence:${uid}`);
      return exists === 1;
    } catch (err) {
      console.warn(`[PresenceService] Failed to check presence for ${uid}:`, err);
      return false;
    }
  },

  /**
   * forceOffline
   * Explicitly removes a user's presence key (e.g. on logout).
   */
  async forceOffline(uid: string): Promise<void> {
    if (!redis || redis.status === 'client-mock') return;

    try {
      await redis.del(`presence:${uid}`);
    } catch (err) {
      console.warn(`[PresenceService] Failed to delete presence for ${uid}:`, err);
    }
  }
};
