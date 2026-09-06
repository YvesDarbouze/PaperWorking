import type { APIRequestContext, BrowserContext, Page } from '@playwright/test';

export const DEV_MOCK_SESSION_TOKEN = 'mock_session_token_123';

function mockAuthEnabled(): boolean {
  const flag =
    process.env.ENABLE_MOCK_AUTH ??
    process.env.USE_MOCK_DATA ??
    process.env.NEXT_PUBLIC_USE_MOCK_DATA ??
    process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH;
  if (flag === 'false' || flag === '0') return false;
  return flag === 'true' || flag === '1';
}

export async function createDevSession(
  request: APIRequestContext,
  accountType: 'investor' | 'admin' | 'vendor' = 'investor',
): Promise<void> {
  const response = await request.post('/api/auth/session', {
    data: { idToken: DEV_MOCK_SESSION_TOKEN, accountType },
    headers: {
      'Content-Type': 'application/json',
      Origin: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    },
  });

  if (response.ok()) return;

  if (response.status() === 503 && !mockAuthEnabled()) {
    throw new Error(
      'Mock auth is disabled (503). Set ENABLE_MOCK_AUTH=true for dev-session tests, or use authenticateContext/loginViaForm with E2E_EMAIL and E2E_PASSWORD.',
    );
  }

  throw new Error(`Failed to create dev session (${response.status()}): ${await response.text()}`);
}

export async function loginViaForm(
  page: Page,
  options?: { email?: string; password?: string; accountType?: string },
): Promise<void> {
  const email = options?.email ?? process.env.E2E_EMAIL ?? 'investor@paperworking.test';
  const password = options?.password ?? process.env.E2E_PASSWORD ?? 'Password123!';
  const accountType = options?.accountType ?? 'investor';

  await page.goto(`/login?accountType=${accountType}`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill(password);
  await page.locator('button.auth-button-primary[type="submit"]').click();
  await page.waitForURL(/dashboard|pricing|projects/, { timeout: 25000 });
}

/**
 * Authenticate a browser context — mock session when enabled, otherwise Firebase login.
 */
export async function authenticateContext(
  context: BrowserContext,
  accountType: 'investor' | 'admin' | 'vendor' = 'investor',
): Promise<void> {
  if (mockAuthEnabled()) {
    await createDevSession(context.request, accountType);
    return;
  }

  const page = await context.newPage();
  try {
    await loginViaForm(page, { accountType });
  } finally {
    await page.close();
  }
}

export async function createDevSessionForContext(
  context: BrowserContext,
  accountType: 'investor' | 'admin' | 'vendor' = 'investor',
): Promise<void> {
  await authenticateContext(context, accountType);
}
