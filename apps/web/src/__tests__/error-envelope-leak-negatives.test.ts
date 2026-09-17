import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { formatErrorEnvelope, sanitizeApiError } from '@paperworking/shared';
import ErrorPage from '../../app/error';
import GlobalErrorPage from '../../app/global-error';

describe('Global Error Envelope & Production Error Pages (Review B-11, H-15, H-35)', () => {
  let consoleErrorMock: any;

  beforeEach(() => {
    consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorMock.mockRestore();
  });

  describe('1. Global Error Envelope Format & Sanitization', () => {
    it('returns strictly { error: { code, message, traceId } } format without internal details', () => {
      const internalError = new Error(
        'PrismaClientKnownRequestError: Unique constraint failed on the fields: (`idempotency_key`) at postgres://admin:super_secret_password@db.neon.tech/prod',
      );
      (internalError as any).code = 'P2002';
      (internalError as any).meta = { target: ['idempotency_key'] };

      const envelope = formatErrorEnvelope(
        'CONFLICT',
        'A record with this key already exists.',
        internalError,
      );

      // Verify exact shape
      expect(envelope).toEqual({
        error: {
          code: 'CONFLICT',
          message: 'A record with this key already exists.',
          traceId: expect.any(String),
        },
      });

      // Verify negative leak assertions:
      const serialized = JSON.stringify(envelope);
      expect(serialized).not.toContain('super_secret_password');
      expect(serialized).not.toContain('db.neon.tech');
      expect(serialized).not.toContain('PrismaClientKnownRequestError');
      expect(serialized).not.toContain('stack');
      expect(serialized).not.toContain('P2002');
    });

    it('sanitizes raw database / Prisma errors when fallback message is requested', () => {
      const rawPrismaError =
        'Error: P2025: An operation failed because it depends on one or more records that were required but not found. Query: SELECT * FROM users WHERE id = $1';

      const sanitized = sanitizeApiError(rawPrismaError);
      expect(sanitized.error.code).toBe('RESOURCE_NOT_FOUND');
      expect(sanitized.error.message).toBe('The requested resource was not found.');
      expect(sanitized.error.traceId).toBeDefined();
      expect(sanitized.error.message).not.toContain('P2025');
      expect(sanitized.error.message).not.toContain('SELECT * FROM users');
    });

    it('replaces database connection timeouts with generic gateway timeout message', () => {
      const rawTimeout = 'Connection timed out after 5000ms at postgres://neon-db.internal:5432';
      const sanitized = sanitizeApiError(rawTimeout);
      expect(sanitized.error.code).toBe('GATEWAY_TIMEOUT');
      expect(sanitized.error.message).toBe('Upstream service request timed out.');
      expect(sanitized.error.traceId).toBeDefined();
      expect(sanitized.error.message).not.toContain('postgres://');
      expect(sanitized.error.message).not.toContain('5432');
    });
  });

  describe('2. Next.js Production Error Boundary Leak Negatives', () => {
    it('renders page-level app/error.tsx with zero leaked stacks or database URLs', () => {
      const sensitiveStack =
        'Error: Table "projects" does not exist in schema "public" at Client.query (/node_modules/@prisma/client/runtime.js:142:15)';
      const fakeError = new Error('Database schema synchronization failure');
      fakeError.stack = sensitiveStack;
      (fakeError as any).digest = 'digest-pw-secret-hash-1234';

      const html = renderToStaticMarkup(
        React.createElement(ErrorPage, {
          error: fakeError,
          reset: () => {},
        }),
      );

      // Verify user-facing calm, professional content
      expect(html).toContain('Something went wrong');
      expect(html).toContain('An unexpected error occurred while rendering this page');
      expect(html).toContain('digest-pw-secret-hash-1234');

      // CRITICAL NEGATIVE LEAK ASSERTIONS:
      expect(html).not.toContain('Table "projects" does not exist');
      expect(html).not.toContain('@prisma/client');
      expect(html).not.toContain('runtime.js');
      expect(html).not.toContain('Client.query');
      expect(html).not.toContain(sensitiveStack);
    });

    it('renders root app/global-error.tsx with zero leaked stacks or database URLs', () => {
      const sensitiveStack =
        'Error: FATAL: password authentication failed for user "neon_admin" at Connection.parseE (/node_modules/pg/lib/connection.js:614:11)';
      const fakeError = new Error('Auth failure to internal database');
      fakeError.stack = sensitiveStack;

      const html = renderToStaticMarkup(
        React.createElement(GlobalErrorPage, {
          error: fakeError,
          reset: () => {},
        }),
      );

      expect(html).toContain('System Error');
      expect(html).toContain('A critical application error occurred');

      // CRITICAL NEGATIVE LEAK ASSERTIONS:
      expect(html).not.toContain('neon_admin');
      expect(html).not.toContain('password authentication failed');
      expect(html).not.toContain('node_modules/pg');
      expect(html).not.toContain('Connection.parseE');
      expect(html).not.toContain(sensitiveStack);
    });
  });
});
