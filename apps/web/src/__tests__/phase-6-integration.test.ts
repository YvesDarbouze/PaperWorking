import { WEB_APP_STATUS } from '../index.js';

describe('phase 6 — integration verification status', () => {
  it('retains full web surface from phase 5i', () => {
    expect(WEB_APP_STATUS.adminRoutes).toContain('/admin/agent-crew');
    expect(WEB_APP_STATUS.vendorPortalRoutes).toContain('/vendor-portal');
    expect(WEB_APP_STATUS.dealRoutes.length).toBeGreaterThan(0);
  });
});
