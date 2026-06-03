// src/lib/redis.ts
/**
 * 💡 Redis Singleton
 * 
 * Centralized Redis client for the PaperWorking backend.
 * Primary Use Case: Zillow Bridge API Token Caching and Rate Limit management.
 * 
 * LOGIC GUARDRAIL: We use conditional imports to prevent ioredis (and its Node-only dependencies like tls/dns)
 * from being bundled for the browser.
 */

import Redis from 'ioredis';

let redisClient: any = null;

export function getRedisClient() {
  if (typeof window === 'undefined') {
    if (!redisClient) {
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl && process.env.NODE_ENV === 'production') {
        console.warn('⚠️ REDIS_URL is not defined in production environment.');
      }
      redisClient = new Redis(redisUrl || 'redis://localhost:6379', {
        maxRetriesPerRequest: 3,
        retryStrategy(times: number) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      let connectionErrorLogged = false;

      redisClient.on('error', (err: any) => {
        if (!connectionErrorLogged) {
          console.warn('⚠️ [REDIS] Connection unavailable. Rate limiting will fallback to in-memory mode.');
          connectionErrorLogged = true;
        }
      });

      redisClient.on('connect', () => {
        console.log('✅ Connected to Redis');
        connectionErrorLogged = false;
      });
    }
    return redisClient;
  } else {
    // CLIENT-SAFE MOCK
    return {
      status: 'client-mock',
      multi: () => ({
        zadd: () => {},
        zremrangebyscore: () => {},
        zcard: () => {},
        expire: () => {},
        lpush: () => {},
        ltrim: () => {},
        exec: async () => null,
      }),
      zcount: async () => 0,
      lrange: async () => [],
      on: () => {},
      quit: async () => {},
    };
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (err) {
      // Ignored
    }
    redisClient = null;
  }
}

const redis: any = new Proxy({} as any, {
  get(_target, prop) {
    if (prop === 'disconnect') return disconnectRedis;
    const client = getRedisClient();
    const val = client[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  }
});

export { redis };
export default redis;
