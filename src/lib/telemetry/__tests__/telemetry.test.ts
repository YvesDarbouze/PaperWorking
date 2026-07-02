import { getTelemetryProvider, MockTelemetryProvider, PostHogTelemetryProvider } from '../index';
import { PostHog } from 'posthog-node';

jest.mock('posthog-node', () => {
  return {
    PostHog: jest.fn().mockImplementation(() => {
      return {
        capture: jest.fn(),
        flush: jest.fn(),
      };
    }),
  };
});

describe('Telemetry Subsystem', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  describe('MockTelemetryProvider', () => {
    it('should log to console if enabled', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const mockProvider = new MockTelemetryProvider(true);
      await mockProvider.capture({
        distinctId: 'user_123',
        event: 'test_event',
        properties: { foo: 'bar' },
      });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should not log to console if disabled', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const mockProvider = new MockTelemetryProvider(false);
      await mockProvider.capture({
        distinctId: 'user_123',
        event: 'test_event',
        properties: { foo: 'bar' },
      });
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('PostHogTelemetryProvider', () => {
    it('should instantiate PostHog client and forward capture/flush', async () => {
      const provider = new PostHogTelemetryProvider('test-key', 'https://test-host.com');
      expect(PostHog).toHaveBeenCalledWith('test-key', expect.objectContaining({
        host: 'https://test-host.com',
        flushAt: 1,
        flushInterval: 0,
      }));

      const mockClientInstance = (PostHog as jest.Mock).mock.results[0].value;

      await provider.capture({
        distinctId: 'user_456',
        event: 'app_start',
        properties: { version: '1.0' },
      });

      expect(mockClientInstance.capture).toHaveBeenCalledWith({
        distinctId: 'user_456',
        event: 'app_start',
        properties: { version: '1.0' },
        timestamp: undefined,
      });

      await provider.flush();
      expect(mockClientInstance.flush).toHaveBeenCalled();
    });
  });

  describe('getTelemetryProvider Factory', () => {
    it('should select PostHogTelemetryProvider if enabled with API key', () => {
      process.env.POSTHOG_ENABLED = 'true';
      process.env.POSTHOG_API_KEY = 'phc_abc123';
      process.env.POSTHOG_HOST = 'https://custom.posthog.com';

      jest.isolateModules(() => {
        const { getTelemetryProvider, PostHogTelemetryProvider: LocalClass } = require('../index');
        const provider = getTelemetryProvider();
        expect(provider).toBeInstanceOf(LocalClass);
      });
    });

    it('should select MockTelemetryProvider with enabled = true if enabled but no API key', () => {
      process.env.POSTHOG_ENABLED = 'true';
      delete process.env.POSTHOG_API_KEY;

      jest.isolateModules(() => {
        const { getTelemetryProvider, MockTelemetryProvider: LocalClass } = require('../index');
        const provider = getTelemetryProvider();
        expect(provider).toBeInstanceOf(LocalClass);
      });
    });

    it('should select MockTelemetryProvider with enabled = false if disabled', () => {
      process.env.POSTHOG_ENABLED = 'false';
      delete process.env.POSTHOG_API_KEY;

      jest.isolateModules(() => {
        const { getTelemetryProvider, MockTelemetryProvider: LocalClass } = require('../index');
        const provider = getTelemetryProvider();
        expect(provider).toBeInstanceOf(LocalClass);
      });
    });
  });
});
