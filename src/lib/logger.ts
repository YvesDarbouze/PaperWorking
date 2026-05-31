const PII_KEYS = new Set([
  'email',
  'password',
  'ssn',
  'taxid',
  'card',
  'bank',
  'address',
  'phone',
  'phonenumber',
  'street',
  'city',
  'state',
  'zipcode',
  'zip',
  'fullname',
  'name',
]);

function redactPII(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(redactPII);
  }
  
  const redacted: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (PII_KEYS.has(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else if (typeof val === 'object') {
      redacted[key] = redactPII(val);
    } else {
      redacted[key] = val;
    }
  }
  return redacted;
}

interface LogContext {
  userId?: string;
  traceId?: string;
  projectId?: string;
  [key: string]: any;
}

class StructuredLogger {
  private formatLog(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', message: string, context?: LogContext) {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context ? redactPII(context) : {}),
    };
    return JSON.stringify(payload);
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== 'production' || process.env.LOG_LEVEL === 'debug') {
      console.log(this.formatLog('DEBUG', message, context));
    }
  }

  info(message: string, context?: LogContext) {
    console.log(this.formatLog('INFO', message, context));
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatLog('WARN', message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errObj = error instanceof Error 
      ? { errorName: error.name, errorMessage: error.message, errorStack: error.stack }
      : { rawError: error };

    console.error(
      this.formatLog('ERROR', message, {
        ...errObj,
        ...context,
      })
    );
  }
}

export const logger = new StructuredLogger();
