import { EventEmitter } from 'events';

/**
 * Real-time SSE / Event Bus for PaperWorking.
 * Emits events per project ID across connections, transactions, liabilities, and KPIs.
 */
type SSEEventMap = {
  [key: `transactions:new:${string}`]: { count: number; timestamp: string };
  [key: `transactions:approved:${string}`]: { count: number; timestamp: string };
  [key: `account:updated:${string}`]: { itemId: string; timestamp: string };
  [key: `liabilities:updated:${string}`]: { timestamp: string };
  [key: `kpi:updated:${string}`]: { timestamp: string };
  [key: `consent:changed:${string}`]: { itemId: string; newProducts: string[]; timestamp: string };
};

class SSEEventBus {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100);
  }

  emit<K extends keyof SSEEventMap>(event: K, data: SSEEventMap[K]) {
    this.emitter.emit(event as string, data);
  }

  on<K extends keyof SSEEventMap>(event: K, listener: (data: SSEEventMap[K]) => void) {
    this.emitter.on(event as string, listener);
  }

  off<K extends keyof SSEEventMap>(event: K, listener: (data: SSEEventMap[K]) => void) {
    this.emitter.off(event as string, listener);
  }
}

// Global singleton to persist across hot-reloads in dev
const globalForEvents = globalThis as unknown as { sseEventBus?: SSEEventBus };
export const sseEventBus = globalForEvents.sseEventBus ?? new SSEEventBus();
if (process.env.NODE_ENV !== 'production') globalForEvents.sseEventBus = sseEventBus;
