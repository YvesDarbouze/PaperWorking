import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import {
  ErrorTracker,
  errorTracker,
  type CapturedErrorEvent,
} from "@paperworking/shared";

describe("Error Capture & PII Scrubber (W1-09 Task 1)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.SENTRY_DSN;
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("1. Sentry DSN Gating & Honest Status", () => {
    it('reports honest "unconfigured" status when SENTRY_DSN is absent', () => {
      const tracker = new ErrorTracker({ dsn: undefined });
      expect(tracker.isConfigured).toBe(false);
      expect(tracker.status).toBe("unconfigured");
    });

    it('reports honest "configured" status when SENTRY_DSN is present', () => {
      const tracker = new ErrorTracker({
        dsn: "https://pubkey123456@o999999.ingest.sentry.io/1234567",
      });
      expect(tracker.isConfigured).toBe(true);
      expect(tracker.status).toBe("configured");
    });
  });

  describe("2. Mandatory beforeSend Scrubber Across All 7 Patterns", () => {
    const RAW_PATTERNS = {
      // 1. Protected support inbox address
      protectedInbox: "hi@paperworking.co",
      // 2. Any email-shaped string
      userEmail: "investor.syndicate@example.org",
      // 3. Plaid token shapes
      plaidSandboxToken: "access-sandbox-9999-token-secret-item-id-12345",
      plaidProductionToken: "access-production-8888-super-private-plaid-token",
      // 4. Authorization headers
      bearerAuth: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.secretSignature",
      basicAuth: "Basic dXNlcm5hbWU6cGFzc3dvcmQ=",
      // 5. Cookie headers
      cookieVal: "__session=super_confidential_session_cookie; theme=dark",
      // 6. Request body
      requestBody: {
        propertyAddress: "123 Main St, Austin, TX",
        taxId: "12-3456789",
        password: "MySuperSecretPassword",
      },
      // 7. DATABASE_URL-shaped string
      databaseUrl: "postgres://db_admin:UltraSecretPassword123@neon-db.internal:5432/paperworking_prod?sslmode=require",
    };

    it("seeds fake error containing all 7 patterns and asserts completely clean outbound payload", async () => {
      const tracker = new ErrorTracker({
        dsn: "https://pubkey@sentry.test/123",
      });

      // Construct a fake raw error containing all 7 sensitive patterns across
      // message, stack, exception, request headers, request body, extra, tags, and user
      const rawError = new Error(
        `Database query failed on connection ${RAW_PATTERNS.databaseUrl} for user ${RAW_PATTERNS.userEmail} with token ${RAW_PATTERNS.plaidProductionToken}`,
      );
      rawError.stack = `Error: Database query failed\n    at connect (${RAW_PATTERNS.databaseUrl}:10:20)\n    at auth (${RAW_PATTERNS.bearerAuth})`;

      const rawEvent: CapturedErrorEvent = {
        id: "err_test_12345",
        timestamp: new Date().toISOString(),
        release: "0.1.0-test",
        environment: "test",
        level: "error",
        message: rawError.message,
        exception: {
          type: "DatabaseError",
          value: rawError.message,
          stack: rawError.stack,
        },
        tags: {
          supportContact: RAW_PATTERNS.protectedInbox,
          userEmailTag: RAW_PATTERNS.userEmail,
        },
        user: {
          id: "usr-123",
          email: RAW_PATTERNS.userEmail,
        },
        request: {
          url: `https://paperworking.co/api/projects?contact=${RAW_PATTERNS.protectedInbox}`,
          method: "POST",
          headers: {
            Authorization: RAW_PATTERNS.bearerAuth,
            Cookie: RAW_PATTERNS.cookieVal,
            "X-Custom-Header": "NormalHeaderValue",
          },
          data: RAW_PATTERNS.requestBody,
          body: RAW_PATTERNS.requestBody,
        },
        extra: {
          connectionString: RAW_PATTERNS.databaseUrl,
          plaidToken: RAW_PATTERNS.plaidSandboxToken,
          requestBody: RAW_PATTERNS.requestBody,
          authorization: RAW_PATTERNS.basicAuth,
          cookies: RAW_PATTERNS.cookieVal,
          inboxTarget: RAW_PATTERNS.protectedInbox,
        },
      };

      const scrubbed = tracker.beforeSend(rawEvent);
      expect(scrubbed).not.toBeNull();

      const serialized = JSON.stringify(scrubbed);

      // --- CRITICAL NEGATIVE ASSERTIONS (Zero Leaks) ---
      // 1. Protected support inbox address MUST NEVER appear
      expect(serialized).not.toContain(RAW_PATTERNS.protectedInbox);

      // 2. Any email-shaped string MUST NEVER appear
      expect(serialized).not.toContain(RAW_PATTERNS.userEmail);

      // 3. Plaid token shapes MUST NEVER appear
      expect(serialized).not.toContain(RAW_PATTERNS.plaidSandboxToken);
      expect(serialized).not.toContain(RAW_PATTERNS.plaidProductionToken);

      // 4. Authorization headers MUST NEVER appear
      expect(serialized).not.toContain(RAW_PATTERNS.bearerAuth);
      expect(serialized).not.toContain(RAW_PATTERNS.basicAuth);

      // 5. Cookie headers MUST NEVER appear
      expect(serialized).not.toContain("super_confidential_session_cookie");
      expect(serialized).not.toContain("__session=");

      // 6. Request bodies MUST NEVER appear
      expect(serialized).not.toContain("MySuperSecretPassword");
      expect(serialized).not.toContain("12-3456789");

      // 7. DATABASE_URL strings MUST NEVER appear
      expect(serialized).not.toContain("UltraSecretPassword123");
      expect(serialized).not.toContain("neon-db.internal");
      expect(serialized).not.toContain("postgres://");

      // --- POSITIVE CONFIRMATION ASSERTIONS ---
      expect(scrubbed!.tags?.supportContact).toBe("[EMAIL_REDACTED]");
      expect(scrubbed!.tags?.userEmailTag).toBe("[EMAIL_REDACTED]");
      expect(scrubbed!.user?.email).toBe("[EMAIL_REDACTED]");
      expect(scrubbed!.request?.headers?.Authorization).toBe("[AUTH_REDACTED]");
      expect(scrubbed!.request?.headers?.Cookie).toBe("[COOKIE_REDACTED]");
      expect(scrubbed!.request?.data).toBe("[REQUEST_BODY_STRIPPED]");
      expect(scrubbed!.request?.body).toBe("[REQUEST_BODY_STRIPPED]");
      expect(scrubbed!.extra?.requestBody).toBe("[REQUEST_BODY_STRIPPED]");
      expect(scrubbed!.extra?.connectionString).toBe("[DATABASE_URL_REDACTED]");
      expect(scrubbed!.extra?.plaidToken).toBe("[PLAID_TOKEN_REDACTED]");
      expect(scrubbed!.extra?.authorization).toBe("[AUTH_REDACTED]");
      expect(scrubbed!.extra?.cookies).toBe("[COOKIE_REDACTED]");
      expect(scrubbed!.extra?.inboxTarget).toBe("[EMAIL_REDACTED]");
    });
  });
});
