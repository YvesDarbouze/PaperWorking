/**
 * Client-Side Diagnostic Buffer for PaperWorking Bug Reporting & Triage.
 *
 * Requirements:
 * - Automatically captures rolling buffer of the last 20 console.error logs
 *   and failed fetch network requests (4xx/5xx).
 * - Automatic client-side PII scrubbing (emails, passwords, bearer tokens, API keys)
 *   so user credentials never leak into bug tickets.
 * - Collects session metadata: session ID, app version, route, browser/OS, viewport.
 * - Zero performance overhead and safe SSR no-op.
 */

export interface LogEntry {
  timestamp: string;
  type: 'console.error' | 'console.warn' | 'network.error';
  message: string;
}

export interface ClientDiagnostics {
  sessionId: string;
  appVersion: string;
  environment: 'production' | 'staging' | 'development' | 'test';
  timestamp: string;
  route: string;
  referrer: string;
  userAgent: string;
  platform: string;
  viewport: {
    width: number;
    height: number;
    devicePixelRatio: number;
  };
  screen: {
    width: number;
    height: number;
  };
  recentErrors: LogEntry[];
}

const MAX_LOG_ENTRIES = 20;
const rollingLogBuffer: LogEntry[] = [];
let isInitialized = false;

// Client-side PII scrubbing patterns
const EMAIL_REGEX = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;
const BEARER_REGEX = /Bearer\s+[A-Za-z0-9-_=.]+/gi;
const PASSWORD_REGEX = /("?password"?\s*[:=]\s*)"[^"]+"/gi;
const KEY_REGEX = /((?:api[_-]?key|token|auth|secret)\s*[:=]\s*)[A-Za-z0-9-_]+/gi;

export function scrubPii(input: string): string {
  if (!input) return '';
  return input
    .replace(BEARER_REGEX, 'Bearer [REDACTED_TOKEN]')
    .replace(PASSWORD_REGEX, '$1"[REDACTED_PASSWORD]"')
    .replace(KEY_REGEX, '$1[REDACTED_SECRET]')
    .replace(EMAIL_REGEX, (email) => {
      // Keep internal paperworking.co domain identifiers for diagnosis, redact user personal emails
      if (email.endsWith('@paperworking.co')) {
        return email;
      }
      const parts = email.split('@');
      const prefix = parts[0];
      const domain = parts[1] || '';
      return `${prefix.charAt(0)}***@${domain}`;
    });
}

/**
 * Initializes client-side console and network error interceptors.
 * Safe to call multiple times (idempotent).
 */
export function initClientDiagnosticBuffer(): void {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  // 1. Intercept console.error
  const originalConsoleError = console.error;
  console.error = function (...args: unknown[]) {
    try {
      const rawText = args
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
        .join(' ');
      const scrubbed = scrubPii(rawText);
      addLogEntry({
        timestamp: new Date().toISOString(),
        type: 'console.error',
        message: scrubbed.slice(0, 1000), // Cap length per log
      });
    } catch {
      // Invariant: logger must never crash the host application
    }
    originalConsoleError.apply(console, args);
  };

  // 2. Intercept window.fetch to capture 4xx/5xx failed network requests
  if (typeof window.fetch === 'function') {
    const originalFetch = window.fetch;
    window.fetch = async function (...args: Parameters<typeof fetch>): Promise<Response> {
      try {
        const response = await originalFetch.apply(this, args);
        if (!response.ok && response.status >= 400) {
          const urlStr = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || 'unknown-url';
          const cleanUrl = scrubPii(urlStr);
          addLogEntry({
            timestamp: new Date().toISOString(),
            type: 'network.error',
            message: `HTTP ${response.status} ${response.statusText} on ${cleanUrl}`,
          });
        }
        return response;
      } catch (err: unknown) {
        const urlStr = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || 'network-request';
        addLogEntry({
          timestamp: new Date().toISOString(),
          type: 'network.error',
          message: `Network failure on ${scrubPii(urlStr)}: ${(err as Error)?.message || 'Unknown network error'}`,
        });
        throw err;
      }
    };
  }
}

function addLogEntry(entry: LogEntry) {
  rollingLogBuffer.push(entry);
  if (rollingLogBuffer.length > MAX_LOG_ENTRIES) {
    rollingLogBuffer.shift();
  }
}

/**
 * Returns a snapshot of client diagnostics without bothering the user.
 */
export function getClientDiagnostics(sessionId?: string): ClientDiagnostics {
  const isBrowser = typeof window !== 'undefined';

  return {
    sessionId: sessionId || `pw_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0-dev',
    environment: (process.env.NODE_ENV as ClientDiagnostics['environment']) || 'development',
    timestamp: new Date().toISOString(),
    route: isBrowser ? window.location.pathname + window.location.search : '/',
    referrer: isBrowser ? document.referrer : '',
    userAgent: isBrowser ? navigator.userAgent : 'Server-Side-Rendering',
    platform: isBrowser ? (navigator as { platform?: string }).platform || 'Unknown OS' : 'Server',
    viewport: {
      width: isBrowser ? window.innerWidth : 1280,
      height: isBrowser ? window.innerHeight : 800,
      devicePixelRatio: isBrowser ? window.devicePixelRatio || 1 : 1,
    },
    screen: {
      width: isBrowser && window.screen ? window.screen.width : 1280,
      height: isBrowser && window.screen ? window.screen.height : 800,
    },
    recentErrors: [...rollingLogBuffer],
  };
}

/**
 * Manual test hook to clear buffer in unit tests
 */
export function __clearLogBufferForTesting(): void {
  rollingLogBuffer.length = 0;
}
