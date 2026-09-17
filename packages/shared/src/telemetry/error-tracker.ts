import { scrubString, scrubValue } from '../logging/redaction.js';
import { logger } from '../logging/structured-logger.js';

export interface ErrorEventContext {
  userId?: string;
  userEmail?: string;
  organizationId?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  fingerprint?: string[];
  level?: 'debug' | 'info' | 'warning' | 'error' | 'fatal';
  request?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    cookies?: Record<string, string> | string;
    data?: unknown;
    body?: unknown;
  };
  breadcrumbs?: Array<{
    category?: string;
    message?: string;
    data?: Record<string, unknown>;
    timestamp?: string;
  }>;
}

export interface CapturedErrorEvent {
  id: string;
  timestamp: string;
  release: string;
  environment: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'fatal';
  message: string;
  exception?: {
    type: string;
    value: string;
    stack?: string;
  };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: {
    id?: string;
    email?: string;
    username?: string;
  };
  request?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    cookies?: Record<string, string> | string;
    data?: unknown;
    body?: unknown;
  };
  breadcrumbs?: Array<{
    category?: string;
    message?: string;
    data?: Record<string, unknown>;
    timestamp?: string;
  }>;
}

export interface ErrorTrackerConfig {
  dsn?: string;
  release?: string;
  environment?: string;
  service?: string;
  enabled?: boolean;
}

let hasLoggedStartupWarning = false;

export function logErrorTrackerStartup(tracker: ErrorTracker): void {
  if (hasLoggedStartupWarning) return;
  hasLoggedStartupWarning = true;

  if (!tracker.isConfigured) {
    logger.warn(
      '⚠️ [OBSERVABILITY WARNING] SENTRY_DSN is absent. Error capture is disabled (error_capture: unconfigured). Set SENTRY_DSN in production to enable centralized error capture.',
      {
        error_capture: 'unconfigured',
        requiresCredentials: true,
      },
    );
  } else {
    logger.info(
      `[OBSERVABILITY] Centralized error capture active (release: ${tracker.getRelease()})`,
      {
        error_capture: 'configured',
      },
    );
  }
}

export class ErrorTracker {
  private readonly dsn?: string;
  private readonly release: string;
  private readonly environment: string;
  private readonly service: string;
  private readonly enabled: boolean;
  private readonly inMemoryBuffer: CapturedErrorEvent[] = [];
  private readonly MAX_BUFFER_SIZE = 50;

  constructor(config: ErrorTrackerConfig = {}) {
    this.dsn =
      config.dsn ||
      (typeof process !== 'undefined' && process.env
        ? process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
        : undefined);

    this.release =
      config.release ||
      (typeof process !== 'undefined' && process.env
        ? process.env.NEXT_PUBLIC_BUILD_SHA ||
          process.env.BUILD_SHA ||
          process.env.APP_RELEASE ||
          process.env.COMMIT_SHA ||
          '0.1.0-dev'
        : '0.1.0-dev');

    this.environment =
      config.environment ||
      (typeof process !== 'undefined' && process.env
        ? process.env.NODE_ENV || 'development'
        : 'development');

    this.service = config.service || 'paperworking';
    this.enabled = config.enabled !== false;

    // Emit loud startup warning once if unconfigured
    logErrorTrackerStartup(this);
  }

  get isConfigured(): boolean {
    return Boolean(this.dsn && this.dsn.trim().length > 0);
  }

  get status(): 'configured' | 'unconfigured' {
    return this.isConfigured ? 'configured' : 'unconfigured';
  }

  getRelease(): string {
    return this.release;
  }

  getBuffer(): CapturedErrorEvent[] {
    return [...this.inMemoryBuffer];
  }

  clearBuffer(): void {
    this.inMemoryBuffer.length = 0;
  }

  /**
   * Mandatory beforeSend hook to scrub all 7 sensitive patterns:
   * 1. Protected support inbox address (hi [at] paperworking.co)
   * 2. Any email-shaped string
   * 3. Plaid token shapes (access-(sandbox|development|production|testing)-...)
   * 4. Authorization headers (Bearer ..., Basic ..., header keys)
   * 5. Cookie headers (cookie, set-cookie, __session)
   * 6. Request bodies (request.data, request.body, extra.body, extra.requestBody)
   * 7. DATABASE_URL-shaped strings (postgres://..., postgresql://...)
   */
  public beforeSend(event: CapturedErrorEvent): CapturedErrorEvent | null {
    // 1. Scrub request object and strip bodies & auth/cookie headers
    let scrubbedRequest: CapturedErrorEvent['request'] | undefined;
    if (event.request) {
      const headers: Record<string, string> = {};
      if (event.request.headers) {
        for (const [key, val] of Object.entries(event.request.headers)) {
          const lowerKey = key.toLowerCase();
          if (
            lowerKey === 'authorization' ||
            lowerKey === 'proxy-authorization' ||
            lowerKey === 'x-api-key' ||
            lowerKey === 'x-auth-token'
          ) {
            headers[key] = '[AUTH_REDACTED]';
          } else if (lowerKey === 'cookie' || lowerKey === 'set-cookie') {
            headers[key] = '[COOKIE_REDACTED]';
          } else {
            headers[key] = scrubString(val);
          }
        }
      }

      scrubbedRequest = {
        url: event.request.url ? scrubString(event.request.url) : undefined,
        method: event.request.method,
        headers,
        data: event.request.data !== undefined ? '[REQUEST_BODY_STRIPPED]' : undefined,
        body: event.request.body !== undefined ? '[REQUEST_BODY_STRIPPED]' : undefined,
        cookies: event.request.cookies !== undefined ? '[COOKIE_REDACTED]' : undefined,
      };
    }

    // 2. Scrub extra metadata, redacting nested body payloads and auth
    let scrubbedExtra: Record<string, unknown> | undefined;
    if (event.extra) {
      const extraCopy: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(event.extra)) {
        const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
        if (
          lowerKey === 'body' ||
          lowerKey === 'requestbody' ||
          lowerKey === 'data' ||
          lowerKey === 'payload'
        ) {
          extraCopy[key] = '[REQUEST_BODY_STRIPPED]';
        } else if (lowerKey === 'authorization' || lowerKey === 'auth') {
          extraCopy[key] = '[AUTH_REDACTED]';
        } else if (lowerKey === 'cookie' || lowerKey === 'cookies') {
          extraCopy[key] = '[COOKIE_REDACTED]';
        } else {
          extraCopy[key] = scrubValue(val);
        }
      }
      scrubbedExtra = extraCopy;
    }

    // 3. Scrub user identity
    let scrubbedUser: CapturedErrorEvent['user'] | undefined;
    if (event.user) {
      scrubbedUser = {
        id: event.user.id ? scrubString(event.user.id) : undefined,
        email: event.user.email ? '[EMAIL_REDACTED]' : undefined,
        username: event.user.username ? scrubString(event.user.username) : undefined,
      };
    }

    const scrubbed: CapturedErrorEvent = {
      ...event,
      message: scrubString(event.message),
      tags: event.tags ? (scrubValue(event.tags) as Record<string, string>) : undefined,
      extra: scrubbedExtra,
      user: scrubbedUser,
      request: scrubbedRequest,
      breadcrumbs: event.breadcrumbs
        ? event.breadcrumbs.map((b) => ({
            ...b,
            message: b.message ? scrubString(b.message) : undefined,
            data: b.data ? (scrubValue(b.data) as Record<string, unknown>) : undefined,
          }))
        : undefined,
    };

    if (event.exception) {
      scrubbed.exception = {
        type: event.exception.type,
        value: scrubString(event.exception.value),
        stack: event.exception.stack ? scrubString(event.exception.stack) : undefined,
      };
    }

    return scrubbed;
  }

  async captureException(error: unknown, context: ErrorEventContext = {}): Promise<string> {
    const eventId = `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const timestamp = new Date().toISOString();

    let exType = 'Error';
    let exValue = 'Unknown error';
    let exStack: string | undefined;

    if (error instanceof Error) {
      exType = error.name || 'Error';
      exValue = error.message || 'Unknown error';
      exStack = error.stack;
    } else if (typeof error === 'string') {
      exValue = error;
    } else if (error !== null && error !== undefined) {
      exValue = String(error);
    }

    const rawEvent: CapturedErrorEvent = {
      id: eventId,
      timestamp,
      release: this.release,
      environment: this.environment,
      level: context.level || 'error',
      message: exValue,
      exception: {
        type: exType,
        value: exValue,
        stack: exStack,
      },
      tags: {
        service: this.service,
        ...context.tags,
      },
      extra: {
        ...context.extra,
        organizationId: context.organizationId,
      },
      user: context.userId || context.userEmail ? { id: context.userId, email: context.userEmail } : undefined,
      request: context.request,
      breadcrumbs: context.breadcrumbs,
    };

    const scrubbedEvent = this.beforeSend(rawEvent);
    if (!scrubbedEvent) return eventId;

    this.recordEvent(scrubbedEvent);

    if (this.isConfigured && this.enabled) {
      await this.dispatchToSentry(scrubbedEvent);
    } else {
      logger.debug(
        `[ErrorTracker:Unconfigured] Captured error: ${scrubbedEvent.message} (Release: ${scrubbedEvent.release})`,
        {
          eventId,
          status: 'unconfigured',
          requiresCredentials: true,
        },
      );
    }

    return eventId;
  }

  async captureMessage(
    message: string,
    level: 'debug' | 'info' | 'warning' | 'error' | 'fatal' = 'info',
    context: ErrorEventContext = {},
  ): Promise<string> {
    const eventId = `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const timestamp = new Date().toISOString();

    const rawEvent: CapturedErrorEvent = {
      id: eventId,
      timestamp,
      release: this.release,
      environment: this.environment,
      level,
      message,
      tags: {
        service: this.service,
        ...context.tags,
      },
      extra: {
        ...context.extra,
        organizationId: context.organizationId,
      },
      user: context.userId || context.userEmail ? { id: context.userId, email: context.userEmail } : undefined,
      request: context.request,
      breadcrumbs: context.breadcrumbs,
    };

    const scrubbedEvent = this.beforeSend(rawEvent);
    if (!scrubbedEvent) return eventId;

    this.recordEvent(scrubbedEvent);

    if (this.isConfigured && this.enabled) {
      await this.dispatchToSentry(scrubbedEvent);
    }

    return eventId;
  }

  private recordEvent(event: CapturedErrorEvent): void {
    this.inMemoryBuffer.unshift(event);
    if (this.inMemoryBuffer.length > this.MAX_BUFFER_SIZE) {
      this.inMemoryBuffer.pop();
    }
  }

  private async dispatchToSentry(event: CapturedErrorEvent): Promise<void> {
    if (!this.dsn) return;

    try {
      // Parse standard Sentry DSN: https://<publicKey>@<host>/<projectId>
      const url = new URL(this.dsn);
      const publicKey = url.username;
      const projectId = url.pathname.replace(/^\//, '');
      const host = url.host;

      if (!publicKey || !projectId) {
        logger.warn('[ErrorTracker] Malformed SENTRY_DSN provided.');
        return;
      }

      const storeEndpoint = `https://${host}/api/${projectId}/store/`;
      const authHeader = `Sentry sentry_version=7, sentry_client=paperworking-tracker/0.1.0, sentry_key=${publicKey}`;

      const payload = {
        event_id: event.id.replace(/^err_|^msg_/, '').padEnd(32, '0').slice(0, 32),
        timestamp: event.timestamp,
        platform: 'javascript',
        level: event.level,
        logger: this.service,
        release: event.release,
        environment: event.environment,
        message: event.message,
        exception: event.exception
          ? {
              values: [
                {
                  type: event.exception.type,
                  value: event.exception.value,
                  stacktrace: event.exception.stack
                    ? {
                        frames: event.exception.stack.split('\n').map((line) => ({
                          function: line.trim(),
                        })),
                      }
                    : undefined,
                },
              ],
            }
          : undefined,
        tags: event.tags,
        extra: event.extra,
        user: event.user,
      };

      if (typeof fetch !== 'undefined') {
        await fetch(storeEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Sentry-Auth': authHeader,
          },
          body: JSON.stringify(payload),
        }).catch((err) => {
          logger.warn('[ErrorTracker] Failed to dispatch event to Sentry:', undefined, err);
        });
      }
    } catch (err) {
      logger.warn('[ErrorTracker] Sentry dispatch failed:', undefined, err);
    }
  }
}

export const errorTracker = new ErrorTracker();
