import { test as baseTest, expect } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth';

export interface AuthFixtures {
  subscriberPage: import('@playwright/test').Page;
  vendorPage: import('@playwright/test').Page;
  externalPage: import('@playwright/test').Page;
}

export const test = baseTest.extend<AuthFixtures>({
  subscriberPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    await createDevSessionForContext(context, 'investor');
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  vendorPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    await createDevSessionForContext(context, 'vendor');
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  externalPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
