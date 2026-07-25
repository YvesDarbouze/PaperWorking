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
        phaseStatus: 'Phase 1: Acquisition',
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
        phaseStatus: 'Phase 2: Fund',
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
        phaseStatus: 'Phase 3: Hold',
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

export async function setupMocks(page: Page, state: MockState, options?: { allowAuthRefreshes?: boolean; allowFirestore?: boolean }) {
  const mappedPlan = state.plan === 'individual' ? 'Individual' : state.plan === 'team' ? 'Team' : 'None';

  await page.context().addCookies([
    {
      name: '__session',
      value: 'mock_session_token_123',
      domain: 'localhost',
      path: '/',
    },
    {
      name: '__e2e_test',
      value: '1',
      domain: 'localhost',
      path: '/',
    },
    {
      name: '__e2e_bypass_onboarding',
      value: '1',
      domain: 'localhost',
      path: '/',
    },
    {
      name: 'mock_user_subscription_plan',
      value: mappedPlan,
      domain: 'localhost',
      path: '/',
    },
  ]);

  // 1. Intercept Firebase Client SDK Auth token handshakes & session checks
  if (!options?.allowAuthRefreshes) {
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

    await page.route('**/identitytoolkit/v3/relyingparty/signupNewUser**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          localId: 'user_123',
          email: 'newuser@paperworking.com',
          displayName: 'Test User',
          idToken: 'mock_token_123',
          expiresIn: '3600',
        }),
      });
    });

    await page.route('**/identitytoolkit.googleapis.com/v1/accounts:signUp**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          localId: 'user_123',
          email: 'newuser@paperworking.com',
          displayName: 'Test User',
          idToken: 'mock_token_123',
          expiresIn: '3600',
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
  }

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
  await page.route(/\/api\/(reil\/)?projects(\?|$)/, async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      const url = new URL(route.request().url());
      const queryParam = url.searchParams.get('q') || '';
      let filtered = state.projects;
      if (queryParam) {
        const q = queryParam.toLowerCase();
        filtered = filtered.filter((p: any) =>
          (p.propertyName && p.propertyName.toLowerCase().includes(q)) ||
          (p.address && p.address.toLowerCase().includes(q))
        );
      }
      await route.fulfill({
        status: 200,
        json: { success: true, projects: filtered },
      });
    } else if (method === 'POST') {
      const body = route.request().postDataJSON() || {};
      const newProj = {
        id: `project_${Date.now()}`,
        name: body.name || body.propertyName || 'New Project',
        propertyName: body.propertyName || body.name || 'New Project',
        address: body.address || '',
        status: 'Active',
        currentPhase: 1,
        dispositionType: body.dispositionType || 'RENT',
        ...body,
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

  await page.route(/\/api\/(reil\/)?projects\/([^\/]+)$/, async (route) => {
    const parsedUrl = new URL(route.request().url());
    const projectId = parsedUrl.pathname.split('/').pop() || '';
    const method = route.request().method();

    if (method === 'GET') {
      const project = state.projects.find((p) => p.id === projectId);
      console.log('MOCK GET PROJECT full:', JSON.stringify(project));
      if (project) {
        await route.fulfill({
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
          json: { success: true, project },
        });
      } else {
        await route.fulfill({ status: 404, json: { error: 'Project not found' } });
      }
    } else if (method === 'PATCH' || method === 'PUT') {
      const body = route.request().postDataJSON() || {};
      console.log('MOCK PATCH REQUEST body:', body);
      const projIndex = state.projects.findIndex((p) => p.id === projectId);
      
      if (projIndex !== -1) {
        // Handle dot-notation updates (e.g. 'financials.targetCapRate')
        const updatedFinancials = { ...(state.projects[projIndex].financials || {}) };
        for (const [key, val] of Object.entries(body)) {
          if (key.startsWith('financials.')) {
            const subKey = key.split('.')[1];
            updatedFinancials[subKey] = val;
          }
        }

        state.projects[projIndex] = {
          ...state.projects[projIndex],
          ...body,
          financials: {
            ...state.projects[projIndex].financials,
            ...updatedFinancials,
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

  // Mock project equity-parties endpoint
  await page.route((url) => url.pathname.includes('/projects/') && url.pathname.endsWith('/equity-parties'), async (route) => {
    const urlObj = new URL(route.request().url());
    const parts = urlObj.pathname.split('/');
    const projectId = parts[parts.length - 2];
    const method = route.request().method();

    if (method === 'GET') {
      const project = state.projects.find((p) => p.id === projectId);
      const equityParties = project?.equityParties || [];
      await route.fulfill({
        status: 200,
        json: { success: true, equityParties },
      });
    } else {
      await route.continue();
    }
  });

  // 5.5 Mock Project Commitments endpoints for CrowdfundingTracker E2E
  await page.route(/\/api\/projects\/([^\/]+)\/commitments$/, async (route) => {
    const method = route.request().method();
    const url = new URL(route.request().url());
    const projectId = url.pathname.split('/')[3];
    const key = `pw_e2e_commitments_${projectId}`;

    if (method === 'POST') {
      const body = route.request().postDataJSON() || {};
      const newCommitment = {
        id: `commitment_${Date.now()}`,
        name: body.name,
        email: body.email || null,
        amountCents: body.amountCents,
        status: body.status || 'pledged',
        createdAt: new Date().toISOString(),
      };

      await page.evaluate(({ storageKey, item }) => {
    try {
    const list = JSON.parse(localStorage.getItem(storageKey) || '[]');
            list.push(item);
            localStorage.setItem(storageKey, JSON.stringify(list));
            window.dispatchEvent(new Event(`update_${storageKey}`));
    } catch (e) {}
  }, { storageKey: key, item: newCommitment });

      await route.fulfill({ status: 200, json: { success: true, commitment: newCommitment } });
    } else {
      await route.continue();
    }
  });

  await page.route(/\/api\/projects\/([^\/]+)\/commitments\/([^\/]+)$/, async (route) => {
    const method = route.request().method();
    const url = new URL(route.request().url());
    const parts = url.pathname.split('/');
    const projectId = parts[3];
    const commitmentId = parts[5];
    const key = `pw_e2e_commitments_${projectId}`;

    if (method === 'PATCH') {
      const body = route.request().postDataJSON() || {};
      await page.evaluate(({ storageKey, cId, updates }) => {
    try {
    const list = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const idx = list.findIndex((c: any) => c.id === cId);
            if (idx !== -1) {
              list[idx] = { ...list[idx], ...updates };
              localStorage.setItem(storageKey, JSON.stringify(list));
              window.dispatchEvent(new Event(`update_${storageKey}`));
            }
    } catch (e) {}
  }, { storageKey: key, cId: commitmentId, updates: body });

      await route.fulfill({ status: 200, json: { success: true } });
    } else if (method === 'DELETE') {
      await page.evaluate(({ storageKey, cId }) => {
    try {
    const list = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const updated = list.filter((c: any) => c.id !== cId);
            localStorage.setItem(storageKey, JSON.stringify(updated));
            window.dispatchEvent(new Event(`update_${storageKey}`));
    } catch (e) {}
  }, { storageKey: key, cId: commitmentId });

      await route.fulfill({ status: 200, json: { success: true } });
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

  // 6.5 Mock Invitations endpoints for Guest Portal and walkthroughs
  await page.route(/\/api\/invitations\/([^\/]+)$/, async (route) => {
    const parsedUrl = new URL(route.request().url());
    const token = parsedUrl.pathname.split('/').pop() || '';
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        json: {
          investorName: 'Test Invitee',
          investorEmail: 'sub@paperworking.com',
          dealName: 'Syndication Estate',
          propertyAddress: '100 Ocean Drive, Miami, FL',
          strategy: 'Value-Add',
          assetClass: 'Residential',
          opportunitySummary: 'A solid real estate investment opportunity.',
          purchasePrice: 500000,
          estimatedARV: 600000,
          expectedROI: 12.5,
          investmentAmount: 50000,
          equitySplit: 10,
          interestRate: 6.5,
          termMonths: 120,
          legalEntity: 'Miami Syndication LLC',
          raiseTarget: 100000,
          raiseRaised: 25000,
          raisePercentage: 25,
          daysLeft: 14,
          hoursLeft: 12,
          noiHistory: [],
          capRateHistory: [],
          cashFlowHistory: [],
          burnRateHistory: [],
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: token === 'invite_token_decline' ? 'declined' : 'pending',
          commitmentStatus: 'pending',
          commitmentId: null,
          subscriptionAgreementTemplate: null,
          projectId: 'project_j2_deal',
          inquiries: [],
          cardExchangeStatus: 'none',
          inviteeBusinessCard: null,
          sponsorBusinessCard: null,
          indication: null,
        },
      });
    } else {
      await route.continue();
    }
  });

  await page.route(/\/api\/invitations\/([^\/]+)\/updates$/, async (route) => {
    await route.fulfill({
      status: 200,
      json: { success: true, updates: [] },
    });
  });

  await page.route(/\/api\/invitations\/([^\/]+)\/ask$/, async (route) => {
    await route.fulfill({
      status: 200,
      json: { success: true, inquiry: { id: 'inq_123', status: 'pending', messages: [] } },
    });
  });

  await page.route(/\/api\/invitations\/([^\/]+)\/subscription$/, async (route) => {
    await route.fulfill({
      status: 200,
      json: { success: true },
    });
  });

  await page.route(/\/api\/invitations\/respond$/, async (route) => {
    await route.fulfill({
      status: 200,
      json: { success: true },
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

  // 10. Mock Portfolio metric snapshot endpoint (used by usePortfolioMetricSnapshots)
  await page.route('/api/reports/**', async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        snapshots: [],
        period: 'monthly',
        generatedAt: new Date().toISOString(),
      },
    });
  });

  // 11. Mock REIL / RentCast property data endpoints (server-side data enrichment)
  await page.route('/api/reil/projects/*/property', async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        success: true,
        data: {
          estimatedValue: 350000,
          rentEstimate: 2800,
          comparables: [],
          fetchedAt: new Date().toISOString(),
        },
      },
    });
  });

  // 12. Mock team members / invitations (used by project workspace headers)
  await page.route('/api/team/**', async (route) => {
    await route.fulfill({
      status: 200,
      json: { members: [{ uid: 'user_123', email: 'testuser@paperworking.com', role: 'owner' }] },
    });
  });

  // 13. Mock address autocomplete (used by acquisition wizard address step)
  await page.route('/api/address/autocomplete*', async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        suggestions: [
          { placeId: 'place_1', description: '123 Main St, Los Angeles, CA 90001' },
          { placeId: 'place_2', description: '456 Oak Ave, San Diego, CA 92101' },
        ],
      },
    });
  });

  // 14. Absorb Firebase Auth REST calls — respond with a network error so the SDK
  //     treats the user as signed out (null). This prevents the OnboardingRedirectGuard
  //     from seeing a partial user object that could trigger a /onboarding/intent redirect.
  //     We do NOT return a valid token response here because a spoofed idToken causes
  //     Firebase SDK to attempt Firestore reads as a fake uid, which then returns empty
  //     docs that make the profile appear to exist (with no onboardingIntent) → redirect.
  if (!options?.allowAuthRefreshes) {
    await page.route('**/securetoken.googleapis.com/**', async (route) => {
      await route.abort('failed');
    });
  }

  if (!options?.allowFirestore) {
    // 15. Absorb Firestore gRPC-web calls — return empty responses so onSnapshot listeners
    //     see "no data" and don't trigger profile-driven redirects.
    await page.route('**/firestore.googleapis.com/**', async (route) => {
      await route.abort('failed');
    });
  }
}

/**
 * Navigate to a dashboard route with E2E-safe handling.
 *
 * With __e2e_test=1 cookie set, OnboardingRedirectGuard is disabled and this
 * is a straightforward goto. The 1.5s settle wait gives React time to mount
 * and any residual client-side navigation to complete before assertions begin.
 *
 * If (despite the cookie) we end up on the onboarding page, the fallback
 * clicks "Skip for now" and re-navigates. This is belt-and-suspenders insurance
 * against future changes to the guard logic.
 */
export async function safeGoto(page: import('@playwright/test').Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Allow React hydration to complete (auth state, route guards, layout mounts).
  // 2500ms is generous: parallel workers under CPU pressure can delay hydration
  // to ~2s. Client-rendered elements (EmptyState, Zustand-driven UI) won't
  // appear until hydration is done.
  await page.waitForTimeout(2500);

  // Fallback: if a redirect still happened, attempt to navigate back
  if (page.url().includes('/onboarding')) {
    // Try clicking Skip (requires Firebase user — may be a no-op in test env)
    const skipBtn = page.locator('button').filter({ hasText: /skip for now/i }).first();
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn.click();
      await page.waitForURL('**/dashboard**', { timeout: 8000 }).catch(() => {});
    }
    // Force navigation to the target regardless
    await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);
  }
}
