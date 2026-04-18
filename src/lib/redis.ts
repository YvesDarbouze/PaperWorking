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

let redis: any;

if (typeof window === 'undefined') {
  // SERVER-ONLY PATH
  const Redis = require('ioredis');
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl && process.env.NODE_ENV === 'production') {
    console.warn('⚠️ REDIS_URL is not defined in production environment.');
  }

  redis = new Redis(redisUrl || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  let connectionErrorLogged = false;

  redis.on('error', (err: any) => {
    if (!connectionErrorLogged) {
      console.warn('⚠️ [REDIS] Connection unavailable. Rate limiting will fallback to in-memory mode.');
      connectionErrorLogged = true;
    }
  });

  redis.on('connect', () => {
    console.log('✅ Connected to Redis');
    connectionErrorLogged = false;
  });
} else {
  // CLIENT-SAFE MOCK
  // Providing a no-op mock for any client components that transitively import this.
  redis = {
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
  };
}

export default redis;

