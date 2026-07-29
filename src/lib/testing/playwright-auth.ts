import { BrowserContext, Page } from '@playwright/test';

export async function setupMockAuth(context: BrowserContext, page: Page) {
  await context.addCookies([
    {
      name: '__session',
      value: 'mock_session_token_123',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Strict',
    },
  ]);
  await page.evaluate(() => {
    (window as any).__TEST_MODE__ = true;
    (window as any).__sessionSyncCompleted = true;
  });
}
