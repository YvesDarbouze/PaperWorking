import { BridgeErrorHandler } from '../bridgeErrorHandler';
import { BridgeAuthError } from '../../types/errors';

/**
 * 🔐 Authentication & Security Handling Tests
 * 
 * Verifies that the BridgeErrorHandler correctly intercepts authorization failures
 * and triggers critical security advisories for system administrators.
 */

describe('Bridge API Authentication Handling', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on console.error to verify security advisories
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('correctly intercepts a 401 Unauthorized response and logs a security alert', () => {
    // 1. Construct a mock Axios 401 error payload
    const mockError = {
      isAxiosError: true,
      response: {
        status: 401,
        data: {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid access token provided.'
          }
        },
        headers: {}
      },
      config: {
        url: 'https://api.bridgedataoutput.com/api/v2/test/Property'
      }
    };

    // 2. Process the error through the central handler
    const handledError = BridgeErrorHandler.handle(mockError);

    // 3. Verify Error Classification
    expect(handledError).toBeInstanceOf(BridgeAuthError);
    expect((handledError as BridgeAuthError).status).toBe(401);

    /**
     * 🛡️ VERIFICATION: Security Advisory
     * System must log a clear, actionable instruction for developers 
     * to check their BRIDGE_SERVER_TOKEN environment variable.
     */
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('🔐 [SECURITY ALERT] Bridge Authentication Failure. Check BRIDGE_SERVER_TOKEN.')
    );
  });

  it('correctly intercepts a 403 Forbidden response and triggers the same security guardrail', () => {
    const mockError = {
      isAxiosError: true,
      response: {
        status: 403,
        data: {
          error: {
            message: 'Access to this dataset is forbidden for your application.'
          }
        }
      }
    };

    const handledError = BridgeErrorHandler.handle(mockError);

    expect(handledError).toBeInstanceOf(BridgeAuthError);
    expect((handledError as BridgeAuthError).status).toBe(403);
    
    // Ensure the security alert is still triggered for 403
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('🔐 [SECURITY ALERT] Bridge Authentication Failure. Check BRIDGE_SERVER_TOKEN.')
    );
  });
});
