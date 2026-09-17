import type { APIRequestContext, BrowserContext, Page } from '@playwright/test';

export async function createDevSession(
  request: APIRequestContext,
  accountType: 'investor' | 'admin' | 'vendor' | 'investment_team' = 'investor',
): Promise<void> {
  const port = process.env.PORT ?? '3000';
  const baseUrl = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;
  const effectiveType = accountType === 'investment_team' ? 'admin' : accountType;
  const email = `${effectiveType}@paperworking.test`;
  const password = 'Password123!';

  const response = await request.post(`${baseUrl}/api/auth/session`, {
    data: { email, password, accountType: effectiveType },
    headers: {
      'Content-Type': 'application/json',
      Origin: baseUrl,
      Cookie: '__e2e_test=1',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create session for ${email} (${response.status()}): ${await response.text()}`);
  }
}

export async function loginViaForm(
  page: Page,
  options?: { email?: string; password?: string; accountType?: string },
): Promise<void> {
  const email = options?.email ?? 'e2e@paperworking.test';
  const password = options?.password ?? 'Password123!';
  const accountType = options?.accountType ?? 'investor';

  await page.goto(`/login?accountType=${accountType}`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill(password);
  await page.locator('button.auth-button-primary[type="submit"]').click();
}

export async function createDevSessionForContext(
  context: BrowserContext,
  accountType: 'investor' | 'admin' | 'vendor' | 'investment_team' = 'investor',
): Promise<void> {
  const port = process.env.PORT ?? '3000';
  const baseUrl = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;
  await context.addCookies([
    {
      name: '__e2e_test',
      value: '1',
      url: baseUrl,
    },
  ]);
  await createDevSession(context.request, accountType);
}
