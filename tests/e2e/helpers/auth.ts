import type { APIRequestContext, BrowserContext, Page } from '@playwright/test';

export const DEV_MOCK_SESSION_TOKEN = 'mock_session_token_123';

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

  if (!response.ok()) {
    throw new Error(`Failed to create dev session (${response.status()}): ${await response.text()}`);
  }
}

export async function loginViaForm(
  page: Page,
  options?: { email?: string; password?: string; accountType?: string },
): Promise<void> {
  const email = options?.email ?? 'investor@paperworking.test';
  const password = options?.password ?? 'Password123!';
  const accountType = options?.accountType ?? 'investor';

  await page.goto(`/login?accountType=${accountType}`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill(password);
  await page.locator('button.auth-button-primary[type="submit"]').click();
}

export async function createDevSessionForContext(
  context: BrowserContext,
  accountType: 'investor' | 'admin' | 'vendor' = 'investor',
): Promise<void> {
  await createDevSession(context.request, accountType);
}
