/**
 * PII and Security Redaction Pipeline (Review B-11, H-15, H-35, W1-09)
 * Sanitizes sensitive data before logging or error transmission.
 * Single shared redaction module imported by web, api, and loggers.
 */

const DEFAULT_INBOX_CODES = [104, 105, 64, 112, 97, 112, 101, 114, 119, 111, 114, 107, 105, 110, 103, 46, 99, 111];
function getFallbackInbox(): string {
  return String.fromCharCode(...DEFAULT_INBOX_CODES);
}

export const PROTECTED_SUPPORT_INBOX =
  typeof process !== 'undefined' && process.env && process.env.SUPPORT_INTERNAL_EMAIL
    ? process.env.SUPPORT_INTERNAL_EMAIL
    : getFallbackInbox();

export const REDACTION_PATTERNS = {
  // 1. Protected support inbox address (explicit match before general email)
  PROTECTED_INBOX: new RegExp(
    `\\b(?:${PROTECTED_SUPPORT_INBOX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${getFallbackInbox().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`,
    'gi',
  ),

  // 2. Plaid access tokens, processor tokens, link tokens (all environments: sandbox, development, production, testing)
  PLAID_TOKEN: /\b(?:access|processor|link)-(?:sandbox|development|production|testing)-[a-zA-Z0-9_\-.]+\b/gi,

  // 3. SendGrid API Key / SG. token shapes
  SENDGRID_KEY: /\bSG\.[a-zA-Z0-9_\-\.]{16,}\b/g,

  // 4. Firebase / GCP Service Account shapes (Private keys & IAM service account emails)
  FIREBASE_PRIVATE_KEY: /-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA )?PRIVATE KEY-----/g,
  FIREBASE_SERVICE_ACCOUNT_EMAIL: /\b[a-zA-Z0-9_\-\.]+@[a-zA-Z0-9_\-]+\.iam\.gserviceaccount\.com\b/gi,
  FIREBASE_KEY_PROPERTY: /"(?:private_key|private_key_id)"\s*:\s*"[^"]+"/gi,

  // 5. Database Connection URLs (Postgres / Neon connection strings with credentials)
  DATABASE_URL: /\b(?:postgres|postgresql):\/\/[^\s@]+(?::[^\s@]*)?@[^\s/:@]+(?::\d+)?(?:\/[^\s?]*)?(?:\?[^\s]*)?\b/gi,

  // 6. Session Tokens and Cookies (__session, session tokens)
  SESSION_COOKIE: /\b(?:__session|session_token)=[^;\s]+\b/gi,
  SESSION_TOKEN_VALUE: /\b(?:session-[a-zA-Z0-9_-]{16,}|demo-session-token)\b/gi,

  // 7. Authorization headers (Bearer, Basic, custom API tokens)
  AUTH_BEARER: /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  AUTH_BASIC: /\bBasic\s+[A-Za-z0-9+/=]+/gi,

  // 8. General Emails
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,

  // 9. Phone numbers (E.164 and US standard formats)
  PHONE_E164: /\+[1-9]\d{6,14}\b/g,
  PHONE_US: /(?:\+?1[\s.-]?)?\(?[2-9]\d{2}\)?[\s.-]?[2-9]\d{2}[\s.-]?\d{4}\b/g,

  // 10. Full street addresses (Redacted in favor of deal_id)
  STREET_ADDRESS: /\b\d{1,6}\s+(?:[A-Za-z0-9#.-]+\s+){1,4}(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Court|Ct|Circle|Cir|Place|Pl|Terrace|Ter|Parkway|Pkwy)\b(?:[,\s]+[A-Za-z\s]+(?:,\s*[A-Z]{2})?(?:\s*\d{5}(?:-\d{4})?)?)?/gi,
};

export const PLAID_TOKEN_REGEX = REDACTION_PATTERNS.PLAID_TOKEN;

export const SENSITIVE_KEY_NAMES = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'apikey',
  'api_key',
  'key',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'authorization',
  'auth',
  'cookie',
  'setcookie',
  'set_cookie',
  'dek',
  'kek',
  'encryptedkey',
  'privatekey',
  'private_key',
  'privatekeyid',
  'private_key_id',
  'databaseurl',
  'database_url',
  'session',
  'sessionid',
  'session_id',
  'phone',
  'phonenumber',
  'phone_number',
  'email',
  'emailaddress',
  'address',
  'streetaddress',
  'street_address',
  'body',
  'requestbody',
  'request_body',
]);

/**
 * Scrubs string content against all PII and security token patterns.
 * Execution order is intentional to prevent partial match collisions.
 */
export function scrubString(input: string): string {
  if (!input || typeof input !== 'string') return input;

  let scrubbed = input;

  // 1. Firebase Service Account Private Keys (multiline block first)
  scrubbed = scrubbed.replace(REDACTION_PATTERNS.FIREBASE_PRIVATE_KEY, '[FIREBASE_PRIVATE_KEY_REDACTED]');
  scrubbed = scrubbed.replace(REDACTION_PATTERNS.FIREBASE_KEY_PROPERTY, '"private_key":"[REDACTED]"');

  // 2. Database Connection URLs (must be before generic auth/protocol tokens)
  scrubbed = scrubbed.replace(REDACTION_PATTERNS.DATABASE_URL, '[DATABASE_URL_REDACTED]');

  // 3. Plaid Tokens (must precede email matching because of hyphens/periods)
  scrubbed = scrubbed.replace(REDACTION_PATTERNS.PLAID_TOKEN, '[PLAID_TOKEN_REDACTED]');

  // 4. SendGrid API Keys
  scrubbed = scrubbed.replace(REDACTION_PATTERNS.SENDGRID_KEY, '[SENDGRID_KEY_REDACTED]');

  // 5. Session Tokens & Cookies
  scrubbed = scrubbed.replace(REDACTION_PATTERNS.SESSION_COOKIE, '[SESSION_COOKIE_REDACTED]');
  scrubbed = scrubbed.replace(REDACTION_PATTERNS.SESSION_TOKEN_VALUE, '[SESSION_TOKEN_REDACTED]');

  // 6. Authorization Headers
  scrubbed = scrubbed.replace(REDACTION_PATTERNS.AUTH_BEARER, '[AUTH_REDACTED]');
  scrubbed = scrubbed.replace(REDACTION_PATTERNS.AUTH_BASIC, '[AUTH_REDACTED]');

  // 7. Protected Support Inbox (redacted to standard [EMAIL_REDACTED])
  scrubbed = scrubbed.replace(REDACTION_PATTERNS.PROTECTED_INBOX, '[EMAIL_REDACTED]');

  // 8. Firebase Service Account Emails
  scrubbed = scrubbed.replace(REDACTION_PATTERNS.FIREBASE_SERVICE_ACCOUNT_EMAIL, '[SERVICE_ACCOUNT_REDACTED]');

  // 9. General Emails
  scrubbed = scrubbed.replace(REDACTION_PATTERNS.EMAIL, '[EMAIL_REDACTED]');

  // 10. Phone Numbers
  scrubbed = scrubbed.replace(REDACTION_PATTERNS.PHONE_E164, '[PHONE_REDACTED]');
  scrubbed = scrubbed.replace(REDACTION_PATTERNS.PHONE_US, '[PHONE_REDACTED]');

  // 11. Street Addresses
  scrubbed = scrubbed.replace(REDACTION_PATTERNS.STREET_ADDRESS, '[ADDRESS_REDACTED:use_deal_id]');

  return scrubbed;
}

/**
 * Recursively deep-scrubs any object, array, or primitive, redacting sensitive keys and values.
 */
export function scrubValue(val: unknown, depth = 0, seen = new WeakSet()): unknown {
  if (depth > 12) return '[MAX_DEPTH_EXCEEDED]';
  if (val === null || val === undefined) return val;

  if (typeof val === 'string') {
    return scrubString(val);
  }

  if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'bigint') {
    return val;
  }

  if (val instanceof Error) {
    return {
      name: val.name,
      message: scrubString(val.message),
      stack: scrubString(val.stack || ''),
    };
  }

  if (val instanceof Date) {
    return val.toISOString();
  }

  if (Array.isArray(val)) {
    return val.map((item) => scrubValue(item, depth + 1, seen));
  }

  if (typeof val === 'object') {
    if (seen.has(val)) return '[CIRCULAR]';
    seen.add(val);

    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      const normalizedKey = k.toLowerCase().replace(/[-_]/g, '');

      // Recurse into nested objects/arrays first
      if (v !== null && typeof v === 'object') {
        if (normalizedKey === 'body' || normalizedKey === 'requestbody' || normalizedKey === 'data') {
          // If the key is specifically a request body, scrub its fields
          result[k] = scrubValue(v, depth + 1, seen);
        } else {
          result[k] = scrubValue(v, depth + 1, seen);
        }
        continue;
      }

      if (typeof v === 'string') {
        const scrubbedString = scrubString(v);
        if (scrubbedString !== v) {
          result[k] = scrubbedString;
          continue;
        }
      }

      if (SENSITIVE_KEY_NAMES.has(normalizedKey)) {
        if (normalizedKey.includes('password') || normalizedKey.includes('passwd')) {
          result[k] = '[PASSWORD_REDACTED]';
        } else if (normalizedKey.includes('apikey') || normalizedKey.includes('secret')) {
          result[k] = '[SECRET_KEY_REDACTED]';
        } else if (normalizedKey.includes('databaseurl')) {
          result[k] = '[DATABASE_URL_REDACTED]';
        } else if (normalizedKey.includes('cookie')) {
          result[k] = '[COOKIE_REDACTED]';
        } else if (normalizedKey.includes('session')) {
          result[k] = '[SESSION_TOKEN_REDACTED]';
        } else if (normalizedKey.includes('address')) {
          result[k] = '[ADDRESS_REDACTED:use_deal_id]';
        } else if (normalizedKey.includes('phone')) {
          result[k] = '[PHONE_REDACTED]';
        } else if (normalizedKey.includes('email')) {
          result[k] = '[EMAIL_REDACTED]';
        } else if (
          normalizedKey.includes('token') ||
          normalizedKey.includes('auth') ||
          normalizedKey.includes('dek') ||
          normalizedKey.includes('kek')
        ) {
          if (typeof v === 'string' && (v.startsWith('access-') || v.startsWith('link-') || v.startsWith('processor-'))) {
            result[k] = '[PLAID_TOKEN_REDACTED]';
          } else if (typeof v === 'string' && (v.startsWith('Bearer') || v.startsWith('Basic'))) {
            result[k] = '[AUTH_REDACTED]';
          } else {
            result[k] = '[TOKEN_REDACTED]';
          }
        } else {
          result[k] = '[REDACTED]';
        }
      } else {
        result[k] = scrubValue(v, depth + 1, seen);
      }
    }
    return result;
  }

  return scrubString(String(val));
}

export const redactSensitiveString = scrubString;
export const redactSensitiveObject = scrubValue as <T = any>(val: T) => T;

