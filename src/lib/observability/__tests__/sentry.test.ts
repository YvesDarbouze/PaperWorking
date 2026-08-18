import { isIgnoredError, captureException } from '../sentry';

describe('Observability & Sentry Integration Suite (AGENT P-6)', () => {
  test('isIgnoredError identifies expected operational errors', () => {
    expect(isIgnoredError('RESOURCE_NOT_FOUND')).toBe(true);
    expect(isIgnoredError('HTTP 404 Error')).toBe(true);
    expect(isIgnoredError('VALIDATION_FAILED: invalid email')).toBe(true);
    expect(isIgnoredError('DATABASE_CONNECTION_REFUSED')).toBe(false);
  });

  test('captureException ignores expected operational errors', () => {
    const res = captureException(new Error('RESOURCE_NOT_FOUND'));
    expect(res).toBeNull();
  });

  test('captureException captures and formats unexpected exceptions', () => {
    const error = new Error('Unexpected Database Connection Failure');
    const res = captureException(error, { userId: 'user_123' });

    expect(res).not.toBeNull();
    expect(res?.error.message).toBe('Unexpected Database Connection Failure');
    expect(res?.context?.userId).toBe('user_123');
    expect(res?.context?.environment).toBeDefined();
  });
});
