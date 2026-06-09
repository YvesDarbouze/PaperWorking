import { PostHog } from 'posthog-node';

export interface TelemetryEvent {
  distinctId: string;
  event: string;
  properties?: Record<string, any>;
  timestamp?: string | Date;
}

export interface TelemetryProvider {
  capture(event: TelemetryEvent): Promise<void>;
  flush(): Promise<void>;
}

export class MockTelemetryProvider implements TelemetryProvider {
  private enabled: boolean;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  async capture(event: TelemetryEvent): Promise<void> {
    if (this.enabled) {
      console.log('[PostHog Mock] Captured Event:', {
        distinctId: event.distinctId,
        event: event.event,
        properties: event.properties,
        timestamp: event.timestamp || new Date().toISOString(),
      });
    }
  }

  async flush(): Promise<void> {
    // No-op for mock provider
  }
}

export class PostHogTelemetryProvider implements TelemetryProvider {
  private client: PostHog;

  constructor(apiKey: string, host?: string) {
    this.client = new PostHog(apiKey, {
      host: host || 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    });
  }

  async capture(event: TelemetryEvent): Promise<void> {
    this.client.capture({
      distinctId: event.distinctId,
      event: event.event,
      properties: event.properties,
      timestamp: event.timestamp ? new Date(event.timestamp) : undefined,
    });
  }

  async flush(): Promise<void> {
    await this.client.flush();
  }
}

let telemetryProviderInstance: TelemetryProvider | null = null;

export function getTelemetryProvider(): TelemetryProvider {
  if (!telemetryProviderInstance) {
    const enabled = process.env.POSTHOG_ENABLED === 'true';
    const apiKey = process.env.POSTHOG_API_KEY;
    const host = process.env.POSTHOG_HOST;

    if (enabled && apiKey) {
      telemetryProviderInstance = new PostHogTelemetryProvider(apiKey, host);
    } else {
      telemetryProviderInstance = new MockTelemetryProvider(enabled);
    }
  }
  return telemetryProviderInstance;
}

export const telemetry = getTelemetryProvider();
export default telemetry;
