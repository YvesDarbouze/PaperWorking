import { Page } from '@playwright/test';

export interface MockState {
  plan: 'none' | 'individual' | 'team';
  projects: any[];
  notifications: any[];
  auditLogs: any[];
  vendorRequests: any[];
  gdprDeleted: boolean;
}

export function createDefaultState(): MockState {
  return {
    plan: 'none',
    projects: [
      {
        id: 'project_1',
        name: 'Ocean View Apartments',
        address: '100 Ocean Drive',
        status: 'Active',
        currentPhase: 1, // Sourcing / Find & Fund
        financials: {
          monthlyRent: 3500,
          vacancyRatePercent: 5,
          loanAmount: 250000,
          loanInterestRate: 4.5,
          loanTermYears: 30,
          projectedRehabCost: 50000,
          actualRehabCost: 0,
        },
        members: {
          user_123: { role: 'owner' },
        },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      },
      {
        id: 'project_2',
        name: 'Pine Crest Duplex',
        address: '450 Pine Ave',
        status: 'Active',
        currentPhase: 2, // Purchase
        financials: {
          monthlyRent: 2400,
          vacancyRatePercent: 8,
          loanAmount: 180000,
          loanInterestRate: 5.0,
          loanTermYears: 30,
          projectedRehabCost: 20000,
          actualRehabCost: 5000,
        },
        members: {
          user_123: { role: 'owner' },
        },
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
      },
      {
        id: 'project_3',
        name: 'Maplewood Strip Mall',
        address: '12 Maple Blvd',
        status: 'Active',
        currentPhase: 3, // Hold
        financials: {
          monthlyRent: 8500,
          vacancyRatePercent: 10,
          loanAmount: 650000,
          loanInterestRate: 6.2,
          loanTermYears: 25,
          projectedRehabCost: 150000,
          actualRehabCost: 120000,
        },
        members: {
          user_123: { role: 'owner' },
        },
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      },
    ],
    notifications: [],
    auditLogs: [],
    vendorRequests: [],
    gdprDeleted: false,
  };
}

/**
 * Intercepts network calls to provide a reliable, hermetic testing environment
 */
export async function setupMocks(page: Page, state: MockState) {
  // Set session cookie to bypass middleware redirect
  await page.context().addCookies([
    {
      name: '__session',
      value: 'mock_session_token_123',
      domain: 'localhost',
      path: '/',
    },
  ]);

  // 1. Intercept Firebase Client SDK Auth token handshakes & session checks
  await page.route('**/identitytoolkit/v3/relyingparty/verifyPassword**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        localId: 'user_123',
        email: 'testuser@paperworking.com',
        displayName: 'Test User',
        idToken: 'mock_token_123',
        registered: true,
      }),
    });
  });

  await page.route('/api/auth/session', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ status: 200, json: { success: true } });
    } else {
      await route.fulfill({
        status: 200,
        json: {
          user: {
            uid: 'user_123',
            email: 'testuser@paperworking.com',
            displayName: 'Test User',
          },
        },
      });
    }
  });

  // 2. Mock User Profile / Entitlements Check
  await page.route('/api/entitlements/**', async (route) => {
    const isProjectCount = route.request().url().includes('/project-count');
    if (isProjectCount) {
      await route.fulfill({
        status: 200,
        json: { count: state.projects.length },
      });
    } else {
      await route.fulfill({
        status: 200,
        json: {
          plan: state.plan,
          features: {
            unlimited_projects: state.plan !== 'none',
            compare_board: state.plan !== 'none',
            portfolio_rollups: state.plan === 'team',
          },
        },
      });
    }
  });

  // 3. Mock Stripe Payments / Billing portal checkout
  await page.route('/api/stripe/checkout', async (route) => {
    await route.fulfill({
      status: 200,
      json: { url: 'http://localhost:3000/dashboard/settings/billing?success=true' },
    });
  });

  await page.route('/api/stripe/portal', async (route) => {
    await route.fulfill({
      status: 200,
      json: { url: 'https://billing.stripe.com/p/session/mock' },
    });
  });

  // 4. Mock Documents OCR Upload
  await page.route('/api/documents/ocr', async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        success: true,
        extractedFields: {
          closingDate: '2026-06-01',
          purchasePrice: 320000,
          loanAmount: 240000,
          lenderName: 'Apex Mortgage Corp',
        },
      },
    });
  });

  // 5. Mock Projects operations
  await page.route('/api/projects', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        json: { projects: state.projects },
      });
    } else if (method === 'POST') {
      const body = route.request().postDataJSON() || {};
      const newProj = {
        id: `project_${Date.now()}`,
        name: body.name || 'New Project',
        address: body.address || '',
        status: 'Active',
        currentPhase: 1,
        financials: body.financials || {
          monthlyRent: 0,
          vacancyRatePercent: 5,
          loanAmount: 0,
          loanInterestRate: 5.0,
          loanTermYears: 30,
        },
        members: {
          user_123: { role: 'owner' },
        },
        createdAt: new Date().toISOString(),
      };
      
      // Limit to 3 projects on Solo plan
      if (state.plan === 'none' && state.projects.length >= 3) {
        await route.fulfill({
          status: 402,
          json: { error: 'Project limit reached. Please upgrade to Investor or Team plan.' },
        });
      } else {
        state.projects.push(newProj);
        state.auditLogs.push({
          action: 'PROJECT_CREATE',
          projectId: newProj.id,
          userId: 'user_123',
          timestamp: new Date().toISOString(),
        });
        await route.fulfill({
          status: 201,
          json: { success: true, project: newProj },
        });
      }
    }
  });

  await page.route('/api/projects/*', async (route) => {
    const url = route.request().url();
    const projectId = url.split('/').pop() || '';
    const method = route.request().method();

    if (method === 'GET') {
      const project = state.projects.find((p) => p.id === projectId);
      if (project) {
        await route.fulfill({
          status: 200,
          json: { success: true, project },
        });
      } else {
        await route.fulfill({ status: 404, json: { error: 'Project not found' } });
      }
    } else if (method === 'PATCH' || method === 'PUT') {
      const body = route.request().postDataJSON() || {};
      const projIndex = state.projects.findIndex((p) => p.id === projectId);
      
      if (projIndex !== -1) {
        state.projects[projIndex] = {
          ...state.projects[projIndex],
          ...body,
          financials: {
            ...state.projects[projIndex].financials,
            ...(body.financials || {}),
          },
        };
        
        state.auditLogs.push({
          action: 'PROJECT_UPDATE',
          projectId,
          userId: 'user_123',
          changes: body,
          timestamp: new Date().toISOString(),
        });

        // Trigger notification check for NOI negative threshold
        const newNoi = (body.financials?.monthlyRent || 0) * 12 - 5000; // Simulated NOI
        if (newNoi < 0) {
          state.notifications.push({
            id: `notif_${Date.now()}`,
            userId: 'user_123',
            type: 'NOI_NEGATIVE',
            title: 'Critical Alert: NOI is Negative',
            body: `Project ${state.projects[projIndex].name} has fallen into negative NOI.`,
            createdAt: new Date().toISOString(),
          });
        }

        await route.fulfill({
          status: 200,
          json: { success: true, project: state.projects[projIndex] },
        });
      } else {
        await route.fulfill({ status: 404, json: { error: 'Project not found' } });
      }
    } else {
      await route.continue();
    }
  });

  // 6. Mock Email Queue Sender
  await page.route('/api/emails/send', async (route) => {
    await route.fulfill({
      status: 200,
      json: { success: true, messageId: 'resend_msg_999' },
    });
  });

  // 7. Mock Vendor workflows
  await page.route('/api/vendors/quote', async (route) => {
    const body = route.request().postDataJSON() || {};
    const requestObj = {
      id: `req_${Date.now()}`,
      projectId: body.projectId,
      vendorUid: body.vendorUid,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };
    state.vendorRequests.push(requestObj);
    await route.fulfill({
      status: 200,
      json: { success: true, quoteRequest: requestObj },
    });
  });

  await page.route('/api/vendors/accept', async (route) => {
    const body = route.request().postDataJSON() || {};
    const reqIndex = state.vendorRequests.findIndex((r) => r.id === body.requestId);
    
    if (reqIndex !== -1) {
      state.vendorRequests[reqIndex].status = 'accepted';
      
      const projectId = state.vendorRequests[reqIndex].projectId;
      const projIndex = state.projects.findIndex((p) => p.id === projectId);
      if (projIndex !== -1) {
        state.projects[projIndex].members[body.vendorUid] = { role: 'vendor' };
      }
      
      await route.fulfill({
        status: 200,
        json: { success: true, quoteRequest: state.vendorRequests[reqIndex] },
      });
    } else {
      await route.fulfill({ status: 404, json: { error: 'Quote request not found' } });
    }
  });

  // 8. Mock GDPR Delete Endpoint
  await page.route('/api/gdpr/delete', async (route) => {
    state.gdprDeleted = true;
    await route.fulfill({
      status: 200,
      json: { success: true, message: 'Account scheduled for deletion. Will be hard deleted in 24 hours.' },
    });
  });

  // 9. Mock Changelog & Help endpoints
  await page.route('/api/changelog/metadata', async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        latestDate: '2026-05-31',
        entries: [
          { version: '1.0.0', date: '2026-05-31', title: 'PaperWorking Version 1.0.0 Release' },
          { version: '0.9.0', date: '2026-05-15', title: 'PaperWorking Version 0.9.0 Beta' },
        ],
      },
    });
  });
}
