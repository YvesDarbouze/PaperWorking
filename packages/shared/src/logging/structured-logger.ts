import { scrubString, scrubValue } from './redaction.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  release: string;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export type LogSink = (entry: LogEntry, serializedJson: string) => void;

export interface StructuredLoggerOptions {
  service?: string;
  release?: string;
  minLevel?: LogLevel;
  sink?: LogSink;
}

const LEVEL_PRIORITIES: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function defaultRelease(): string {
  if (typeof process !== 'undefined' && process.env) {
    return (
      process.env.NEXT_PUBLIC_BUILD_SHA ||
      process.env.BUILD_SHA ||
      process.env.APP_RELEASE ||
      process.env.COMMIT_SHA ||
      '0.1.0-dev'
    );
  }
  return '0.1.0-dev';
}

export class StructuredLogger {
  private readonly service: string;
  private readonly release: string;
  private readonly minLevel: LogLevel;
  private readonly sink?: LogSink;

  constructor(options: StructuredLoggerOptions = {}) {
    this.service = options.service ?? 'paperworking';
    this.release = options.release ?? defaultRelease();
    this.minLevel = options.minLevel ?? (process.env.NODE_ENV === 'test' ? 'debug' : 'info');
    this.sink = options.sink;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITIES[level] >= LEVEL_PRIORITIES[this.minLevel];
  }

  private emit(level: LogLevel, message: string, context?: Record<string, unknown>, err?: unknown): LogEntry {
    const timestamp = new Date().toISOString();
    const scrubbedMessage = scrubString(message);
    const scrubbedContext = context ? (scrubValue(context) as Record<string, unknown>) : undefined;

    let scrubbedError: { name: string; message: string; stack?: string } | undefined;
    if (err instanceof Error) {
      scrubbedError = {
        name: err.name,
        message: scrubString(err.message),
        stack: err.stack ? scrubString(err.stack) : undefined,
      };
    } else if (err !== undefined && err !== null) {
      scrubbedError = {
        name: 'Error',
        message: scrubString(String(err)),
      };
    }

    const entry: LogEntry = {
      timestamp,
      level,
      service: this.service,
      release: this.release,
      message: scrubbedMessage,
      ...(scrubbedContext && Object.keys(scrubbedContext).length > 0 ? { context: scrubbedContext } : {}),
      ...(scrubbedError ? { error: scrubbedError } : {}),
    };

    const serialized = JSON.stringify(entry);

    if (this.sink) {
      this.sink(entry, serialized);
    } else if (this.shouldLog(level)) {
      if (level === 'error') {
        console.error(serialized);
      } else if (level === 'warn') {
        console.warn(serialized);
      } else {
        console.log(serialized);
      }
    }

    return entry;
  }

  debug(message: string, context?: Record<string, unknown>): LogEntry {
    return this.emit('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): LogEntry {
    return this.emit('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>, err?: unknown): LogEntry {
    return this.emit('warn', message, context, err);
  }

  error(message: string, err?: unknown, context?: Record<string, unknown>): LogEntry {
    return this.emit('error', message, context, err);
  }

  withContext(baseContext: Record<string, unknown>): ContextualLogger {
    return new ContextualLogger(this, baseContext);
  }

  child(baseContext: Record<string, unknown>): ContextualLogger {
    return this.withContext(baseContext);
  }
}

export class ContextualLogger {
  constructor(
    private readonly parent: StructuredLogger,
    private readonly baseContext: Record<string, unknown>,
  ) {}

  child(additionalContext: Record<string, unknown>): ContextualLogger {
    return new ContextualLogger(this.parent, { ...this.baseContext, ...additionalContext });
  }

  debug(message: string, context?: Record<string, unknown>): LogEntry {
    return this.parent.debug(message, { ...this.baseContext, ...context });
  }

  info(message: string, context?: Record<string, unknown>): LogEntry {
    return this.parent.info(message, { ...this.baseContext, ...context });
  }

  warn(message: string, context?: Record<string, unknown>, err?: unknown): LogEntry {
    return this.parent.warn(message, { ...this.baseContext, ...context }, err);
  }

  error(message: string, err?: unknown, context?: Record<string, unknown>): LogEntry {
    return this.parent.error(message, err, { ...this.baseContext, ...context });
  }
}

export function createStructuredLogger(options: StructuredLoggerOptions = {}): StructuredLogger {
  return new StructuredLogger(options);
}

export const logger = new StructuredLogger();
