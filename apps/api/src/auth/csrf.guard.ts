import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

const PRODUCTION_ORIGINS = new Set([
  'https://paperworking.co',
  'https://www.paperworking.co',
  'https://paperworking-97055.web.app',
  'https://paperworking-97055.firebaseapp.com',
]);

const DEV_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
]);

function allowedOrigins(isE2e: boolean): Set<string> {
  if (process.env.NODE_ENV !== 'production' || isE2e) {
    return new Set([...PRODUCTION_ORIGINS, ...DEV_ORIGINS]);
  }
  const extra = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set([...PRODUCTION_ORIGINS, ...extra]);
}

function isLocalDevOrigin(origin: string): boolean {
  try {
    const { protocol, hostname } = new URL(origin);
    return (
      protocol === 'http:' &&
      (hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname))
    );
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin: string, isE2e: boolean): boolean {
  if (allowedOrigins(isE2e).has(origin)) return true;
  if ((process.env.NODE_ENV !== 'production' || isE2e) && isLocalDevOrigin(origin)) {
    return true;
  }
  return false;
}

/**
 * CSRF / origin guard for cookie-authenticated mutating routes (session create/logout).
 * Required when SameSite=None cross-origin cookies are used (Vercel → Cloud Run).
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const cookieHeader = req.headers.cookie || '';
    const isE2e = cookieHeader.includes('__e2e_test=1');

    const fetchSite = req.headers['sec-fetch-site'];
    if (fetchSite === 'cross-site') {
      throw new ForbiddenException({ error: 'Cross-site request rejected', reason: 'csrf' });
    }

    const origin = req.headers.origin;
    if (origin) {
      if (isAllowedOrigin(origin, isE2e)) return true;
      throw new ForbiddenException({ error: 'Origin not allowed', reason: 'csrf' });
    }

    const referer = req.headers.referer;
    if (referer) {
      try {
        const refOrigin = new URL(referer).origin;
        if (isAllowedOrigin(refOrigin, isE2e)) return true;
      } catch {
        /* fall through */
      }
      throw new ForbiddenException({ error: 'Referer not allowed', reason: 'csrf' });
    }

    if (process.env.NODE_ENV === 'production' && !isE2e) {
      throw new ForbiddenException({ error: 'Missing origin headers', reason: 'csrf' });
    }

    return true;
  }
}
