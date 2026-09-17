Run npm run verify

> paperworking-migration@0.1.0 verify
> npm run build && npm run typecheck --workspaces --if-present && npm run test --workspaces --if-present


> paperworking-migration@0.1.0 build
> npm run build:libs && npm --prefix apps/api run build && npm --prefix apps/web run build


> paperworking-migration@0.1.0 build:libs
> npm --prefix packages/shared run build && npm --prefix packages/validation run build && npm --prefix packages/financial-engine run build && npm --prefix packages/authz run build && npm --prefix packages/identity run build && npm --prefix packages/database run build && npm --prefix packages/services run build


> @paperworking/shared@0.1.0 build
> tsc -p tsconfig.json


> @paperworking/validation@0.1.0 build
> tsc -p tsconfig.json


> @paperworking/financial-engine@0.1.0 build
> tsc -p tsconfig.json


> @paperworking/authz@0.1.0 build
> tsc -p tsconfig.json


> @paperworking/identity@0.1.0 build
> tsc -p tsconfig.json


> @paperworking/database@0.1.0 build
> tsc -p tsconfig.json


> @paperworking/services@0.1.0 build
> tsc -p tsconfig.json


> @paperworking/api@0.1.0 build
> tsc -p tsconfig.json && tsc -p tsconfig.declarations.json


> @paperworking/web@0.1.0 build
> next build

⚠ No build cache found. Please configure build caching for faster rebuilds. Read more: https://nextjs.org/docs/messages/no-cache
Attention: Next.js now collects completely anonymous telemetry regarding usage.
This information is used to shape Next.js' roadmap and prioritize features.
You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
https://nextjs.org/telemetry

   ▲ Next.js 15.5.23
   - Experiments (use with caution):
     ✓ externalDir

   Creating an optimized production build ...
 ✓ Compiled successfully in 23.3s
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/60) ...
   Generating static pages (15/60) 
   Generating static pages (30/60) 
   Generating static pages (45/60) 
 ✓ Generating static pages (60/60)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                       Size  First Load JS
┌ ○ /                                          12.6 kB         137 kB
├ ○ /_not-found                                  299 B         103 kB
├ ○ /about                                       187 B         106 kB
├ ƒ /admin                                     3.81 kB         110 kB
├ ƒ /admin/agent-crew                          2.08 kB         105 kB
├ ƒ /admin/analytics                           2.92 kB         106 kB
├ ƒ /admin/audit                               2.45 kB         105 kB
├ ƒ /admin/integrations                        2.42 kB         109 kB
├ ƒ /admin/lender-config                       1.64 kB         105 kB
├ ƒ /admin/marketplace                         2.43 kB         109 kB
├ ƒ /admin/organizations                       2.31 kB         105 kB
├ ƒ /admin/projects                            2.33 kB         105 kB
├ ƒ /admin/subscriptions                       2.56 kB         105 kB
├ ƒ /admin/tickets                             2.47 kB         105 kB
├ ƒ /admin/users                                4.3 kB         107 kB
├ ƒ /api/admin/agent-crew                        299 B         103 kB
├ ƒ /api/admin/agent-crew/[id]                   299 B         103 kB
├ ƒ /api/admin/agent-crew/[id]/impersonate       299 B         103 kB
├ ƒ /api/admin/lender-checklists                 299 B         103 kB
├ ƒ /api/admin/lender-rates                      299 B         103 kB
├ ƒ /api/admin/ops                               299 B         103 kB
├ ƒ /api/admin/rentcast-usage                    299 B         103 kB
├ ƒ /api/admin/users/[id]/account-type           299 B         103 kB
├ ƒ /api/assistant/actions                       299 B         103 kB
├ ƒ /api/assistant/callback                      299 B         103 kB
├ ƒ /api/assistant/chat                          299 B         103 kB
├ ƒ /api/assistant/feedback                      299 B         103 kB
├ ƒ /api/auth/me                                 299 B         103 kB
├ ƒ /api/auth/session                            299 B         103 kB
├ ƒ /api/auth/sessions                           299 B         103 kB
├ ƒ /api/billing                                 299 B         103 kB
├ ƒ /api/billing/cancel                          299 B         103 kB
├ ƒ /api/contact                                 299 B         103 kB
├ ƒ /api/deals                                   299 B         103 kB
├ ƒ /api/deals/[slug]                            299 B         103 kB
├ ƒ /api/deals/broadcast                         299 B         103 kB
├ ƒ /api/deals/exists                            299 B         103 kB
├ ƒ /api/deals/reply                             299 B         103 kB
├ ƒ /api/health                                  299 B         103 kB
├ ƒ /api/inbox                                   299 B         103 kB
├ ƒ /api/inbox/[id]                              299 B         103 kB
├ ƒ /api/insights                                299 B         103 kB
├ ƒ /api/map-tile                                299 B         103 kB
├ ƒ /api/marketplace/deals                       299 B         103 kB
├ ƒ /api/marketplace/investors                   299 B         103 kB
├ ƒ /api/marketplace/investors/[id]              299 B         103 kB
├ ƒ /api/marketplace/investors/follow            299 B         103 kB
├ ƒ /api/marketplace/listings                    299 B         103 kB
├ ƒ /api/marketplace/profile                     299 B         103 kB
├ ƒ /api/marketplace/saved-deals                 299 B         103 kB
├ ƒ /api/places/autocomplete                     299 B         103 kB
├ ƒ /api/places/details                          299 B         103 kB
├ ƒ /api/places/geocode                          299 B         103 kB
├ ƒ /api/portfolio/metrics                       299 B         103 kB
├ ƒ /api/projects                                299 B         103 kB
├ ƒ /api/projects/[id]                           299 B         103 kB
├ ƒ /api/projects/[id]/documents                 299 B         103 kB
├ ƒ /api/projects/[id]/documents/[documentId]    299 B         103 kB
├ ƒ /api/projects/[id]/kpis/current              299 B         103 kB
├ ƒ /api/reports/[period]                        299 B         103 kB
├ ƒ /api/reports/generate                        299 B         103 kB
├ ƒ /api/reports/portfolio                       299 B         103 kB
├ ƒ /api/settings/profile                        299 B         103 kB
├ ƒ /api/street-view                             299 B         103 kB
├ ƒ /api/stripe/checkout                         299 B         103 kB
├ ƒ /api/stripe/portal                           299 B         103 kB
├ ƒ /api/stripe/session-status                   299 B         103 kB
├ ƒ /api/team/invite                             299 B         103 kB
├ ƒ /api/team/invites                            299 B         103 kB
├ ƒ /api/team/members                            299 B         103 kB
├ ƒ /api/team/members/[id]                       299 B         103 kB
├ ƒ /api/vendor-portal/profile                   299 B         103 kB
├ ƒ /api/vendor-portal/requests                  299 B         103 kB
├ ƒ /api/vendors                                 299 B         103 kB
├ ○ /apple-icon.png                                0 B            0 B
├ ○ /auth/action                                6.4 kB         126 kB
├ ○ /auth/callback                               801 B         104 kB
├ ○ /careers                                     299 B         103 kB
├ ○ /changelog                                   187 B         106 kB
├ ○ /contact                                   1.66 kB         108 kB
├ ○ /cookies                                     187 B         106 kB
├ ƒ /dashboard                                 5.81 kB         142 kB
├ ƒ /dashboard/command-center                    299 B         103 kB
├ ƒ /dashboard/deals                             132 B         116 kB
├ ƒ /dashboard/inbox                           5.91 kB         117 kB
├ ƒ /dashboard/insights                        5.53 kB         130 kB
├ ƒ /dashboard/marketplace                     8.37 kB         144 kB
├ ƒ /dashboard/marketplace/investors/[id]      1.89 kB         108 kB
├ ƒ /dashboard/profile                         4.27 kB         114 kB
├ ƒ /dashboard/projects                          299 B         103 kB
├ ƒ /dashboard/projects/[id]                     299 B         103 kB
├ ƒ /dashboard/reports                          6.6 kB         131 kB
├ ƒ /dashboard/settings                        3.84 kB         110 kB
├ ƒ /dashboard/settings/billing                5.27 kB         112 kB
├ ƒ /dashboard/settings/profile                5.92 kB         127 kB
├ ƒ /dashboard/team                            7.03 kB         132 kB
├ ƒ /deals                                       131 B         116 kB
├ ƒ /deals/[slug]                               4.3 kB         129 kB
├ ƒ /deals/[slug]/detail                       4.85 kB         111 kB
├ ƒ /deals/[slug]/external                     4.58 kB         111 kB
├ ○ /forgot-password                           2.19 kB         121 kB
├ ○ /help                                        187 B         106 kB
├ ● /help/[slug]                                 187 B         106 kB
├   ├ /help/first-deal-setup
├   ├ /help/irr-and-metrics
├   ├ /help/vendor-quotes
├   └ [+2 more paths]
├ ○ /home                                        299 B         103 kB
├ ○ /how-it-works                              5.92 kB         112 kB
├ ○ /icon.png                                      0 B            0 B
├ ƒ /invite                                      187 B         106 kB
├ ○ /login                                     5.42 kB         154 kB
├ ○ /login/finish                               1.5 kB         108 kB
├ ○ /manifest.webmanifest                        299 B         103 kB
├ ƒ /marketplace/[dealId]                      13.6 kB         157 kB
├ ○ /marketplaces                              3.01 kB         109 kB
├ ○ /pricing                                   6.26 kB         131 kB
├ ○ /privacy                                     187 B         106 kB
├ ƒ /project/[id]                              8.32 kB         118 kB
├ ƒ /project/[id]/documents                    2.29 kB         109 kB
├ ƒ /project/[id]/insights                     1.71 kB         108 kB
├ ƒ /project/[id]/reports                      3.79 kB         107 kB
├ ƒ /project/[id]/scorecard                    1.26 kB         107 kB
├ ƒ /project/[id]/underwriting                 19.8 kB         139 kB
├ ƒ /projects                                   6.9 kB         113 kB
├ ƒ /projects/[id]                               299 B         103 kB
├ ƒ /projects/new                              6.53 kB         135 kB
├ ƒ /register                                    299 B         103 kB
├ ○ /signup                                    2.34 kB         109 kB
├ ○ /subprocessors                               299 B         103 kB
├ ○ /support                                   10.5 kB         135 kB
├ ○ /support/glossary                          10.3 kB         135 kB
├ ○ /support/metrics                           9.18 kB         134 kB
├ ○ /terms                                       187 B         106 kB
├ ƒ /vendor-portal                             4.83 kB         108 kB
└ ƒ /vendor-portal/profile                     1.94 kB         105 kB
+ First Load JS shared by all                   103 kB
  ├ chunks/18-cb927b19648628ba.js              46.4 kB
  ├ chunks/87c73c54-24122e7b92478d00.js        54.2 kB
  └ other shared chunks (total)                2.18 kB


ƒ Middleware                                   32.4 kB

○  (Static)   prerendered as static content
●  (SSG)      prerendered as static HTML (uses generateStaticParams)
ƒ  (Dynamic)  server-rendered on demand


> @paperworking/api@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit


> @paperworking/web@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit


> @paperworking/authz@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit


> @paperworking/database@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit


> @paperworking/financial-engine@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit


> @paperworking/identity@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit


> @paperworking/services@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit


> @paperworking/shared@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit


> @paperworking/validation@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit


> @paperworking/integration@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit


> @paperworking/api@0.1.0 test
> node --experimental-vm-modules ../../node_modules/jest/bin/jest.js

(node:3167) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS src/__tests__/phase-4z-handlers.test.ts
(node:3166) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS src/__tests__/phase-4aa-handlers.test.ts
PASS src/__tests__/phase-4m-handlers.test.ts
PASS src/__tests__/phase-4x-handlers.test.ts
PASS src/__tests__/sendgrid-webhooks.test.ts
  ● Console

    console.warn
      [SendGrid Webhook] Signature verification failed

      104 |
      105 |       if (!isValid) {
    > 106 |         console.warn('[SendGrid Webhook] Signature verification failed');
          |                 ^
      107 |         return jsonResponse(401, { error: 'Invalid signature' });
      108 |       }
      109 |     }

      at handleSendGridWebhookPost (src/routes/webhooks/sendgrid/handler.ts:106:17)
      at Object.<anonymous> (src/__tests__/sendgrid-webhooks.test.ts:135:26)

    console.error
      [Inbound Email Webhook] INBOUND_EMAIL_WEBHOOK_SECRET not configured — rejecting request

      27 |
      28 |   if (!emailSecret) {
    > 29 |     console.error(
         |             ^
      30 |       '[Inbound Email Webhook] INBOUND_EMAIL_WEBHOOK_SECRET not configured — rejecting request',
      31 |     );
      32 |     return jsonResponse(503, { error: 'Webhook endpoint not configured' });

      at handleInboundEmailsWebhookPost (src/routes/webhooks/emails/handler.ts:29:13)
      at Object.<anonymous> (src/__tests__/sendgrid-webhooks.test.ts:151:32)

PASS src/__tests__/phase-4k-handlers.test.ts
  ● Console

    console.error
      [POST /api/contact] Additive ticket creation error: Error: firestore down
          at Object.createSupportTicket (/home/runner/work/PaperWorking/PaperWorking/apps/api/src/__tests__/phase-4k-handlers.test.ts:42:17)
          at handleContactPost (/home/runner/work/PaperWorking/PaperWorking/apps/api/src/routes/public/contact/handler.ts:42:20)
          at Object.<anonymous> (/home/runner/work/PaperWorking/PaperWorking/apps/api/src/__tests__/phase-4k-handlers.test.ts:38:26)
          at Promise.then.completed (/home/runner/work/PaperWorking/PaperWorking/node_modules/jest-circus/build/utils.js:298:28)
          at new Promise (<anonymous>)
          at callAsyncCircusFn (/home/runner/work/PaperWorking/PaperWorking/node_modules/jest-circus/build/utils.js:231:10)
          at _callCircusTest (/home/runner/work/PaperWorking/PaperWorking/node_modules/jest-circus/build/run.js:316:40)
          at processTicksAndRejections (node:internal/process/task_queues:103:5)
          at _runTest (/home/runner/work/PaperWorking/PaperWorking/node_modules/jest-circus/build/run.js:252:3)
          at _runTestsForDescribeBlock (/home/runner/work/PaperWorking/PaperWorking/node_modules/jest-circus/build/run.js:126:9)
          at _runTestsForDescribeBlock (/home/runner/work/PaperWorking/PaperWorking/node_modules/jest-circus/build/run.js:121:9)
          at run (/home/runner/work/PaperWorking/PaperWorking/node_modules/jest-circus/build/run.js:71:3)
          at runAndTransformResultsToJestFormat (/home/runner/work/PaperWorking/PaperWorking/node_modules/jest-circus/build/legacy-code-todo-rewrite/jestAdapterInit.js:122:21)
          at jestAdapter (/home/runner/work/PaperWorking/PaperWorking/node_modules/jest-circus/build/legacy-code-todo-rewrite/jestAdapter.js:79:19)
          at runTestInternal (/home/runner/work/PaperWorking/PaperWorking/node_modules/jest-runner/build/runTest.js:367:16)
          at runTest (/home/runner/work/PaperWorking/PaperWorking/node_modules/jest-runner/build/runTest.js:444:34)
          at Object.worker (/home/runner/work/PaperWorking/PaperWorking/node_modules/jest-runner/build/testWorker.js:106:12)

      49 |         });
      50 |       } catch (dbErr: unknown) {
    > 51 |         console.error('[POST /api/contact] Additive ticket creation error:', dbErr);
         |                 ^
      52 |       }
      53 |     }
      54 |

      at handleContactPost (src/routes/public/contact/handler.ts:51:17)
      at Object.<anonymous> (src/__tests__/phase-4k-handlers.test.ts:38:20)

PASS src/__tests__/phase-4q-handlers.test.ts
PASS src/__tests__/firebase-auth-parallel.test.ts
  ● Console

    console.warn
      [CSRF] Rejected — Sec-Fetch-Site: cross-site

      87 |   const fetchSite = request.headers.get('sec-fetch-site');
      88 |   if (fetchSite === 'cross-site') {
    > 89 |     console.warn('[CSRF] Rejected — Sec-Fetch-Site: cross-site');
         |             ^
      90 |     return { ok: false, status: 403, reason: 'Cross-site request rejected' };
      91 |   }
      92 |

      at validateCsrf (../../packages/authz/src/csrf.ts:89:13)
      at Object.<anonymous> (src/__tests__/firebase-auth-parallel.test.ts:150:18)

[Nest] 3167  - 09/08/2026, 7:22:59 AM    WARN [AuthService] createSession verify failed
[Nest] 3167  - 09/08/2026, 7:22:59 AM    WARN [AuthService] createSession verify failed
PASS src/__tests__/phase-4y-handlers.test.ts
PASS src/__tests__/phase-4o-handlers.test.ts
PASS src/__tests__/admin-read.test.ts
PASS src/__tests__/phase-4m-libs.test.ts
PASS src/__tests__/phase-4s-handlers.test.ts
PASS src/__tests__/sprint2-p2-stripe-webhook.test.ts
PASS src/__tests__/phase-4w-handlers.test.ts
PASS src/__tests__/phase-4v-handlers.test.ts
PASS src/__tests__/phase-4p-handlers.test.ts
  ● Console

    console.warn
      [Places Validate] Address Validation API failed, using fallback parsing: Error: upstream down
          at Object.validateAddress (/home/runner/work/PaperWorking/PaperWorking/apps/api/src/__tests__/phase-4p-handlers.test.ts:68:17)
          at handlePlacesValidatePost (/home/runner/work/PaperWorking/PaperWorking/apps/api/src/routes/places/validate/handler.ts:60:20)
          at processTicksAndRejections (node:internal/process/task_queues:103:5)
          at Object.<anonymous> (/home/runner/work/PaperWorking/PaperWorking/apps/api/src/__tests__/phase-4p-handlers.test.ts:62:20)

      64 |     return jsonResponse(200, mapped);
      65 |   } catch (error: unknown) {
    > 66 |     console.warn('[Places Validate] Address Validation API failed, using fallback parsing:', error);
         |             ^
      67 |     return jsonResponse(200, parseAddressFallback(address));
      68 |   }
      69 | }

      at handlePlacesValidatePost (src/routes/places/validate/handler.ts:66:13)
      at Object.<anonymous> (src/__tests__/phase-4p-handlers.test.ts:62:20)

(node:3169) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS src/__tests__/stripe.test.ts
  ● Console

    console.error
      Stripe Webhook Signature Verification Failed: Invalid signature

      33 |   } catch (err: unknown) {
      34 |     const message = err instanceof Error ? err.message : String(err);
    > 35 |     console.error('Stripe Webhook Signature Verification Failed:', message);
         |             ^
      36 |     return jsonResponse(400, { error: `Webhook Error: ${message}` });
      37 |   }
      38 |

      at handleStripeWebhookPost (src/routes/stripe/webhook/handler.ts:35:13)
      at Object.<anonymous> (src/__tests__/stripe.test.ts:192:26)

PASS src/__tests__/cron.test.ts
PASS src/__tests__/sprint2-p0-stripe.test.ts
PASS src/__tests__/phase-4l-handlers.test.ts
  ● Console

    console.error
      [DocuSign Webhook] DOCUSIGN_WEBHOOK_HMAC_KEY not configured — rejecting request

      27 |   const hmacKey = deps.hmacKey;
      28 |   if (!hmacKey) {
    > 29 |     console.error('[DocuSign Webhook] DOCUSIGN_WEBHOOK_HMAC_KEY not configured — rejecting request');
         |             ^
      30 |     return jsonResponse(503, { error: 'Webhook endpoint not configured' });
      31 |   }
      32 |

      at handleDocuSignWebhookPost (src/routes/webhooks/docusign/handler.ts:29:13)
      at Object.<anonymous> (src/__tests__/phase-4l-handlers.test.ts:95:26)

PASS src/__tests__/sprint2-p1-billing.test.ts
PASS src/__tests__/phase-4aa-libs.test.ts
PASS src/__tests__/phase-4r-handlers.test.ts
PASS src/__tests__/phase-4q-libs.test.ts
PASS src/__tests__/marketplace-deals.test.ts
PASS src/__tests__/phase-4n-handlers.test.ts
PASS src/__tests__/marketplace-handlers.test.ts
PASS src/__tests__/phase-4l-libs.test.ts
PASS src/__tests__/sprint2-p0-tasks.test.ts
PASS src/__tests__/phase-4k-libs.test.ts
PASS src/__tests__/phase-4z-libs.test.ts
PASS src/__tests__/sprint2-p1-inbox.test.ts
PASS src/__tests__/account-type-escalation.test.ts
PASS src/__tests__/firebase-auth-session.test.ts
PASS src/__tests__/phase-4p-libs.test.ts
[Nest] 3169  - 09/08/2026, 7:23:02 AM    WARN [AuthService] createSession verify failed
PASS src/__tests__/phase-4o-libs.test.ts
PASS src/__tests__/phase-4n-libs.test.ts
PASS src/__tests__/phase-4s-libs.test.ts
PASS src/__tests__/sprint2-p1-deals.test.ts
PASS src/__tests__/sprint2-p2-settings-kpi-auth.test.ts
PASS src/__tests__/auth-session.test.ts
  ● Console

    console.warn
      [CSRF] Rejected — Sec-Fetch-Site: cross-site

      87 |   const fetchSite = request.headers.get('sec-fetch-site');
      88 |   if (fetchSite === 'cross-site') {
    > 89 |     console.warn('[CSRF] Rejected — Sec-Fetch-Site: cross-site');
         |             ^
      90 |     return { ok: false, status: 403, reason: 'Cross-site request rejected' };
      91 |   }
      92 |

      at validateCsrf (../../packages/authz/src/csrf.ts:89:13)
      at validateCsrfFromRequest (src/routes/auth/session/handler.ts:67:10)
      at handleSessionPost (src/routes/auth/session/handler.ts:114:16)
      at Object.<anonymous> (src/__tests__/auth-session.test.ts:24:26)

PASS src/__tests__/sprint2-p1-reports.test.ts
PASS src/__tests__/phase-4u-handlers.test.ts
PASS src/__tests__/sprint2-p0-vendor.test.ts
PASS src/__tests__/phase-4t-handlers.test.ts
PASS src/__tests__/phase-4t-libs.test.ts
PASS src/__tests__/phase-4w-libs.test.ts
PASS src/__tests__/sprint2-p2-messages.test.ts
PASS src/__tests__/sprint2-p0-live-smoke.test.ts
PASS src/__tests__/phase-4r-libs.test.ts
PASS src/__tests__/sprint1-p0-live-smoke.test.ts
PASS src/__tests__/sprint2-p1-roles-mockflags.test.ts
PASS src/__tests__/phase-4y-libs.test.ts
PASS src/__tests__/phase-4v-libs.test.ts
PASS src/__tests__/phase-4u-libs.test.ts
PASS src/__tests__/phase-4x-libs.test.ts
PASS src/__tests__/prelaunch-gates.test.ts
PASS src/__tests__/organizations-create.test.ts
PASS src/__tests__/sprint2-p2-portfolio-insights.test.ts
PASS src/__tests__/sprint2-p2-vendor-org.test.ts
PASS src/__tests__/sprint1-p0-authz.test.ts
PASS src/__tests__/nest-wave1-smoke.test.ts
PASS src/__tests__/health.test.ts
PASS src/__tests__/auth-sessions.test.ts
PASS src/__tests__/project-get.test.ts
PASS src/__tests__/prelaunch-investor-email.test.ts
PASS src/__tests__/auth-me.test.ts
PASS src/__tests__/insights.test.ts
PASS src/__tests__/reports-generate.test.ts
PASS src/__tests__/attorney-states.test.ts
PASS src/__tests__/reports-portfolio.test.ts
PASS src/__tests__/csrf.test.ts
  ● Console

    console.warn
      [CSRF] Rejected — Sec-Fetch-Site: cross-site

      87 |   const fetchSite = request.headers.get('sec-fetch-site');
      88 |   if (fetchSite === 'cross-site') {
    > 89 |     console.warn('[CSRF] Rejected — Sec-Fetch-Site: cross-site');
         |             ^
      90 |     return { ok: false, status: 403, reason: 'Cross-site request rejected' };
      91 |   }
      92 |

      at validateCsrf (../../packages/authz/src/csrf.ts:89:13)
      at Object.<anonymous> (src/__tests__/csrf.test.ts:27:20)

PASS src/__tests__/portfolio-metrics.test.ts
PASS src/__tests__/broadcast-token.test.ts
PASS src/__tests__/nest-firestore-boot.test.ts
A worker process has failed to exit gracefully and has been force exited. This is likely caused by tests leaking due to improper teardown. Try running with --detectOpenHandles to find leaks. Active timers can also cause this, ensure that .unref() was called on them.

Test Suites: 76 passed, 76 total
Tests:       516 passed, 516 total
Snapshots:   0 total
Time:        10.635 s
Ran all test suites.
Force exiting Jest: Have you considered using `--detectOpenHandles` to detect async operations that kept running after all tests finished?

> @paperworking/web@0.1.0 test
> node --experimental-vm-modules ../../node_modules/jest/bin/jest.js

jest-haste-map: Haste module naming collision: @paperworking/web
  The following files share their name; please adjust your hasteImpl:
    * <rootDir>/package.json
    * <rootDir>/.next/standalone/apps/web/package.json

(node:3228) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:3227) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS src/__tests__/phase-b9-project-kpi-read.test.ts (7.257 s)
PASS src/__tests__/phase-9b-auth-me.test.ts (7.339 s)
(node:3234) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS src/__tests__/phase-9c-auth-sessions.test.ts (7.275 s)
PASS src/__tests__/phase-b10-deals.test.ts
PASS src/__tests__/phase-b7-team-mutations.test.ts
PASS src/__tests__/phase-b8-project-writes.test.ts
PASS src/__tests__/phase-b7-1-team-ui-integration.test.ts
PASS src/__tests__/phase-b11-marketplace-vendor-read.test.ts
PASS src/__tests__/firestore-handler-deps.test.ts
PASS src/__tests__/phase-b4-team-members-read.test.ts
PASS src/__tests__/phase-b3-portfolio-metrics-read.test.ts
PASS src/__tests__/phase-b5-marketplace-profile-read.test.ts
FAIL src/__tests__/phase-b6-inbox-mutations.test.ts
  ● phase B6 — InboxNotificationCenter transport › uses bffFetch not apiFetch for PATCH/DELETE /api/inbox/:id

    expect(received).toContain(expected) // indexOf

    Expected substring: "bffFetch(`/api/inbox/${id}`"
    Received string:    "'use client';·
    import Link from 'next/link';
    import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
    import ComposeEmailModal from '@/components/inbox/ComposeEmailModal';
    import InboxItemCard from '@/components/inbox/InboxItemCard';
    import InboxTabs from '@/components/inbox/InboxTabs';
    import {
      INBOX_TABS,
      INBOX_THREADS,
      type InboxTabId,
      type InboxThread,
    } from '@/lib/dashboard/shell-seed';·
    function emptyCounts(): Record<InboxTabId, number> {
      return {
        all: 0,
        opportunities: 0,
        tasks: 0,
        vendor: 0,
        team: 0,
        system: 0,
      };
    }·
    function NotifMoreMenu({
      item,
      isUnread,
      onMarkUnreadToggle,
      onArchive,
      onDelete,
    }: {
      item: InboxThread;
      isUnread: boolean;
      onMarkUnreadToggle: () => void;
      onArchive: () => void;
      onDelete: () => void;
    }) {
      const [open, setOpen] = useState(false);
      const ref = useRef<HTMLDivElement>(null);·
      useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
          if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
      }, [open]);·
      return (
        <div ref={ref} className=\"relative\">
          <button
            type=\"button\"
            id=\"notif-more-menu-trigger\"
            onClick={() => setOpen((v) => !v)}
            className=\"cursor-pointer rounded-lg p-2 text-[#9E9DA0] transition-colors hover:bg-white/5\"
            aria-label=\"Notification actions\"
            aria-expanded={open}
          >
            <span className=\"material-symbols-outlined\">more_vert</span>
          </button>
          {open ? (
            <div
              id=\"notif-more-menu\"
              role=\"menu\"
              className=\"absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#161318] py-1 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.6)]\"
            >
              <button
                type=\"button\"
                role=\"menuitem\"
                onClick={() => {
                  onMarkUnreadToggle();
                  setOpen(false);
                }}
                className=\"flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-[#9E9DA0] transition-colors hover:bg-white/5 hover:text-white\"
              >
                <span className=\"material-symbols-outlined text-base\">
                  {isUnread ? 'drafts' : 'mark_email_unread'}
                </span>
                {isUnread ? 'Mark as Read' : 'Mark as Unread'}
              </button>
              <div className=\"my-1 border-t border-white/5\" />
              <button
                type=\"button\"
                role=\"menuitem\"
                onClick={() => {
                  onArchive();
                  setOpen(false);
                }}
                className=\"flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-[#9E9DA0] transition-colors hover:bg-white/5 hover:text-white\"
              >
                <span className=\"material-symbols-outlined text-base\">archive</span>
                Archive
              </button>
              <button
                type=\"button\"
                role=\"menuitem\"
                onClick={() => {
                  onDelete();
                  setOpen(false);
                }}
                className=\"flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-red-400/80 transition-colors hover:bg-white/5 hover:text-red-400\"
              >
                <span className=\"material-symbols-outlined text-base\">delete</span>
                Delete
              </button>
            </div>
          ) : null}
        </div>
      );
    }·
    /**
     * Unified Inbox — port of PaperWorking `/dashboard/inbox` notification center
     * (two-pane list + reading pane, tabs, compose, mark-all-read).
     */
    export default function InboxNotificationCenter() {
      const [items, setItems] = useState<InboxThread[]>(() => [...INBOX_THREADS]);
      const [activeTab, setActiveTab] = useState<InboxTabId>('all');
      const [selectedId, setSelectedId] = useState<string | null>(null);
      const [searchQuery, setSearchQuery] = useState('');
      const [composeOpen, setComposeOpen] = useState(false);
      const [readOverrides, setReadOverrides] = useState<Record<string, boolean>>({});
      const [archivedIds, setArchivedIds] = useState<Set<string>>(() => new Set());
      const [actionFlash, setActionFlash] = useState<string | null>(null);·
      const isUnread = useCallback(
        (item: InboxThread) => {
          if (item.id in readOverrides) return !readOverrides[item.id];
          return item.unread;
        },
        [readOverrides],
      );·
      const visibleItems = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return items.filter((item) => {
          if (archivedIds.has(item.id)) return false;
          if (activeTab !== 'all' && item.tab !== activeTab) return false;
          if (!q) return true;
          return (
            item.subject.toLowerCase().includes(q) ||
            item.body.toLowerCase().includes(q) ||
            item.from.toLowerCase().includes(q) ||
            item.project.toLowerCase().includes(q)
          );
        });
      }, [items, archivedIds, activeTab, searchQuery]);·
      const unreadCounts = useMemo(() => {
        const counts = emptyCounts();
        for (const item of items) {
          if (archivedIds.has(item.id) || !isUnread(item)) continue;
          counts.all += 1;
          counts[item.tab] += 1;
        }
        return counts;
      }, [items, archivedIds, isUnread]);·
      const unreadTotal = unreadCounts.all;
      const selectedItem = visibleItems.find((i) => i.id === selectedId) ?? null;
      const selectedUnread = selectedItem ? isUnread(selectedItem) : false;·
      function markRead(id: string) {
        setReadOverrides((prev) => ({ ...prev, [id]: true }));
      }·
      function markUnread(id: string) {
        setReadOverrides((prev) => ({ ...prev, [id]: false }));
      }·
      function markAllRead() {
        const next: Record<string, boolean> = { ...readOverrides };
        for (const item of items) {
          if (!archivedIds.has(item.id)) next[item.id] = true;
        }
        setReadOverrides(next);
      }·
      function archiveItem(id: string) {
        setArchivedIds((prev) => new Set(prev).add(id));
        if (selectedId === id) setSelectedId(null);
      }·
      function deleteItem(id: string) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        if (selectedId === id) setSelectedId(null);
      }·
      function selectItem(id: string) {
        setSelectedId(id);
        markRead(id);
      }·
      function executeAction() {
        if (!selectedItem) return;
        setActionFlash(`Action queued for “${selectedItem.subject}” (seed preview).`);
        markRead(selectedItem.id);
        setTimeout(() => setActionFlash(null), 2500);
      }·
      const showDetail = Boolean(selectedItem);·
      return (
        <>
          <div
            className=\"-mb-24 flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-[#0d0a0b] text-[#9E9DA0] md:-mb-8\"
            data-testid=\"inbox-notification-center\"
          >
            {/* List pane */}
            <section
              className={`w-full shrink-0 flex-col border-r border-white/10 bg-[#161318]/50 md:flex md:w-[420px] ${
                showDetail ? 'hidden md:flex' : 'flex'
              }`}
            >
              <div className=\"space-y-4 p-6\">
                <div className=\"flex items-center justify-between\">
                  <h1 className=\"text-2xl font-bold text-[#fdfffc]\">Inbox</h1>
                  <div className=\"flex items-center gap-2\">
                    {unreadTotal > 0 ? (
                      <span className=\"rounded border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300\">
                        {unreadTotal} UNREAD
                      </span>
                    ) : null}
                    {unreadTotal > 0 ? (
                      <button
                        type=\"button\"
                        onClick={markAllRead}
                        className=\"cursor-pointer rounded-lg p-1.5 text-[#9E9DA0] transition-colors hover:bg-white/5 hover:text-emerald-300\"
                        title=\"Mark all as read\"
                      >
                        <span className=\"material-symbols-outlined text-[18px]\">done_all</span>
                      </button>
                    ) : null}
                    <button
                      type=\"button\"
                      onClick={() => setComposeOpen(true)}
                      className=\"cursor-pointer rounded-lg p-1.5 text-[#9E9DA0] transition-colors hover:bg-white/5 hover:text-emerald-300\"
                      title=\"Compose email\"
                    >
                      <span className=\"material-symbols-outlined text-[18px]\">add</span>
                    </button>
                  </div>
                </div>·
                <div className=\"relative\">
                  <span className=\"material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-[#9E9DA0]\">
                    search
                  </span>
                  <input
                    type=\"text\"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder=\"Search logs...\"
                    className=\"w-full rounded-lg border border-[#3c4a46] bg-[#0d0a0b] py-2 pl-10 pr-4 text-sm text-[#9E9DA0] outline-none transition-all placeholder:text-[#9E9DA0]/40 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/30\"
                  />
                </div>
              </div>·
              <InboxTabs
                activeTab={activeTab}
                onTabChange={(tab) => {
                  setActiveTab(tab);
                  setSelectedId(null);
                }}
                unreadCounts={unreadCounts}
              />·
              <div className=\"relative flex-1 overflow-y-auto\">
                {visibleItems.length === 0 ? (
                  <div className=\"flex flex-col items-center justify-center px-6 py-16 text-center\">
                    <span className=\"material-symbols-outlined mb-3 text-5xl opacity-20\">inbox</span>
                    <p className=\"text-sm font-medium text-white/60\">No items in this view</p>
                    <p className=\"mt-1 text-xs text-white/35\">
                      {searchQuery
                        ? 'Try a different search.'
                        : 'You’re caught up — new alerts will land here.'}
                    </p>
                  </div>
                ) : (
                  visibleItems.map((item) => (
                    <InboxItemCard
                      key={item.id}
                      item={item}
                      isUnread={isUnread(item)}
                      isActive={selectedId === item.id}
                      onSelect={() => selectItem(item.id)}
                      onArchive={() => archiveItem(item.id)}
                      onDelete={() => deleteItem(item.id)}
                    />
                  ))
                )}
              </div>
            </section>·
            {/* Reading pane */}
            <section
              className={`relative flex flex-1 flex-col overflow-hidden bg-[#0d0a0b] ${
                showDetail ? 'flex' : 'hidden md:flex'
              }`}
            >
              <div className=\"pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-[#454955]/5 blur-[100px]\" />
              <div className=\"pointer-events-none absolute bottom-20 left-20 h-64 w-64 rounded-full bg-[#7A9EAA]/5 blur-[80px]\" />·
              {selectedItem ? (
                <div className=\"z-10 flex flex-1 flex-col overflow-y-auto\">
                  <div className=\"flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0d0a0b]/50 px-6 py-5 backdrop-blur-sm sm:px-8 sm:py-6\">
                    <div className=\"flex min-w-0 items-center gap-4\">
                      <button
                        type=\"button\"
                        onClick={() => setSelectedId(null)}
                        className=\"cursor-pointer rounded-lg p-2 text-[#9E9DA0] transition-colors hover:bg-white/5 md:hidden\"
                        aria-label=\"Back\"
                      >
                        <span className=\"material-symbols-outlined\">arrow_back</span>
                      </button>
                      <div className=\"flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#0d0a0b]/60 text-emerald-400 shadow-[inset_1px_1px_0px_rgba(255,255,255,0.05)]\">
                        <span className=\"material-symbols-outlined text-[24px]\">mark_email_read</span>
                      </div>
                      <div className=\"min-w-0\">
                        <h2 className=\"truncate text-xl font-bold text-[#fdfffc] sm:text-2xl\">
                          {selectedItem.subject}
                        </h2>
                        <p className=\"font-mono text-[10px] uppercase text-[#454955]\">
                          ID: {selectedItem.id.slice(0, 8)} · STATUS:{' '}
                          {selectedUnread ? 'UNREAD' : 'READ'}
                        </p>
                      </div>
                    </div>
                    <div className=\"flex gap-1\">
                      <button
                        type=\"button\"
                        onClick={() => archiveItem(selectedItem.id)}
                        className=\"cursor-pointer rounded-lg p-2 text-[#9E9DA0] transition-colors hover:bg-white/5\"
                        title=\"Archive\"
                      >
                        <span className=\"material-symbols-outlined\">archive</span>
                      </button>
                      <button
                        type=\"button\"
                        onClick={() => deleteItem(selectedItem.id)}
                        className=\"cursor-pointer rounded-lg p-2 text-[#9E9DA0] transition-colors hover:bg-white/5\"
                        title=\"Delete\"
                      >
                        <span className=\"material-symbols-outlined\">delete</span>
                      </button>
                      <NotifMoreMenu
                        item={selectedItem}
                        isUnread={selectedUnread}
                        onMarkUnreadToggle={() =>
                          selectedUnread ? markRead(selectedItem.id) : markUnread(selectedItem.id)
                        }
                        onArchive={() => archiveItem(selectedItem.id)}
                        onDelete={() => deleteItem(selectedItem.id)}
                      />
                    </div>
                  </div>·
                  <div className=\"flex-1 overflow-y-auto p-6 sm:p-8\">
                    <div className=\"mx-auto max-w-3xl space-y-8\">
                      <div className=\"flex items-start gap-4\">
                        <div className=\"flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#454955]/20 bg-[#161318] text-lg font-bold text-[#454955]\">
                          {selectedItem.from[0]}
                        </div>
                        <div className=\"min-w-0 flex-1\">
                          <div className=\"mb-1 flex flex-wrap items-center justify-between gap-2\">
                            <span className=\"font-bold text-[#fdfffc]\">{selectedItem.from}</span>
                            <span className=\"font-mono text-[10px] uppercase text-[#9E9DA0]\">
                              {new Date(selectedItem.receivedAt).toLocaleString()} UTC
                            </span>
                          </div>
                          {selectedItem.fromRole ? (
                            <p className=\"mb-4 text-sm text-[#454955]\">{selectedItem.fromRole}</p>
                          ) : null}·
                          <div className=\"mt-4 space-y-4 rounded-2xl border border-white/10 bg-[#0d0a0b]/60 p-6 shadow-[inset_1px_1px_0px_rgba(255,255,255,0.05)] backdrop-blur-xl\">
                            <p className=\"whitespace-pre-wrap text-base leading-relaxed text-[#c8c7c9]\">
                              {selectedItem.body}
                            </p>·
                            {selectedItem.type === 'DOCUMENT_SIGNED' ||
                            selectedItem.type === 'RECEIPT_APPROVAL' ? (
                              <div className=\"mt-6 flex items-center justify-between rounded-xl border border-[#3c4a46] bg-[#0d0a0b] p-4\">
                                <div className=\"flex items-center gap-3\">
                                  <span className=\"material-symbols-outlined text-[#454955]\">
                                    description
                                  </span>
                                  <div>
                                    <p className=\"text-xs font-bold text-[#9E9DA0]\">
                                      Attached_Document.pdf
                                    </p>
                                    <p className=\"font-mono text-[10px] text-[#9E9DA0]\">
                                      SECURE // PDF-DOCUMENT
                                    </p>
                                  </div>
                                </div>
                                <span className=\"material-symbols-outlined text-[#9E9DA0]\">download</span>
                              </div>
                            ) : null}·
                            {selectedItem.type === 'VENDOR_BID' ? (
                              <div className=\"mt-6 flex flex-col gap-2 rounded-xl border border-[#3c4a46] bg-[#0d0a0b] p-4\">
                                <div className=\"flex items-center gap-3\">
                                  <span className=\"material-symbols-outlined text-[#454955]\">
                                    engineering
                                  </span>
                                  <div>
                                    <p className=\"text-xs font-bold text-[#9E9DA0]\">
                                      Summit Roofing Bid Summary
                                    </p>
                                    <p className=\"font-mono text-[10px] text-[#9E9DA0]\">
                                      PROPOSAL // ROOF INSPECTION
                                    </p>
                                  </div>
                                </div>
                                <div className=\"mt-2 grid grid-cols-2 gap-4 border-t border-white/5 pt-2 text-xs text-[#9E9DA0]\">
                                  <div>
                                    <p className=\"text-[10px] font-semibold uppercase text-[#9E9DA0]/60\">
                                      Proposed Service Date
                                    </p>
                                    <p className=\"font-medium\">Next Tuesday</p>
                                  </div>
                                  <div>
                                    <p className=\"text-[10px] font-semibold uppercase text-[#9E9DA0]/60\">
                                      Payment Terms
                                    </p>
                                    <p className=\"font-medium\">Net 15 upon completion</p>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>·
                      {actionFlash ? (
                        <p className=\"text-center text-sm font-semibold text-emerald-400\">{actionFlash}</p>
                      ) : null}·
                      <div className=\"flex flex-wrap items-center justify-center gap-3 py-6\">
                        {selectedItem.actionable ? (
                          <button
                            type=\"button\"
                            onClick={executeAction}
                            className=\"flex cursor-pointer items-center gap-2 rounded-full bg-emerald-500 px-8 py-3 font-bold text-slate-950 transition-all hover:brightness-110\"
                          >
                            <span className=\"material-symbols-outlined text-[18px]\">edit_square</span>
                            EXECUTE ACTION
                          </button>
                        ) : null}
                        <button
                          type=\"button\"
                          onClick={() => setComposeOpen(true)}
                          className=\"flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-[#0d0a0b]/60 px-8 py-3 font-bold text-[#9E9DA0] shadow-[inset_1px_1px_0px_rgba(255,255,255,0.05)] backdrop-blur-xl transition-all hover:bg-white/5\"
                        >
                          <span className=\"material-symbols-outlined text-[18px]\">reply</span>
                          REPLY
                        </button>
                        {selectedItem.deepLinkUrl ? (
                          <Link
                            href={selectedItem.deepLinkUrl}
                            className=\"flex items-center gap-2 rounded-full border border-white/10 px-6 py-3 text-sm font-semibold text-white/70 no-underline hover:bg-white/5\"
                          >
                            Open related
                            <span className=\"material-symbols-outlined text-[16px]\">north_east</span>
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>·
                  <div className=\"flex shrink-0 items-center justify-between border-t border-white/10 bg-[#0d0a0b]/80 px-8 py-2 backdrop-blur\">
                    <div className=\"flex gap-4\">
                      <p className=\"font-mono text-[10px] text-[#9E9DA0]\">
                        <span className=\"text-[#454955]\">RUNNING:</span> inbox_handler.sh
                      </p>
                      <p className=\"hidden font-mono text-[10px] text-[#9E9DA0] sm:block\">
                        <span className=\"text-[#454955]\">ENCRYPTION:</span> AES-256-GCM
                      </p>
                    </div>
                    <p className=\"font-mono text-[10px] text-[#9E9DA0]\">LAST_SYNC: 0.2s AGO</p>
                  </div>
                </div>
              ) : (
                <div className=\"z-10 flex flex-1 flex-col items-center justify-center text-[#9E9DA0]\">
                  <span className=\"material-symbols-outlined mb-4 text-6xl opacity-20\">inbox</span>
                  <p className=\"text-lg font-medium\">Select an item to read</p>
                  <p className=\"text-sm opacity-60\">
                    Your messages and notifications will appear here.
                  </p>
                  <p className=\"mt-4 text-xs text-white/35\">
                    {INBOX_TABS.find((t) => t.id === activeTab)?.label} · {visibleItems.length} items
                  </p>
                </div>
              )}
            </section>
          </div>·
          <ComposeEmailModal isOpen={composeOpen} onClose={() => setComposeOpen(false)} />
        </>
      );
    }
    "

       98 |       'utf8',
       99 |     );
    > 100 |     expect(source).toContain("bffFetch(`/api/inbox/${id}`");
          |                    ^
      101 |     expect(source).toContain("bffFetch(`/api/inbox/${item.id}`");
      102 |     expect(source).not.toContain('apiFetch');
      103 |   });

      at Object.<anonymous> (src/__tests__/phase-b6-inbox-mutations.test.ts:100:20)

  ● phase B6 — inbox browser transport status › inbox list and mutations are same-origin in api-provider and notification center

    expect(received).toContain(expected) // indexOf

    Expected substring: "bffFetch"
    Received string:    "'use client';·
    import Link from 'next/link';
    import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
    import ComposeEmailModal from '@/components/inbox/ComposeEmailModal';
    import InboxItemCard from '@/components/inbox/InboxItemCard';
    import InboxTabs from '@/components/inbox/InboxTabs';
    import {
      INBOX_TABS,
      INBOX_THREADS,
      type InboxTabId,
      type InboxThread,
    } from '@/lib/dashboard/shell-seed';·
    function emptyCounts(): Record<InboxTabId, number> {
      return {
        all: 0,
        opportunities: 0,
        tasks: 0,
        vendor: 0,
        team: 0,
        system: 0,
      };
    }·
    function NotifMoreMenu({
      item,
      isUnread,
      onMarkUnreadToggle,
      onArchive,
      onDelete,
    }: {
      item: InboxThread;
      isUnread: boolean;
      onMarkUnreadToggle: () => void;
      onArchive: () => void;
      onDelete: () => void;
    }) {
      const [open, setOpen] = useState(false);
      const ref = useRef<HTMLDivElement>(null);·
      useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
          if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
      }, [open]);·
      return (
        <div ref={ref} className=\"relative\">
          <button
            type=\"button\"
            id=\"notif-more-menu-trigger\"
            onClick={() => setOpen((v) => !v)}
            className=\"cursor-pointer rounded-lg p-2 text-[#9E9DA0] transition-colors hover:bg-white/5\"
            aria-label=\"Notification actions\"
            aria-expanded={open}
          >
            <span className=\"material-symbols-outlined\">more_vert</span>
          </button>
          {open ? (
            <div
              id=\"notif-more-menu\"
              role=\"menu\"
              className=\"absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#161318] py-1 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.6)]\"
            >
              <button
                type=\"button\"
                role=\"menuitem\"
                onClick={() => {
                  onMarkUnreadToggle();
                  setOpen(false);
                }}
                className=\"flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-[#9E9DA0] transition-colors hover:bg-white/5 hover:text-white\"
              >
                <span className=\"material-symbols-outlined text-base\">
                  {isUnread ? 'drafts' : 'mark_email_unread'}
                </span>
                {isUnread ? 'Mark as Read' : 'Mark as Unread'}
              </button>
              <div className=\"my-1 border-t border-white/5\" />
              <button
                type=\"button\"
                role=\"menuitem\"
                onClick={() => {
                  onArchive();
                  setOpen(false);
                }}
                className=\"flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-[#9E9DA0] transition-colors hover:bg-white/5 hover:text-white\"
              >
                <span className=\"material-symbols-outlined text-base\">archive</span>
                Archive
              </button>
              <button
                type=\"button\"
                role=\"menuitem\"
                onClick={() => {
                  onDelete();
                  setOpen(false);
                }}
                className=\"flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-red-400/80 transition-colors hover:bg-white/5 hover:text-red-400\"
              >
                <span className=\"material-symbols-outlined text-base\">delete</span>
                Delete
              </button>
            </div>
          ) : null}
        </div>
      );
    }·
    /**
     * Unified Inbox — port of PaperWorking `/dashboard/inbox` notification center
     * (two-pane list + reading pane, tabs, compose, mark-all-read).
     */
    export default function InboxNotificationCenter() {
      const [items, setItems] = useState<InboxThread[]>(() => [...INBOX_THREADS]);
      const [activeTab, setActiveTab] = useState<InboxTabId>('all');
      const [selectedId, setSelectedId] = useState<string | null>(null);
      const [searchQuery, setSearchQuery] = useState('');
      const [composeOpen, setComposeOpen] = useState(false);
      const [readOverrides, setReadOverrides] = useState<Record<string, boolean>>({});
      const [archivedIds, setArchivedIds] = useState<Set<string>>(() => new Set());
      const [actionFlash, setActionFlash] = useState<string | null>(null);·
      const isUnread = useCallback(
        (item: InboxThread) => {
          if (item.id in readOverrides) return !readOverrides[item.id];
          return item.unread;
        },
        [readOverrides],
      );·
      const visibleItems = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return items.filter((item) => {
          if (archivedIds.has(item.id)) return false;
          if (activeTab !== 'all' && item.tab !== activeTab) return false;
          if (!q) return true;
          return (
            item.subject.toLowerCase().includes(q) ||
            item.body.toLowerCase().includes(q) ||
            item.from.toLowerCase().includes(q) ||
            item.project.toLowerCase().includes(q)
          );
        });
      }, [items, archivedIds, activeTab, searchQuery]);·
      const unreadCounts = useMemo(() => {
        const counts = emptyCounts();
        for (const item of items) {
          if (archivedIds.has(item.id) || !isUnread(item)) continue;
          counts.all += 1;
          counts[item.tab] += 1;
        }
        return counts;
      }, [items, archivedIds, isUnread]);·
      const unreadTotal = unreadCounts.all;
      const selectedItem = visibleItems.find((i) => i.id === selectedId) ?? null;
      const selectedUnread = selectedItem ? isUnread(selectedItem) : false;·
      function markRead(id: string) {
        setReadOverrides((prev) => ({ ...prev, [id]: true }));
      }·
      function markUnread(id: string) {
        setReadOverrides((prev) => ({ ...prev, [id]: false }));
      }·
      function markAllRead() {
        const next: Record<string, boolean> = { ...readOverrides };
        for (const item of items) {
          if (!archivedIds.has(item.id)) next[item.id] = true;
        }
        setReadOverrides(next);
      }·
      function archiveItem(id: string) {
        setArchivedIds((prev) => new Set(prev).add(id));
        if (selectedId === id) setSelectedId(null);
      }·
      function deleteItem(id: string) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        if (selectedId === id) setSelectedId(null);
      }·
      function selectItem(id: string) {
        setSelectedId(id);
        markRead(id);
      }·
      function executeAction() {
        if (!selectedItem) return;
        setActionFlash(`Action queued for “${selectedItem.subject}” (seed preview).`);
        markRead(selectedItem.id);
        setTimeout(() => setActionFlash(null), 2500);
      }·
      const showDetail = Boolean(selectedItem);·
      return (
        <>
          <div
            className=\"-mb-24 flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-[#0d0a0b] text-[#9E9DA0] md:-mb-8\"
            data-testid=\"inbox-notification-center\"
          >
            {/* List pane */}
            <section
              className={`w-full shrink-0 flex-col border-r border-white/10 bg-[#161318]/50 md:flex md:w-[420px] ${
                showDetail ? 'hidden md:flex' : 'flex'
              }`}
            >
              <div className=\"space-y-4 p-6\">
                <div className=\"flex items-center justify-between\">
                  <h1 className=\"text-2xl font-bold text-[#fdfffc]\">Inbox</h1>
                  <div className=\"flex items-center gap-2\">
                    {unreadTotal > 0 ? (
                      <span className=\"rounded border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300\">
                        {unreadTotal} UNREAD
                      </span>
                    ) : null}
                    {unreadTotal > 0 ? (
                      <button
                        type=\"button\"
                        onClick={markAllRead}
                        className=\"cursor-pointer rounded-lg p-1.5 text-[#9E9DA0] transition-colors hover:bg-white/5 hover:text-emerald-300\"
                        title=\"Mark all as read\"
                      >
                        <span className=\"material-symbols-outlined text-[18px]\">done_all</span>
                      </button>
                    ) : null}
                    <button
                      type=\"button\"
                      onClick={() => setComposeOpen(true)}
                      className=\"cursor-pointer rounded-lg p-1.5 text-[#9E9DA0] transition-colors hover:bg-white/5 hover:text-emerald-300\"
                      title=\"Compose email\"
                    >
                      <span className=\"material-symbols-outlined text-[18px]\">add</span>
                    </button>
                  </div>
                </div>·
                <div className=\"relative\">
                  <span className=\"material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-[#9E9DA0]\">
                    search
                  </span>
                  <input
                    type=\"text\"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder=\"Search logs...\"
                    className=\"w-full rounded-lg border border-[#3c4a46] bg-[#0d0a0b] py-2 pl-10 pr-4 text-sm text-[#9E9DA0] outline-none transition-all placeholder:text-[#9E9DA0]/40 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/30\"
                  />
                </div>
              </div>·
              <InboxTabs
                activeTab={activeTab}
                onTabChange={(tab) => {
                  setActiveTab(tab);
                  setSelectedId(null);
                }}
                unreadCounts={unreadCounts}
              />·
              <div className=\"relative flex-1 overflow-y-auto\">
                {visibleItems.length === 0 ? (
                  <div className=\"flex flex-col items-center justify-center px-6 py-16 text-center\">
                    <span className=\"material-symbols-outlined mb-3 text-5xl opacity-20\">inbox</span>
                    <p className=\"text-sm font-medium text-white/60\">No items in this view</p>
                    <p className=\"mt-1 text-xs text-white/35\">
                      {searchQuery
                        ? 'Try a different search.'
                        : 'You’re caught up — new alerts will land here.'}
                    </p>
                  </div>
                ) : (
                  visibleItems.map((item) => (
                    <InboxItemCard
                      key={item.id}
                      item={item}
                      isUnread={isUnread(item)}
                      isActive={selectedId === item.id}
                      onSelect={() => selectItem(item.id)}
                      onArchive={() => archiveItem(item.id)}
                      onDelete={() => deleteItem(item.id)}
                    />
                  ))
                )}
              </div>
            </section>·
            {/* Reading pane */}
            <section
              className={`relative flex flex-1 flex-col overflow-hidden bg-[#0d0a0b] ${
                showDetail ? 'flex' : 'hidden md:flex'
              }`}
            >
              <div className=\"pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-[#454955]/5 blur-[100px]\" />
              <div className=\"pointer-events-none absolute bottom-20 left-20 h-64 w-64 rounded-full bg-[#7A9EAA]/5 blur-[80px]\" />·
              {selectedItem ? (
                <div className=\"z-10 flex flex-1 flex-col overflow-y-auto\">
                  <div className=\"flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0d0a0b]/50 px-6 py-5 backdrop-blur-sm sm:px-8 sm:py-6\">
                    <div className=\"flex min-w-0 items-center gap-4\">
                      <button
                        type=\"button\"
                        onClick={() => setSelectedId(null)}
                        className=\"cursor-pointer rounded-lg p-2 text-[#9E9DA0] transition-colors hover:bg-white/5 md:hidden\"
                        aria-label=\"Back\"
                      >
                        <span className=\"material-symbols-outlined\">arrow_back</span>
                      </button>
                      <div className=\"flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#0d0a0b]/60 text-emerald-400 shadow-[inset_1px_1px_0px_rgba(255,255,255,0.05)]\">
                        <span className=\"material-symbols-outlined text-[24px]\">mark_email_read</span>
                      </div>
                      <div className=\"min-w-0\">
                        <h2 className=\"truncate text-xl font-bold text-[#fdfffc] sm:text-2xl\">
                          {selectedItem.subject}
                        </h2>
                        <p className=\"font-mono text-[10px] uppercase text-[#454955]\">
                          ID: {selectedItem.id.slice(0, 8)} · STATUS:{' '}
                          {selectedUnread ? 'UNREAD' : 'READ'}
                        </p>
                      </div>
                    </div>
                    <div className=\"flex gap-1\">
                      <button
                        type=\"button\"
                        onClick={() => archiveItem(selectedItem.id)}
                        className=\"cursor-pointer rounded-lg p-2 text-[#9E9DA0] transition-colors hover:bg-white/5\"
                        title=\"Archive\"
                      >
                        <span className=\"material-symbols-outlined\">archive</span>
                      </button>
                      <button
                        type=\"button\"
                        onClick={() => deleteItem(selectedItem.id)}
                        className=\"cursor-pointer rounded-lg p-2 text-[#9E9DA0] transition-colors hover:bg-white/5\"
                        title=\"Delete\"
                      >
                        <span className=\"material-symbols-outlined\">delete</span>
                      </button>
                      <NotifMoreMenu
                        item={selectedItem}
                        isUnread={selectedUnread}
                        onMarkUnreadToggle={() =>
                          selectedUnread ? markRead(selectedItem.id) : markUnread(selectedItem.id)
                        }
                        onArchive={() => archiveItem(selectedItem.id)}
                        onDelete={() => deleteItem(selectedItem.id)}
                      />
                    </div>
                  </div>·
                  <div className=\"flex-1 overflow-y-auto p-6 sm:p-8\">
                    <div className=\"mx-auto max-w-3xl space-y-8\">
                      <div className=\"flex items-start gap-4\">
                        <div className=\"flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#454955]/20 bg-[#161318] text-lg font-bold text-[#454955]\">
                          {selectedItem.from[0]}
                        </div>
                        <div className=\"min-w-0 flex-1\">
                          <div className=\"mb-1 flex flex-wrap items-center justify-between gap-2\">
                            <span className=\"font-bold text-[#fdfffc]\">{selectedItem.from}</span>
                            <span className=\"font-mono text-[10px] uppercase text-[#9E9DA0]\">
                              {new Date(selectedItem.receivedAt).toLocaleString()} UTC
                            </span>
                          </div>
                          {selectedItem.fromRole ? (
                            <p className=\"mb-4 text-sm text-[#454955]\">{selectedItem.fromRole}</p>
                          ) : null}·
                          <div className=\"mt-4 space-y-4 rounded-2xl border border-white/10 bg-[#0d0a0b]/60 p-6 shadow-[inset_1px_1px_0px_rgba(255,255,255,0.05)] backdrop-blur-xl\">
                            <p className=\"whitespace-pre-wrap text-base leading-relaxed text-[#c8c7c9]\">
                              {selectedItem.body}
                            </p>·
                            {selectedItem.type === 'DOCUMENT_SIGNED' ||
                            selectedItem.type === 'RECEIPT_APPROVAL' ? (
                              <div className=\"mt-6 flex items-center justify-between rounded-xl border border-[#3c4a46] bg-[#0d0a0b] p-4\">
                                <div className=\"flex items-center gap-3\">
                                  <span className=\"material-symbols-outlined text-[#454955]\">
                                    description
                                  </span>
                                  <div>
                                    <p className=\"text-xs font-bold text-[#9E9DA0]\">
                                      Attached_Document.pdf
                                    </p>
                                    <p className=\"font-mono text-[10px] text-[#9E9DA0]\">
                                      SECURE // PDF-DOCUMENT
                                    </p>
                                  </div>
                                </div>
                                <span className=\"material-symbols-outlined text-[#9E9DA0]\">download</span>
                              </div>
                            ) : null}·
                            {selectedItem.type === 'VENDOR_BID' ? (
                              <div className=\"mt-6 flex flex-col gap-2 rounded-xl border border-[#3c4a46] bg-[#0d0a0b] p-4\">
                                <div className=\"flex items-center gap-3\">
                                  <span className=\"material-symbols-outlined text-[#454955]\">
                                    engineering
                                  </span>
                                  <div>
                                    <p className=\"text-xs font-bold text-[#9E9DA0]\">
                                      Summit Roofing Bid Summary
                                    </p>
                                    <p className=\"font-mono text-[10px] text-[#9E9DA0]\">
                                      PROPOSAL // ROOF INSPECTION
                                    </p>
                                  </div>
                                </div>
                                <div className=\"mt-2 grid grid-cols-2 gap-4 border-t border-white/5 pt-2 text-xs text-[#9E9DA0]\">
                                  <div>
                                    <p className=\"text-[10px] font-semibold uppercase text-[#9E9DA0]/60\">
                                      Proposed Service Date
                                    </p>
                                    <p className=\"font-medium\">Next Tuesday</p>
                                  </div>
                                  <div>
                                    <p className=\"text-[10px] font-semibold uppercase text-[#9E9DA0]/60\">
                                      Payment Terms
                                    </p>
                                    <p className=\"font-medium\">Net 15 upon completion</p>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>·
                      {actionFlash ? (
                        <p className=\"text-center text-sm font-semibold text-emerald-400\">{actionFlash}</p>
                      ) : null}·
                      <div className=\"flex flex-wrap items-center justify-center gap-3 py-6\">
                        {selectedItem.actionable ? (
                          <button
                            type=\"button\"
                            onClick={executeAction}
                            className=\"flex cursor-pointer items-center gap-2 rounded-full bg-emerald-500 px-8 py-3 font-bold text-slate-950 transition-all hover:brightness-110\"
                          >
                            <span className=\"material-symbols-outlined text-[18px]\">edit_square</span>
                            EXECUTE ACTION
                          </button>
                        ) : null}
                        <button
                          type=\"button\"
                          onClick={() => setComposeOpen(true)}
                          className=\"flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-[#0d0a0b]/60 px-8 py-3 font-bold text-[#9E9DA0] shadow-[inset_1px_1px_0px_rgba(255,255,255,0.05)] backdrop-blur-xl transition-all hover:bg-white/5\"
                        >
                          <span className=\"material-symbols-outlined text-[18px]\">reply</span>
                          REPLY
                        </button>
                        {selectedItem.deepLinkUrl ? (
                          <Link
                            href={selectedItem.deepLinkUrl}
                            className=\"flex items-center gap-2 rounded-full border border-white/10 px-6 py-3 text-sm font-semibold text-white/70 no-underline hover:bg-white/5\"
                          >
                            Open related
                            <span className=\"material-symbols-outlined text-[16px]\">north_east</span>
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>·
                  <div className=\"flex shrink-0 items-center justify-between border-t border-white/10 bg-[#0d0a0b]/80 px-8 py-2 backdrop-blur\">
                    <div className=\"flex gap-4\">
                      <p className=\"font-mono text-[10px] text-[#9E9DA0]\">
                        <span className=\"text-[#454955]\">RUNNING:</span> inbox_handler.sh
                      </p>
                      <p className=\"hidden font-mono text-[10px] text-[#9E9DA0] sm:block\">
                        <span className=\"text-[#454955]\">ENCRYPTION:</span> AES-256-GCM
                      </p>
                    </div>
                    <p className=\"font-mono text-[10px] text-[#9E9DA0]\">LAST_SYNC: 0.2s AGO</p>
                  </div>
                </div>
              ) : (
                <div className=\"z-10 flex flex-1 flex-col items-center justify-center text-[#9E9DA0]\">
                  <span className=\"material-symbols-outlined mb-4 text-6xl opacity-20\">inbox</span>
                  <p className=\"text-lg font-medium\">Select an item to read</p>
                  <p className=\"text-sm opacity-60\">
                    Your messages and notifications will appear here.
                  </p>
                  <p className=\"mt-4 text-xs text-white/35\">
                    {INBOX_TABS.find((t) => t.id === activeTab)?.label} · {visibleItems.length} items
                  </p>
                </div>
              )}
            </section>
          </div>·
          <ComposeEmailModal isOpen={composeOpen} onClose={() => setComposeOpen(false)} />
        </>
      );
    }
    "

      164 |     );
      165 |     expect(provider).toContain("bffFetch('/api/inbox'");
    > 166 |     expect(center).toContain('bffFetch');
          |                    ^
      167 |     expect(provider).not.toMatch(/apiFetch\('\/api\/inbox/);
      168 |     expect(center).not.toContain('apiFetch');
      169 |   });

      at Object.<anonymous> (src/__tests__/phase-b6-inbox-mutations.test.ts:166:20)

PASS src/__tests__/same-origin-auth-transport.test.ts
FAIL src/__tests__/phase-b17-profile-insights-transport.test.ts
  ● phase B17 — global browser transport guard (admin-only apiFetch) › no unexpected apiFetch in production browser modules

    expect(received).toEqual(expected) // deep equality

    - Expected  - 1
    + Received  + 4

    - Array []
    + Array [
    +   "app/(project)/project/[id]/underwriting/page.tsx",
    +   "context/SavedDealsContext.tsx",
    + ]

      78 |     }
      79 |
    > 80 |     expect(violations).toEqual([]);
         |                        ^
      81 |   });
      82 |
      83 |   it('allowlisted apiFetch callers removed after Phase D', () => {

      at Object.<anonymous> (src/__tests__/phase-b17-profile-insights-transport.test.ts:80:24)

PASS src/__tests__/phase-b1-projects-read.test.ts
PASS src/__tests__/phase-b2-inbox-read.test.ts
PASS src/__tests__/phase-b12-marketplace-vendor-mutations.test.ts
PASS src/__tests__/phase-5b-auth.test.ts
FAIL src/__tests__/phase-b16-reports-transport.test.ts
  ● phase B16 — global browser transport guard › no unexpected apiFetch in production browser modules

    expect(received).toEqual(expected) // deep equality

    - Expected  - 1
    + Received  + 4

    - Array []
    + Array [
    +   "app/(project)/project/[id]/underwriting/page.tsx",
    +   "context/SavedDealsContext.tsx",
    + ]

      71 |     }
      72 |
    > 73 |     expect(violations).toEqual([]);
         |                        ^
      74 |   });
      75 |
      76 |   it('allowlisted apiFetch callers are privileged admin exception only (B18)', () => {

      at Object.<anonymous> (src/__tests__/phase-b16-reports-transport.test.ts:73:24)

FAIL src/__tests__/phase-b18-admin-transport.test.ts
  ● phase B18 — global browser transport guard › no production browser modules use apiFetch

    expect(received).toEqual(expected) // deep equality

    - Expected  - 1
    + Received  + 4

    - Array []
    + Array [
    +   "app/(project)/project/[id]/underwriting/page.tsx",
    +   "context/SavedDealsContext.tsx",
    + ]

      69 |     }
      70 |
    > 71 |     expect(violations).toEqual([]);
         |                        ^
      72 |   });
      73 |
      74 |   it('impersonation uses same-origin BFF (Phase D)', () => {

      at Object.<anonymous> (src/__tests__/phase-b18-admin-transport.test.ts:71:24)

FAIL src/__tests__/phase-v1-certification-correction.test.ts
  ● V1 certification correction — browser Nest transport › no production browser modules reference apiFetch(

    expect(received).toEqual(expected) // deep equality

    - Expected  - 1
    + Received  + 5

    - Array []
    + Array [
    +   "app/(project)/project/[id]/underwriting/page.tsx",
    +   "context/SavedDealsContext.tsx",
    +   "lib/api/client.ts",
    + ]

      56 |       if (content.includes('apiFetch(')) violations.push(rel);
      57 |     }
    > 58 |     expect(violations).toEqual([]);
         |                        ^
      59 |   });
      60 |
      61 |   it('impersonation uses same-origin BFF helper (Phase D)', () => {

      at Object.<anonymous> (src/__tests__/phase-v1-certification-correction.test.ts:58:24)

PASS src/__tests__/phase-b9-1-kpi-trust.test.ts
PASS src/__tests__/phase-d-admin-impersonation-bff.test.ts
PASS src/__tests__/assistant-progressive-unlock.test.ts
FAIL src/__tests__/phase-5g-marketplace.test.ts
  ● phase 5g — marketplace handlers › lists discover deals for authenticated user

    expect(received).toBe(expected) // Object.is equality

    Expected: 2
    Received: 9

      70 |     expect(result.status).toBe(200);
      71 |     const body = result.body as { total: number; deals: Array<{ slug: string }> };
    > 72 |     expect(body.total).toBe(2);
         |                        ^
      73 |     expect(body.deals.map((deal) => deal.slug)).toEqual(['1247elmst', 'melroseduplex']);
      74 |   });
      75 |

      at Object.<anonymous> (src/__tests__/phase-5g-marketplace.test.ts:72:24)

PASS src/__tests__/phase-5c-dashboard.test.ts
FAIL src/__tests__/phase-5a-marketing.test.ts
  ● phase 5a — marketing content › includes v0 primary navigation links

    expect(received).toEqual(expected) // deep equality

    - Expected  - 1
    + Received  + 0

      Array [
        "How It Works",
        "Marketplaces",
        "Pricing",
        "Support",
    -   "Contact",
      ]

      32 | describe('phase 5a — marketing content', () => {
      33 |   it('includes v0 primary navigation links', () => {
    > 34 |     expect(MARKETING_NAV_LINKS.map((link) => link.label)).toEqual([
         |                                                           ^
      35 |       'How It Works',
      36 |       'Marketplaces',
      37 |       'Pricing',

      at Object.<anonymous> (src/__tests__/phase-5a-marketing.test.ts:34:59)

PASS src/__tests__/phase-b13-deal-communication.test.ts
FAIL src/__tests__/phase-b15-billing-stripe.test.ts
  ● phase B15 — browser billing transport › BillingPreviewPanel uses same-origin billing BFF helpers

    expect(received).toContain(expected) // indexOf

    Expected substring: "getBillingSummaryFromBff"
    Received string:    "'use client';·
    import { useState, useEffect } from 'react';
    import { useRouter, useSearchParams } from 'next/navigation';
    import { Button } from '@/components/ui/Button';·
    interface BillingPaymentMethod {
      id: string;
      brand: string;
      last4: string;
      expMonth: number;
      expYear: number;
      isDefault: boolean;
    }·
    interface BillingInvoice {
      id: string;
      number: string;
      date: string;
      amount: string;
      status: string;
      pdfUrl?: string;
    }·
    interface BillingData {
      plan: string;
      price: string;
      monthlyPrice?: number;
      status: string;
      subscriptionStatus: string;
      nextBillingDate: string;
      trialEnds?: string;
      billingEmail?: string;
      companyName?: string;
      billingAddress?: string;
      stripeConfigured?: boolean;
      paymentMethods: BillingPaymentMethod[];
      invoices: BillingInvoice[];
    }·
    export default function BillingPreviewPanel() {
      const router = useRouter();
      const searchParams = useSearchParams();
      const paywall = searchParams.get('paywall');·
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState<string | null>(null);
      const [data, setData] = useState<BillingData | null>(null);·
      // Modals state
      const [showPlanModal, setShowPlanModal] = useState(false);
      const [selectedPlan, setSelectedPlan] = useState('Team');
      const [planUpdating, setPlanUpdating] = useState(false);·
      const [showCancelModal, setShowCancelModal] = useState(false);
      const [cancelLoading, setCancelLoading] = useState(false);·
      const [showCardModal, setShowCardModal] = useState(false);
      const [cardLast4, setCardLast4] = useState('');
      const [cardUpdating, setCardUpdating] = useState(false);·
      const [actionSuccess, setActionSuccess] = useState<string | null>(null);·
      const fetchBilling = async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await fetch('/api/billing');
          if (res.status === 401) {
            router.push('/login?next=/dashboard/settings?section=billing');
            return;
          }
          if (!res.ok) {
            let errorMsg = `Failed to load subscription & billing records (${res.status})`;
            try {
              const errJson = await res.json();
              if (errJson && typeof errJson.error === 'string') {
                errorMsg = errJson.error;
              }
            } catch {
              // ignore
            }
            throw new Error(errorMsg);
          }
          const json = await res.json();
          setData(json);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Error connecting to billing service');
        } finally {
          setLoading(false);
        }
      };·
      useEffect(() => {
        fetchBilling();
      }, []);·
      const handleChangePlan = async () => {
        setPlanUpdating(true);
        try {
          const res = await fetch('/api/billing/change-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId: selectedPlan }),
          });
          if (res.status === 401) {
            router.push('/login?next=/dashboard/settings?section=billing');
            return;
          }
          if (!res.ok) throw new Error('Failed to update plan');
          setShowPlanModal(false);
          setActionSuccess(`Subscription updated to ${selectedPlan} tier.`);
          setTimeout(() => setActionSuccess(null), 4000);
          await fetchBilling();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to update plan');
        } finally {
          setPlanUpdating(false);
        }
      };·
      const handleCancelSubscription = async () => {
        setCancelLoading(true);
        try {
          const res = await fetch('/api/billing/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          if (res.status === 401) {
            router.push('/login?next=/dashboard/settings?section=billing');
            return;
          }
          if (!res.ok) throw new Error('Failed to cancel subscription');
          setShowCancelModal(false);
          setActionSuccess('Cancellation scheduled at the end of the current billing cycle.');
          setTimeout(() => setActionSuccess(null), 4000);
          await fetchBilling();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
        } finally {
          setCancelLoading(false);
        }
      };·
      const handleUpdateCard = async () => {
        if (!cardLast4 || cardLast4.length !== 4) return;
        setCardUpdating(true);
        try {
          const res = await fetch('/api/billing/payment-methods', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              card: {
                brand: 'visa',
                last4: cardLast4,
                expMonth: 12,
                expYear: 2029,
              },
            }),
          });
          if (res.status === 401) {
            router.push('/login?next=/dashboard/settings?section=billing');
            return;
          }
          if (!res.ok) throw new Error('Failed to update card');
          setShowCardModal(false);
          setCardLast4('');
          setActionSuccess('Payment method updated successfully.');
          setTimeout(() => setActionSuccess(null), 4000);
          await fetchBilling();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to update payment card');
        } finally {
          setCardUpdating(false);
        }
      };·
      const handleDownloadInvoice = (invoiceId: string) => {
        window.open(`/api/billing/invoices/${invoiceId}/download`, '_blank');
      };·
      if (loading) {
        return (
          <div className=\"flex min-h-[350px] items-center justify-center p-8\">
            <div className=\"flex items-center gap-3 text-sm text-[var(--text-secondary)]\">
              <span className=\"material-symbols-outlined animate-spin text-[var(--accent)]\">
                progress_activity
              </span>
              Loading subscription &amp; invoices…
            </div>
          </div>
        );
      }·
      // Loud Error State with Retry (never a silent shell)
      if (error || !data) {
        return (
          <div className=\"w-full space-y-6\" data-testid=\"billing-error-container\">
            <div>
              <h2 className=\"text-xl font-bold text-[var(--text-primary)]\">Billing &amp; Subscriptions</h2>
              <p className=\"mt-1 text-sm text-[var(--text-muted)]\">
                Manage your subscription plan, payment methods, and invoices.
              </p>
            </div>·
            <div
              data-testid=\"billing-error-banner\"
              className=\"rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-6 shadow-sm\"
            >
              <div className=\"flex items-start gap-3\">
                <span className=\"material-symbols-outlined text-2xl text-[var(--danger)]\">
                  error
                </span>
                <div className=\"flex-1\">
                  <h3 className=\"text-base font-bold text-[var(--danger)]\">
                    Unable to load billing data
                  </h3>
                  <p className=\"mt-1 text-sm text-[var(--text-secondary)]\">
                    {error || 'An unexpected error occurred while communicating with the billing service.'}
                  </p>
                  <div className=\"mt-4\">
                    <Button
                      type=\"button\"
                      variant=\"primary\"
                      size=\"sm\"
                      onClick={fetchBilling}
                      data-testid=\"billing-retry-button\"
                      data-variant=\"primary\"
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }·
      const defaultPm = data.paymentMethods.find((pm) => pm.isDefault) || data.paymentMethods[0];·
      return (
        <div className=\"w-full space-y-6\" data-testid=\"billing-preview-panel\">
          <div>
            <h2 className=\"text-xl font-bold text-[var(--text-primary)]\">Billing &amp; Subscriptions</h2>
            <p className=\"mt-1 text-sm text-[var(--text-muted)]\">
              {data.plan} plan · <span className=\"capitalize\">{data.status}</span>
            </p>
          </div>·
          {paywall === 'deals' && (
            <div className=\"rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5\">
              <p className=\"text-xs font-bold uppercase tracking-wider text-amber-300\">
                Deals Marketplace Locked
              </p>
              <p className=\"mt-1 text-sm text-[var(--text-secondary)]\">
                Deals Marketplace access requires an active operator subscription. Upgrade your tier to browse and post deals.
              </p>
            </div>
          )}·
          {actionSuccess && (
            <div className=\"flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400\">
              <span className=\"material-symbols-outlined text-base\">check_circle</span>
              {actionSuccess}
            </div>
          )}·
          {/* Current Plan Overview (Single Primary Action) */}
          <section className=\"rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm\">
            <div className=\"flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between\">
              <div>
                <p className=\"text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]\">
                  Current Plan
                </p>
                <h3 className=\"mt-1 text-2xl font-bold text-[var(--text-primary)]\" data-testid=\"billing-plan-name\">
                  {data.plan}
                </h3>
                <p className=\"mt-1 text-sm text-[var(--text-secondary)]\">
                  {data.price} · Renewal date: {new Date(data.nextBillingDate).toLocaleDateString()}
                </p>
              </div>
              {data.stripeConfigured ? (
                <div className=\"flex flex-wrap items-center gap-2\">
                  <Button
                    type=\"button\"
                    variant=\"primary\"
                    size=\"sm\"
                    onClick={() => setShowPlanModal(true)}
                    data-variant=\"primary\"
                    data-testid=\"billing-change-plan-btn\"
                  >
                    Change Plan
                  </Button>
                  <Button
                    type=\"button\"
                    variant=\"secondary\"
                    size=\"sm\"
                    onClick={() => setShowCancelModal(true)}
                    data-testid=\"billing-cancel-btn\"
                    className=\"text-[var(--danger)] border-[var(--danger)]/30 hover:bg-[var(--danger)]/10\"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div data-testid=\"billing-self-hosted-note\" className=\"rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-xs text-[var(--text-secondary)]\">
                  <span className=\"font-semibold text-[var(--text-primary)]\">Self-Hosted / Managed:</span> Stripe payments unconfigured in this environment. Tiers are managed directly by your workspace administrator.
                </div>
              )}
            </div>
          </section>·
          {/* Payment Method & Billing Info Grid */}
          <section className=\"grid gap-4 lg:grid-cols-2\">
            <article className=\"rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-sm\">
              <h3 className=\"mb-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]\">
                Payment Method
              </h3>
              {defaultPm ? (
                <div className=\"flex items-center gap-3\">
                  <span className=\"material-symbols-outlined text-2xl text-[var(--accent)]\">
                    credit_card
                  </span>
                  <div>
                    <p className=\"text-sm font-semibold capitalize text-[var(--text-primary)]\">
                      {defaultPm.brand} ending in {defaultPm.last4}
                    </p>
                    <p className=\"text-xs text-[var(--text-muted)]\">
                      Expires {defaultPm.expMonth}/{defaultPm.expYear}
                    </p>
                  </div>
                </div>
              ) : (
                <p className=\"text-sm text-[var(--text-secondary)]\">No payment method on file.</p>
              )}
              {data.stripeConfigured && (
                <div className=\"mt-4\">
                  <Button
                    type=\"button\"
                    variant=\"secondary\"
                    size=\"sm\"
                    onClick={() => setShowCardModal(true)}
                    data-testid=\"billing-update-card-btn\"
                  >
                    Update Card
                  </Button>
                </div>
              )}
            </article>·
            <article className=\"rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-sm\">
              <h3 className=\"mb-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]\">
                Billing Information
              </h3>
              <dl className=\"space-y-2 text-sm\">
                <div className=\"flex justify-between gap-3\">
                  <dt className=\"text-[var(--text-muted)]\">Billing Email</dt>
                  <dd className=\"text-[var(--text-primary)] font-medium\">{data.billingEmail || 'alex@apexcap.internal'}</dd>
                </div>
                <div className=\"flex justify-between gap-3\">
                  <dt className=\"text-[var(--text-muted)]\">Subscription Status</dt>
                  <dd className=\"capitalize text-emerald-400 font-bold\">{data.subscriptionStatus}</dd>
                </div>
                <div className=\"flex justify-between gap-3\">
                  <dt className=\"text-[var(--text-muted)]\">Organization</dt>
                  <dd className=\"text-[var(--text-primary)]\">{data.companyName || 'Apex Capital Partners'}</dd>
                </div>
              </dl>
            </article>
          </section>·
          {/* Invoices History Table */}
          <section className=\"overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm\">
            <div className=\"border-b border-[var(--border-subtle)] px-5 py-3\">
              <h3 className=\"text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]\">
                Invoice History
              </h3>
            </div>
            <div className=\"overflow-x-auto\">
              <table className=\"w-full text-left text-sm\">
                <thead className=\"bg-[var(--bg-elevated)] text-xs uppercase tracking-wider text-[var(--text-muted)]\">
                  <tr>
                    <th className=\"px-5 py-3 font-semibold\">Invoice</th>
                    <th className=\"px-5 py-3 font-semibold\">Date</th>
                    <th className=\"px-5 py-3 font-semibold\">Amount</th>
                    <th className=\"px-5 py-3 font-semibold\">Status</th>
                    <th className=\"px-5 py-3 text-right font-semibold\">Action</th>
                  </tr>
                </thead>
                <tbody className=\"divide-y divide-[var(--border-subtle)]\">
                  {data.invoices.map((inv) => (
                    <tr key={inv.id} className=\"hover:bg-[var(--bg-elevated)]/50 transition-colors\">
                      <td className=\"px-5 py-3 font-mono font-medium text-[var(--text-primary)]\">
                        {inv.number}
                      </td>
                      <td className=\"px-5 py-3 text-[var(--text-secondary)]\">
                        {new Date(inv.date).toLocaleDateString()}
                      </td>
                      <td className=\"px-5 py-3 font-mono text-[var(--text-primary)]\">{inv.amount}</td>
                      <td className=\"px-5 py-3\">
                        <span className=\"inline-flex rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold capitalize text-emerald-400\">
                          {inv.status}
                        </span>
                      </td>
                      <td className=\"px-5 py-3 text-right\">
                        <Button
                          type=\"button\"
                          variant=\"tertiary\"
                          size=\"sm\"
                          onClick={() => handleDownloadInvoice(inv.id)}
                          className=\"text-xs text-[var(--accent)] hover:text-[var(--accent)]\"
                        >
                          Download PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>·
          {/* Plan Selection Modal */}
          {showPlanModal && (
            <div className=\"fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4\">
              <div className=\"w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4\">
                <div className=\"flex items-center justify-between border-b border-[var(--border-subtle)] pb-3\">
                  <h3 className=\"text-base font-bold text-[var(--text-primary)]\">Change Subscription Plan</h3>
                  <button
                    type=\"button\"
                    onClick={() => setShowPlanModal(false)}
                    className=\"text-[var(--text-muted)] hover:text-[var(--text-primary)]\"
                  >
                    ✕
                  </button>
                </div>
                <div className=\"space-y-2\">
                  {['Individual', 'Pro Portfolio', 'Team'].map((p) => (
                    <label
                      key={p}
                      className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all ${
                        selectedPlan === p
                          ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]'
                      }`}
                    >
                      <div className=\"flex items-center gap-3\">
                        <input
                          type=\"radio\"
                          name=\"plan\"
                          checked={selectedPlan === p}
                          onChange={() => setSelectedPlan(p)}
                          className=\"accent-[var(--accent)]\"
                        />
                        <span className=\"text-sm font-semibold text-[var(--text-primary)]\">{p}</span>
                      </div>
                      <span className=\"font-mono text-xs text-[var(--text-muted)]\">
                        {p === 'Individual' ? '$59/mo' : p === 'Pro Portfolio' ? '$79/mo' : '$99/mo'}
                      </span>
                    </label>
                  ))}
                </div>
                <div className=\"flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]\">
                  <Button type=\"button\" variant=\"secondary\" size=\"sm\" onClick={() => setShowPlanModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    type=\"button\"
                    variant=\"primary\"
                    size=\"sm\"
                    onClick={handleChangePlan}
                    disabled={planUpdating}
                  >
                    {planUpdating ? 'Updating…' : 'Confirm Plan'}
                  </Button>
                </div>
              </div>
            </div>
          )}·
          {/* Cancellation Modal */}
          {showCancelModal && (
            <div className=\"fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4\">
              <div className=\"w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4\">
                <h3 className=\"text-base font-bold text-[var(--danger)]\">Cancel Subscription</h3>
                <p className=\"text-sm text-[var(--text-secondary)]\">
                  Your subscription will remain active until the end of your current billing period ({new Date(data.nextBillingDate).toLocaleDateString()}). Afterwards, premium marketplace tools will be locked.
                </p>
                <div className=\"flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]\">
                  <Button type=\"button\" variant=\"secondary\" size=\"sm\" onClick={() => setShowCancelModal(false)}>
                    Keep Plan
                  </Button>
                  <Button
                    type=\"button\"
                    variant=\"danger\"
                    size=\"sm\"
                    onClick={handleCancelSubscription}
                    disabled={cancelLoading}
                  >
                    {cancelLoading ? 'Cancelling…' : 'Confirm Cancellation'}
                  </Button>
                </div>
              </div>
            </div>
          )}·
          {/* Update Card Modal */}
          {showCardModal && (
            <div className=\"fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4\">
              <div className=\"w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4\">
                <h3 className=\"text-base font-bold text-[var(--text-primary)]\">Update Payment Card</h3>
                <div>
                  <label htmlFor=\"card-last4\" className=\"block text-xs font-semibold text-[var(--text-secondary)] mb-1\">
                    Last 4 Digits of New Card
                  </label>
                  <input
                    id=\"card-last4\"
                    type=\"text\"
                    maxLength={4}
                    value={cardLast4}
                    onChange={(e) => setCardLast4(e.target.value.replace(/\\D/g, ''))}
                    placeholder=\"4242\"
                    className=\"w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]\"
                  />
                </div>
                <div className=\"flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]\">
                  <Button type=\"button\" variant=\"secondary\" size=\"sm\" onClick={() => setShowCardModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    type=\"button\"
                    variant=\"primary\"
                    size=\"sm\"
                    onClick={handleUpdateCard}
                    disabled={cardUpdating || cardLast4.length !== 4}
                  >
                    {cardUpdating ? 'Saving…' : 'Save Card'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
    "

      24 |       'utf8',
      25 |     );
    > 26 |     expect(panel).toContain('getBillingSummaryFromBff');
         |                   ^
      27 |     expect(panel).toContain('createStripeCheckoutFromBff');
      28 |     expect(panel).toContain('createStripePortalFromBff');
      29 |     expect(panel).toContain('cancelBillingSubscriptionFromBff');

      at Object.<anonymous> (src/__tests__/phase-b15-billing-stripe.test.ts:26:19)

PASS src/__tests__/phase-5h-vendor-portal.test.ts
PASS src/__tests__/phase-5e-insights.test.ts
FAIL src/__tests__/phase-d-admin-transport.test.ts
  ● phase D — production browser apiFetch guard › no production browser modules call apiFetch

    expect(received).toEqual(expected) // deep equality

    - Expected  - 1
    + Received  + 4

    - Array []
    + Array [
    +   "app/(project)/project/[id]/underwriting/page.tsx",
    +   "context/SavedDealsContext.tsx",
    + ]

      48 |     }
      49 |
    > 50 |     expect(violations).toEqual([]);
         |                        ^
      51 |   });
      52 | });
      53 |

      at Object.<anonymous> (src/__tests__/phase-d-admin-transport.test.ts:50:24)

PASS src/__tests__/phase-5f-reports.test.ts
PASS src/__tests__/production-mock-guard.test.ts
PASS src/__tests__/phase-b13-1-deal-communication.test.ts
PASS src/__tests__/phase-5i-admin.test.ts
FAIL src/__tests__/phase-e-firebase-only.test.ts
  ● phase E — Supabase runtime removed › legacy api client module removed

    expect(received).toBe(expected) // Object.is equality

    Expected: true
    Received: false

      37 |       threw = true;
      38 |     }
    > 39 |     expect(threw).toBe(true);
         |                   ^
      40 |   });
      41 |
      42 |   it('OAuth callback redirects away from Supabase flow', () => {

      at Object.<anonymous> (src/__tests__/phase-e-firebase-only.test.ts:39:19)

FAIL src/__tests__/yves-ui-port.test.ts
  ● Yves-update-UI marketing copy lock (V1 paths) › Landing Hero subcopy matches approved 4-phase copy

    expect(received).toContain(expected) // indexOf

    Expected substring: "Every real estate deal runs through the same four phases: Acquisition, Fund, Hold, Exit."
    Received string:    "'use client';·
    import Link from 'next/link';
    import {
      heroHeadline,
      heroSubheadline,
      heroBody,
      heroInsurance,
      heroKicker,
    } from '@/lib/marketing/copy';·
    function BrowserMockup() {
      return (
        <div className=\"relative w-full aspect-[16/10] min-w-[280px] max-w-[600px] rounded-2xl overflow-hidden border border-white/10 bg-[#161622] shadow-[0_24px_50px_rgba(0,0,0,0.5)]\">
          {/* Toolbar */}
          <div className=\"flex items-center justify-between bg-[#12121a] px-4 py-3 border-b border-white/[0.06]\">
            {/* Window controls */}
            <div className=\"flex items-center gap-1.5\">
              <span className=\"h-2.5 w-2.5 rounded-full bg-[#ff5f56]\" />
              <span className=\"h-2.5 w-2.5 rounded-full bg-[#ffbd2e]\" />
              <span className=\"h-2.5 w-2.5 rounded-full bg-[#27c93f]\" />
            </div>
            {/* Address bar */}
            <div className=\"mx-auto flex h-6 w-3/5 items-center justify-center rounded-lg bg-white/[0.04] px-3 border border-white/[0.06] text-[10px] text-white/40 font-medium tracking-wide\">
              paperworking.co/dashboard
            </div>
            {/* Right spacer to balance window controls */}
            <div className=\"w-12\" />
          </div>·······
          {/* Inner Screen - Gradient placeholder */}
          <div className=\"relative h-[calc(100%-48px)] w-full bg-gradient-to-br from-[#121420] via-[#1b1c30] to-[#0c0d15] flex flex-col items-center justify-center\">
            {/* Grid pattern overlay */}
            <div className=\"absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] bg-[size:16px_16px]\" />
            {/* Soft center glow */}
            <div className=\"pointer-events-none absolute left-1/2 top-1/2 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--color-primary)]/10 blur-[45px]\" aria-hidden />·········
            <span className=\"relative z-10 font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-widest text-white/40\">
              Dashboard preview
            </span>
          </div>
        </div>
      );
    }·
    export default function LandingHero() {
      return (
        <section className=\"relative w-full overflow-hidden bg-[#0a0a0f] py-16 md:py-24 lg:py-28\">
          {/* Ambient background glow */}
          <div
            className=\"pointer-events-none absolute right-0 top-0 h-[600px] w-[700px] rounded-full bg-[color:var(--color-primary)]/[0.06] blur-[160px]\"
            aria-hidden
          />·
          <div className=\"relative z-10 mx-auto max-w-[1280px] px-6 md:px-8\">
            <div className=\"grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16\">···········
              {/* Left Text Column */}
              <div className=\"flex flex-col items-start text-left space-y-6\">
                {/* Kicker bar */}
                <span className=\"inline-block text-[14px] font-medium uppercase tracking-[0.08em] text-[color:var(--color-primary)]\">
                  {heroKicker}
                </span>·
                {/* Headline */}
                <h1 className=\"text-4xl font-medium tracking-tight text-white sm:text-5xl md:text-6xl leading-[1.05]\">
                  {heroHeadline}
                </h1>·
                {/* Subheadline */}
                <h2 className=\"text-[20px] leading-relaxed text-white/70\">
                  {heroSubheadline}
                </h2>·
                {/* Body and Insurance paragraphs */}
                <div className=\"space-y-4\">
                  <p className=\"text-[16px] leading-[1.65] text-white/50\">
                    {heroBody}
                  </p>
                  <p className=\"text-[16px] leading-[1.65] text-white/50\">
                    {heroInsurance}
                  </p>
                </div>·
                {/* CTA row */}
                <div className=\"flex w-full flex-col gap-3.5 sm:flex-row sm:w-auto\">
                  <Link
                    href=\"/pricing\"
                    className=\"inline-flex min-h-[44px] items-center justify-center bg-[color:var(--color-primary)] text-[#0a0a0f] px-6 py-3 text-[14px] font-semibold rounded-[10px] hover:brightness-110 transition shadow-[0_0_24px_-4px_rgba(0,221,148,0.35)]\"
                  >
                    Get started
                  </Link>
                  <Link
                    href=\"#deal-calculator\"
                    className=\"inline-flex min-h-[44px] items-center justify-center border border-white/15 hover:border-white/30 text-white px-6 py-3 text-[14px] font-semibold rounded-[10px] transition\"
                  >
                    See how it works
                  </Link>
                </div>
              </div>·
              {/* Right Visual Column */}
              <div className=\"relative flex justify-center lg:justify-end\">
                <div
                  className=\"pointer-events-none absolute inset-0 rounded-3xl bg-[color:var(--color-primary)]/[0.04] blur-[50px]\"
                  aria-hidden
                />
                <BrowserMockup />
              </div>·
            </div>
          </div>
        </section>
      );
    }
    "

      12 |   it('Landing Hero subcopy matches approved 4-phase copy', () => {
      13 |     const heroContent = fs.readFileSync(landingHeroPath, 'utf8');
    > 14 |     expect(heroContent).toContain(
         |                         ^
      15 |       'Every real estate deal runs through the same four phases: Acquisition, Fund, Hold, Exit.',
      16 |     );
      17 |     expect(heroContent).toContain('Start Free 14-Day Trial');

      at Object.<anonymous> (src/__tests__/yves-ui-port.test.ts:14:25)

  ● Yves-update-UI marketing copy lock (V1 paths) › How It Works hero matches approved copy

    expect(received).toContain(expected) // indexOf

    Expected substring: "The REIL"
    Received string:    "'use client';·
    import Link from 'next/link';
    import HowItWorksLifecycleGraphic from '@/components/marketing/HowItWorksLifecycleGraphic';
    import {
      howItWorksHeader,
      howItWorksSubheadline,
      howItWorksBody,
      dealCalculatorSectionTitle,
      dealCalculatorSectionBody,
      dealCalculatorSectionSub,
    } from '@/lib/marketing/copy';·
    const PHASE_CARDS = [
      {
        num: 'PHASE 01',
        title: 'Acquisition',
        color: 'text-[color:var(--color-primary)]',
        accentBg: 'bg-[color:var(--color-primary)]/10 border-[color:var(--color-primary)]/20',
        description:
          'Acquisition: Decide if the deal works before you buy. The Deal Calculator pulls live property data, an automated valuation, and projected cap rate, IRR, and cash-on-cash.',
      },
      {
        num: 'PHASE 02',
        title: 'Fund',
        color: 'text-sky-400',
        accentBg: 'bg-sky-400/10 border-sky-400/20',
        description:
          'Fund: Get the money and paperwork lined up. Track contingency deadlines and earnest money, keep contracts in one vault, get alerted before dates go hard.',
      },
      {
        num: 'PHASE 03',
        title: 'Hold',
        color: 'text-amber-400',
        accentBg: 'bg-amber-400/10 border-amber-400/20',
        description:
          'Hold: Own it and improve it. Link milestones to your budget, log expenses as they happen, watch holding costs and budget-vs-actual in real time.',
      },
      {
        num: 'PHASE 04',
        title: 'Exit',
        color: 'text-white/50',
        accentBg: 'bg-white/5 border-white/15',
        description:
          'Exit: Sell it or keep it as a rental, and prove what it made. Generate the performance record your buyer, lender, or appraiser expects.',
      },
    ] as const;·
    /** Ported from PaperWorking `components/landing/HowItWorks.tsx`. */
    export default function HowItWorks() {
      return (
        <div>
          <section className=\"relative overflow-hidden border-b border-white/5 pb-16 pt-8 md:pb-24 md:pt-12\">
            <div className=\"pointer-events-none absolute left-1/2 top-1/4 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--color-primary)]/5 blur-[160px]\" />·
            <div className=\"relative z-10 mx-auto max-w-[1280px] px-6 text-center\">
              <div className=\"mb-6 inline-flex items-center gap-2 rounded-full border border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-primary)]\">
                <span className=\"material-symbols-outlined text-sm\">hub</span>
                {howItWorksHeader}
              </div>·
              <h1 className=\"landing-display mx-auto mb-6 max-w-4xl font-semibold leading-[1.1] tracking-[-0.025em] text-white\">
                {howItWorksSubheadline}
              </h1>·
              <p className=\"mx-auto mb-14 max-w-3xl text-base leading-[1.65] text-white/65 sm:text-lg\">
                {howItWorksBody}
              </p>·
              <div className=\"grid grid-cols-1 gap-5 text-left md:grid-cols-2 md:gap-6 lg:grid-cols-4\">
                {PHASE_CARDS.map((card) => (
                  <div
                    key={card.num}
                    className=\"glass-card group flex flex-col justify-between rounded-[22px] border border-white/10 bg-[#0c090b]/80 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--color-primary)]/40 sm:p-7\"
                  >
                    <div>
                      <div className=\"mb-4 flex items-center justify-between\">
                        <span
                          className={`font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-medium uppercase tracking-[0.15em] ${card.color}`}
                        >
                          {card.num}
                        </span>
                        <span className={`h-2 w-2 rounded-full border ${card.accentBg}`} />
                      </div>
                      <h2 className=\"mb-3 text-2xl font-bold tracking-[-0.02em] text-white transition-colors group-hover:text-[color:var(--color-primary)]\">
                        {card.title}
                      </h2>
                      <p className=\"text-[13.5px] leading-[1.6] text-white/60 sm:text-[14px]\">
                        {card.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>·
          <section className=\"border-b border-white/5 bg-white/[0.02] py-14 md:py-20\">
            <div className=\"mx-auto max-w-[1280px] px-6 md:px-10\">
              <div className=\"max-w-3xl\">
                <h2 className=\"mb-6 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white md:text-3xl\">
                  What a Project is
                </h2>
                <p className=\"mb-5 text-base leading-[1.65] text-white/65 sm:text-lg\">
                  A Project is the home base for one investment. It holds the Deal (the property and its
                  numbers), the phase it&apos;s in, the tasks and deadlines ahead, the documents, the
                  budget, and the ledger of every dollar in and out. You work in the Project; PaperWorking
                  calculates your metrics from it.
                </p>
                <p className=\"text-base font-semibold leading-relaxed text-white sm:text-lg\">
                  The work you already do becomes the numbers you need.
                </p>
              </div>
            </div>
          </section>·
          <section className=\"border-b border-white/5 py-14 md:py-20\">
            <div className=\"mx-auto max-w-[1280px] space-y-10 px-6 md:px-10\">
              <div className=\"mb-8 max-w-3xl\">
                <span className=\"mb-2 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-[color:var(--color-primary)]\">
                  DEEP-DIVE WORKFLOWS
                </span>
                <h2 className=\"text-2xl font-semibold leading-tight tracking-[-0.02em] text-white md:text-3xl\">
                  Inside each phase of your deal
                </h2>
              </div>·
              <div className=\"glass-card rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-xl sm:p-10\">
                <span className=\"mb-3 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-[color:var(--color-primary)]\">
                  {dealCalculatorSectionTitle}
                </span>
                <h3 className=\"mb-4 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white\">
                  {dealCalculatorSectionBody}
                </h3>
                <div className=\"space-y-4 text-base leading-[1.65] text-white/65\">
                  <p>
                    {dealCalculatorSectionSub}
                  </p>
                  <p>
                    What you log here (purchase price, projected rents, rehab estimate) becomes the
                    baseline your actuals are measured against later.
                  </p>
                  <p>
                    Raising money from partners? List the deal on the Deal Marketplace to track interest
                    from other real estate investors in your network and pledges from investors in the
                    PaperWorking community. Interest and pledges are tracked here; every closing happens
                    between the parties, off-platform. No money moves through PaperWorking.
                  </p>
                </div>
              </div>·
              <div className=\"glass-card rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-xl sm:p-10\">
                <span className=\"mb-3 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-sky-400\">
                  PHASE 02 · CAPITAL & CONTINGENCIES
                </span>
                <h3 className=\"mb-4 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white\">
                  Phase 2 — Fund
                </h3>
                <div className=\"space-y-4 text-base leading-[1.65] text-white/65\">
                  <p>
                    Fund: Get the money and paperwork lined up. Track contingency deadlines and earnest
                    money, keep contracts in one vault, get alerted before dates go hard.
                  </p>
                </div>
              </div>·
              <div className=\"glass-card rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-xl sm:p-10\">
                <span className=\"mb-3 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-amber-400\">
                  PHASE 03 · EXECUTE & OPTIMIZE
                </span>
                <h3 className=\"mb-4 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white\">
                  Phase 3 — Hold
                </h3>
                <div className=\"space-y-4 text-base leading-[1.65] text-white/65\">
                  <p>
                    Hold: Own it and improve it. Link milestones to your budget, log expenses as they
                    happen, watch holding costs and budget-vs-actual in real time.
                  </p>
                  <p>
                    The Vendor Marketplace earns its keep here: find the contractor, appraiser, or attorney
                    when the project needs them.
                  </p>
                </div>
              </div>·
              <div className=\"glass-card rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-xl sm:p-10\">
                <span className=\"mb-3 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-white/50\">
                  PHASE 04 · REALIZE & PROVE
                </span>
                <h3 className=\"mb-4 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white\">
                  Phase 4 — Exit
                </h3>
                <div className=\"space-y-4 text-base leading-[1.65] text-white/65\">
                  <p>
                    Exit: Sell it or keep it as a rental, and prove what it made. Generate the performance
                    record your buyer, lender, or appraiser expects.
                  </p>
                </div>
              </div>
            </div>
          </section>·
          <section className=\"border-b border-white/5 bg-white/[0.02] py-14 md:py-20\">
            <div className=\"mx-auto max-w-[1280px] px-6 md:px-10\">
              <div className=\"max-w-3xl\">
                <h2 className=\"mb-6 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white sm:text-3xl md:text-4xl\">
                  The Real Estate Investment Lifecycle
                </h2>
                <div className=\"space-y-5 text-base leading-[1.65] text-white/65 sm:text-lg\">
                  <p>
                    Real Estate investments move through a unique lifecycle that is different from most
                    traditional project management workflows. PaperWorking structures every deal around
                    four core phases: Acquisition, Fund, Hold, and Exit. Each phase has its own specific
                    inputs, milestones, compliance gates, and financial calculations.
                  </p>
                  <p>
                    By organizing your work around these four phases, PaperWorking ensures that no critical
                    deadline is missed, expenses are tracked from day one, and investment metrics are
                    calculated automatically from your actual project data — per deal and across your
                    entire portfolio.
                  </p>
                </div>
              </div>
            </div>
          </section>·
          <section className=\"border-b border-white/5 py-14 md:py-20\">
            <div className=\"mx-auto max-w-[1280px] px-6 md:px-10\">
              <div className=\"max-w-3xl\">
                <h2 className=\"mb-8 text-3xl font-semibold leading-tight tracking-[-0.02em] text-white sm:text-4xl\">
                  One deal, all the way through
                </h2>
                <div className=\"space-y-6 text-base leading-[1.65] text-white/65 sm:text-lg\">
                  <p>
                    Take one deal. You find a duplex and run the address through the Deal Calculator; the
                    projected cap rate and cash-on-cash clear your bar, so you save it to the pipeline.
                    Those projections become your baseline.
                  </p>
                  <p>
                    You go under contract, and the Project moves to Fund. The inspection deadline, the
                    appraisal contingency, and the earnest money date get tracked with alerts. Contracts
                    and title work go into the vault.
                  </p>
                  <p>
                    At Hold, you build the rehab budget line by line and link each milestone to it. Every
                    contractor draw and invoice gets logged against a line item. Rent comes in through your
                    connected accounts. You never open a spreadsheet, but cost basis, holding costs, and
                    cash-on-cash stay current, because the ledger is the work.
                  </p>
                  <p>
                    When you sell or refinance, the Exit report reads from that same ledger: actual NOI,
                    DSCR, equity multiple. Your CPA gets the P&amp;L export. The Project closes, the history
                    stays, and your portfolio numbers update the day it happens.
                  </p>
                </div>
              </div>
            </div>
          </section>·
          <section className=\"border-b border-white/5 bg-white/[0.02] py-14 md:py-20\">
            <div className=\"mx-auto max-w-[1280px] px-6 md:px-10\">
              <div className=\"max-w-3xl\">
                <h2 className=\"mb-6 text-3xl font-semibold leading-tight tracking-[-0.02em] text-white sm:text-4xl\">
                  Lead Investor and Team roles
                </h2>
                <p className=\"mb-6 text-base leading-[1.65] text-white/65 sm:text-lg\">
                  An Investor account runs solo. An Investment Team account has a Lead Investor, the person
                  running the team, who invites members, assigns tasks and phases, and controls what each
                  can view or edit.
                </p>
                <ul className=\"mb-6 list-disc space-y-3 pl-5 text-base text-white/65 sm:text-lg\">
                  <li>Partners work the phases they&apos;re assigned.</li>
                  <li>Your CPA reads the books without being able to touch them.</li>
                  <li>Contractors and vendors see only the work they&apos;re assigned.</li>
                </ul>
                <p className=\"mb-4 text-base font-semibold leading-relaxed text-white sm:text-lg\">
                  Two investors can also team up on a single Project without merging accounts.
                </p>
              </div>
            </div>
          </section>·
          <section className=\"relative overflow-hidden border-b border-white/5 bg-white/[0.03] py-14 md:py-20 lg:py-24\">
            <div className=\"pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[color:var(--color-primary)]/[0.03] to-transparent\" />
            <div className=\"relative z-10 mx-auto max-w-3xl px-6 text-center\">
              <p className=\"mb-8 text-base font-medium text-white sm:text-lg\">
                Want to see it first? Walk through a live demo deal: pipeline, budgets, deadlines, and
                metrics included.
              </p>
              <div className=\"flex flex-col items-center justify-center gap-4 sm:flex-row\">
                <Link
                  href=\"/pricing\"
                  className=\"inline-flex cursor-pointer items-center gap-2.5 rounded-full bg-[color:var(--color-primary)] px-8 py-4 text-[15px] font-semibold tracking-wide text-[#0a0a0f] shadow-[0_0_24px_-4px_rgba(0,221,148,0.45)]\"
                >
                  Start Free 14-Day Trial
                  <span className=\"material-symbols-outlined text-[18px]\">arrow_forward</span>
                </Link>
              </div>
            </div>
          </section>·
          <HowItWorksLifecycleGraphic />
        </div>
      );
    }
    "

      21 |   it('How It Works hero matches approved copy', () => {
      22 |     const hwContent = fs.readFileSync(howItWorksPath, 'utf8');
    > 23 |     expect(hwContent).toContain('The REIL');
         |                       ^
      24 |     expect(hwContent).toContain('Four phases. One record. Thirty-three key datapoints.');
      25 |   });
      26 |

      at Object.<anonymous> (src/__tests__/yves-ui-port.test.ts:23:23)

  ● Yves-update-UI marketing copy lock (V1 paths) › Marketplaces page has approved marketplace copy

    expect(received).toContain(expected) // indexOf

    Expected substring: "PaperWorking subscribers run real deals through the same four phases you do."
    Received string:    "'use client';·
    import Link from 'next/link';
    import { useEffect, useState } from 'react';
    import {
      twoMarketplacesTitle,
      twoMarketplacesBody,
      dealMarketplaceBlurb,
      vendorMarketplaceBlurb,
      legalDisclaimer,
    } from '@/lib/marketing/copy';·
    /** Ported from PaperWorking `components/landing/MarketplacesClient.tsx`. */
    export default function MarketplacesClient() {
      const [activeTab, setActiveTab] = useState<'deals' | 'vendors'>('deals');·
      useEffect(() => {
        const handleHash = () => {
          const hash = window.location.hash;
          if (hash === '#vendors') setActiveTab('vendors');
          else if (hash === '#deals') setActiveTab('deals');
        };·
        handleHash();
        window.addEventListener('hashchange', handleHash);
        return () => window.removeEventListener('hashchange', handleHash);
      }, []);·
      function handleTabClick(tab: 'deals' | 'vendors') {
        setActiveTab(tab);
        window.history.pushState(null, '', `#${tab}`);
      }·
      return (
        <div className=\"mx-auto flex min-h-[60vh] max-w-[1200px] flex-col justify-center py-8 md:py-14\">
          <section className=\"mx-auto max-w-3xl space-y-6 pt-4 text-center md:pt-6\">
            <span className=\"inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 backdrop-blur-sm\">
              <span className=\"h-1.5 w-1.5 rounded-full bg-[color:var(--color-primary)]\" />
              <span className=\"font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-[color:var(--color-primary)]\">
                Two marketplaces, one network
              </span>
            </span>·
            <h1 className=\"landing-display font-semibold leading-[1.05] tracking-[-0.025em] text-white\">
              {twoMarketplacesTitle}
            </h1>·
            <div className=\"mx-auto max-w-3xl space-y-4 text-center\">
              <p className=\"text-base font-medium leading-[1.65] text-white/70 sm:text-lg\">
                {twoMarketplacesBody}
              </p>
              <p className=\"text-sm leading-[1.65] text-white/60 sm:text-base\">
                {activeTab === 'deals' ? dealMarketplaceBlurb : vendorMarketplaceBlurb}
              </p>
            </div>·
            <div className=\"flex justify-center pt-2\">
              <div
                role=\"tablist\"
                aria-label=\"Marketplace options\"
                className=\"inline-flex max-w-full items-center overflow-x-auto rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur-sm\"
              >
                <button
                  type=\"button\"
                  role=\"tab\"
                  aria-selected={activeTab === 'deals'}
                  aria-controls=\"deals\"
                  onClick={() => handleTabClick('deals')}
                  className={`flex min-h-[44px] cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-6 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] ${
                    activeTab === 'deals'
                      ? 'bg-[color:var(--color-primary)] text-[#0a0a0f] shadow-md'
                      : 'text-white/55 hover:text-white'
                  }`}
                >
                  Deal Marketplace
                </button>·
                <button
                  type=\"button\"
                  role=\"tab\"
                  aria-selected={activeTab === 'vendors'}
                  aria-controls=\"vendors\"
                  onClick={() => handleTabClick('vendors')}
                  className={`flex min-h-[44px] cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-6 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] ${
                    activeTab === 'vendors'
                      ? 'bg-[color:var(--color-primary)] text-[#0a0a0f] shadow-md'
                      : 'text-white/55 hover:text-white'
                  }`}
                >
                  Vendor Marketplace
                </button>
              </div>
            </div>·
            <div className=\"space-y-6 pb-2 pt-6\">
              <div className=\"flex flex-col items-center justify-center gap-4 sm:flex-row\">
                <Link
                  href={activeTab === 'deals' ? '/dashboard/deals' : '/dashboard/marketplace'}
                  className=\"inline-flex items-center gap-2 rounded-full bg-[color:var(--color-primary)] px-8 py-4 text-[14px] font-semibold tracking-wide text-[#0a0a0f] shadow-[0_0_24px_-4px_rgba(0,221,148,0.45)] transition-all duration-150 active:scale-95\"
                >
                  Browse the marketplaces
                  <span className=\"material-symbols-outlined text-[18px]\">arrow_forward</span>
                </Link>
                <Link
                  href=\"/pricing\"
                  className=\"inline-flex items-center gap-2 rounded-full border border-white/15 px-8 py-4 text-[14px] font-semibold text-white transition-all duration-150 hover:border-[color:var(--color-primary)]/40 hover:text-[color:var(--color-primary)]\"
                >
                  List your services as a vendor
                  <span className=\"material-symbols-outlined text-[18px]\">arrow_forward</span>
                </Link>
              </div>
              <p className=\"mx-auto max-w-lg font-[family-name:var(--font-jetbrains-mono)] text-xs leading-relaxed text-white/40\">
                {legalDisclaimer}
              </p>
            </div>
          </section>
        </div>
      );
    }
    "

      27 |   it('Marketplaces page has approved marketplace copy', () => {
      28 |     const clientContent = fs.readFileSync(marketplacesPath, 'utf8');
    > 29 |     expect(clientContent).toContain(
         |                           ^
      30 |       'PaperWorking subscribers run real deals through the same four phases you do.',
      31 |     );
      32 |     expect(clientContent).toContain('Put your Project in front of investors who are looking.');

      at Object.<anonymous> (src/__tests__/yves-ui-port.test.ts:29:27)

  ● Yves-update-UI marketing copy lock (V1 paths) › Logo uses canonical raster brand masters

    expect(received).toContain(expected) // indexOf

    Expected substring: "/brand/paperworking-logotype-white-transparent.png"
    Received string:    "'use client';·
    import Link from 'next/link';
    import { PaperWorkingIcon } from '@/components/brand/icons/PaperWorkingIcon';
    import { PaperWorkingLogotype } from '@/components/brand/icons/PaperWorkingLogotype';·
    type SizeKey = 'h-6' | 'h-8' | 'h-10' | 'h-12' | 'sm' | 'md' | 'lg';·
    interface LogoProps {
      href?: string;
      /** `full` = icon+wordmark; `icon` = mark only; `hero-landing` = full with w-1/2 */
      variant?: 'full' | 'icon' | 'hero-landing';
      /** light = black mark; dark = white mark; auto follows tone */
      theme?: 'light' | 'dark' | 'auto';
      size?: SizeKey | number;
      className?: string;
      /** Presets for marketing / auth / dashboard chrome */
      tone?: 'marketing' | 'auth' | 'dashboard';
      collapsed?: boolean;
    }·
    const heightMap: Record<SizeKey, number> = {
      'h-6': 24,
      'h-8': 32,
      'h-10': 40,
      'h-12': 48,
      sm: 20,
      md: 24,
      lg: 30,
    };·
    const ASPECT_RATIOS = {
      full: 400 / 51.38,
      icon: 512 / 474,
    };·
    export default function Logo({
      href = '/',
      variant,
      theme = 'auto',
      size,
      className = '',
      tone = 'marketing',
      collapsed = false,
    }: LogoProps) {
      const resolvedTheme: 'light' | 'dark' =
        theme === 'auto' ? (tone === 'auth' || tone === 'dashboard' ? 'dark' : 'dark') : theme;·
      // Marketing landing is dark-first (v0 parity); light pages can pass theme=\"light\".
      const color = resolvedTheme === 'dark' ? '#fdfffc' : '#0a0a0f';·
      const targetVariant: 'full' | 'icon' =
        variant === 'hero-landing' ? 'full' : (variant ?? (collapsed || tone === 'dashboard' ? 'icon' : 'full'));·
      let resolvedHeight = 24;
      if (typeof size === 'number') resolvedHeight = size;
      else if (size && size in heightMap) resolvedHeight = heightMap[size];
      else resolvedHeight = targetVariant === 'icon' ? 24 : 28;·
      const resolvedWidth = Math.round(resolvedHeight * ASPECT_RATIOS[targetVariant]);
      const Svg = targetVariant === 'full' ? PaperWorkingLogotype : PaperWorkingIcon;·
      // Sizing utilities: responsive when size is not provided, clamping to max-width 50%
      let widthClass = '';
      let svgClassName = 'select-none max-w-none';·
      if (!size) {
        widthClass = variant === 'hero-landing'
          ? 'w-1/2 max-w-[50%]'
          : 'w-[25%] md:w-[20%] lg:w-[18%] max-w-[50%]';
        svgClassName = 'w-full h-auto select-none';
      } else {
        widthClass = 'max-w-[50%]';
      }·
      const mark = (
        <>
          {targetVariant === 'full' ? (
            <>
              <PaperWorkingLogotype
                width={!size ? '100%' : resolvedWidth}
                height={!size ? '100%' : resolvedHeight}
                role=\"img\"
                aria-label=\"PaperWorking\"
                style={{ color, flexShrink: 0 }}
                className={`hidden select-none md:block ${svgClassName}`}
              />
              <PaperWorkingIcon
                width={!size ? '100%' : Math.round(resolvedHeight * ASPECT_RATIOS.icon)}
                height={!size ? '100%' : resolvedHeight}
                role=\"img\"
                aria-label=\"PaperWorking\"
                style={{ color, flexShrink: 0 }}
                className={`block select-none md:hidden ${svgClassName}`}
              />
            </>
          ) : (
            <Svg
              width={!size ? '100%' : resolvedWidth}
              height={!size ? '100%' : resolvedHeight}
              role=\"img\"
              aria-label=\"PaperWorking\"
              style={{ color, flexShrink: 0 }}
              className={svgClassName}
            />
          )}
        </>
      );·
      if (href) {
        return (
          <Link
            href={href}
            className={`inline-flex shrink-0 transition-opacity duration-150 hover:opacity-75 focus-visible:opacity-75 focus-visible:outline-none ${widthClass} ${className}`}
            aria-label=\"PaperWorking — Return to homepage\"
          >
            {mark}
          </Link>
        );
      }·
      return <span className={`inline-flex items-center shrink-0 ${widthClass} ${className}`}>{mark}</span>;
    }
    "

      37 |     const logoPath = path.join(webRoot, 'components/marketing/Logo.tsx');
      38 |     const logoContent = fs.readFileSync(logoPath, 'utf8');
    > 39 |     expect(logoContent).toContain('/brand/paperworking-logotype-white-transparent.png');
         |                         ^
      40 |     expect(logoContent).toContain('/brand/paperworking-icon-black-transparent.png');
      41 |   });
      42 |

      at Object.<anonymous> (src/__tests__/yves-ui-port.test.ts:39:25)

PASS src/__tests__/phase-5d-projects.test.ts
FAIL src/__tests__/phase-b14-project-documents.test.ts
  ● phase B14 — browser document transport › ProjectDocumentsPanel uses same-origin document BFF helpers

    expect(received).toContain(expected) // indexOf

    Expected substring: "listProjectDocumentsFromBff"
    Received string:    "'use client';·
    import Link from 'next/link';
    import { getSeedProjectById } from '@/lib/projects/seed-data';·
    export default function ProjectDocumentsPanel({ projectId }: { projectId: string }) {
      const project = getSeedProjectById(projectId);
      const documents = project?.documents ?? [];·
      if (!project) {
        return (
          <div className=\"rounded-2xl border border-white/10 bg-black/25 p-8 text-sm text-white/65\">
            Project not found.
          </div>
        );
      }·
      return (
        <div className=\"space-y-6\">
          <div>
            <p className=\"mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45\">
              {project.propertyName}
            </p>
            <h2 className=\"text-2xl font-semibold tracking-[-0.02em]\">Document vault</h2>
            <p className=\"mt-2 max-w-2xl text-sm text-white/65\">
              Seed documents from project workspace. Upload pipeline connects via `handleProjectsDocumentsPost` post-cutover.
            </p>
          </div>·
          <div className=\"overflow-hidden rounded-2xl border border-white/10\">
            <table className=\"w-full text-left text-sm\">
              <thead className=\"bg-white/[0.04] text-white/45\">
                <tr>
                  <th className=\"px-5 py-3 font-medium\">Name</th>
                  <th className=\"px-5 py-3 font-medium\">Type</th>
                  <th className=\"px-5 py-3 font-medium\">Added</th>
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={3} className=\"px-5 py-8 text-white/45\">
                      No documents yet.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.doc_id} className=\"border-t border-white/8\">
                      <td className=\"px-5 py-4 font-medium\">{doc.name}</td>
                      <td className=\"px-5 py-4 text-white/65\">{doc.type}</td>
                      <td className=\"px-5 py-4 text-white/65\">
                        {doc.generated_at ? new Date(doc.generated_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>·
          <Link href={`/project/${projectId}`} className=\"text-sm text-white/60 underline-offset-4 hover:underline\">
            ← Project overview
          </Link>
        </div>
      );
    }
    "

      13 |     );
      14 |
    > 15 |     expect(panel).toContain('listProjectDocumentsFromBff');
         |                   ^
      16 |     expect(panel).toContain('uploadProjectDocumentFromBff');
      17 |     expect(panel).toContain('getProjectDocumentAccessFromBff');
      18 |     expect(panel).not.toContain('loadProjectById');

      at Object.<anonymous> (src/__tests__/phase-b14-project-documents.test.ts:15:19)

PASS src/__tests__/phase-b17-1-profile-security.test.ts
PASS src/__tests__/phase-b14-1-storage-readiness.test.ts
PASS src/__tests__/phase-7d-legal-help.test.ts
PASS src/__tests__/safe-redirect.test.ts
PASS src/__tests__/phase-7-cutover.test.ts
PASS src/__tests__/phase-7c-marketing-gap.test.ts
PASS src/__tests__/phase-9a-admin-auth.test.ts
PASS src/__tests__/phase-9a-handler-deps.test.ts
PASS lib/marketing/__tests__/copy.test.ts
PASS src/__tests__/phase-7e-dashboard-shell.test.ts
PASS src/__tests__/phase-6-integration.test.ts
PASS src/__tests__/phase-7f-complete.test.ts

Summary of all failing tests
FAIL src/__tests__/phase-b6-inbox-mutations.test.ts
  ● phase B6 — InboxNotificationCenter transport › uses bffFetch not apiFetch for PATCH/DELETE /api/inbox/:id

    expect(received).toContain(expected) // indexOf

    Expected substring: "bffFetch(`/api/inbox/${id}`"
    Received string:    "'use client';·
    import Link from 'next/link';
    import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
    import ComposeEmailModal from '@/components/inbox/ComposeEmailModal';
    import InboxItemCard from '@/components/inbox/InboxItemCard';
    import InboxTabs from '@/components/inbox/InboxTabs';
    import {
      INBOX_TABS,
      INBOX_THREADS,
      type InboxTabId,
      type InboxThread,
    } from '@/lib/dashboard/shell-seed';·
    function emptyCounts(): Record<InboxTabId, number> {
      return {
        all: 0,
        opportunities: 0,
        tasks: 0,
        vendor: 0,
        team: 0,
        system: 0,
      };
    }·
    function NotifMoreMenu({
      item,
      isUnread,
      onMarkUnreadToggle,
      onArchive,
      onDelete,
    }: {
      item: InboxThread;
      isUnread: boolean;
      onMarkUnreadToggle: () => void;
      onArchive: () => void;
      onDelete: () => void;
    }) {
      const [open, setOpen] = useState(false);
      const ref = useRef<HTMLDivElement>(null);·
      useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
          if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
      }, [open]);·
      return (
        <div ref={ref} className=\"relative\">
          <button
            type=\"button\"
            id=\"notif-more-menu-trigger\"
            onClick={() => setOpen((v) => !v)}
            className=\"cursor-pointer rounded-lg p-2 text-[#9E9DA0] transition-colors hover:bg-white/5\"
            aria-label=\"Notification actions\"
            aria-expanded={open}
          >
            <span className=\"material-symbols-outlined\">more_vert</span>
          </button>
          {open ? (
            <div
              id=\"notif-more-menu\"
              role=\"menu\"
              className=\"absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#161318] py-1 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.6)]\"
            >
              <button
                type=\"button\"
                role=\"menuitem\"
                onClick={() => {
                  onMarkUnreadToggle();
                  setOpen(false);
                }}
                className=\"flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-[#9E9DA0] transition-colors hover:bg-white/5 hover:text-white\"
              >
                <span className=\"material-symbols-outlined text-base\">
                  {isUnread ? 'drafts' : 'mark_email_unread'}
                </span>
                {isUnread ? 'Mark as Read' : 'Mark as Unread'}
              </button>
              <div className=\"my-1 border-t border-white/5\" />
              <button
                type=\"button\"
                role=\"menuitem\"
                onClick={() => {
                  onArchive();
                  setOpen(false);
                }}
                className=\"flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-[#9E9DA0] transition-colors hover:bg-white/5 hover:text-white\"
              >
                <span className=\"material-symbols-outlined text-base\">archive</span>
                Archive
              </button>
              <button
                type=\"button\"
                role=\"menuitem\"
                onClick={() => {
                  onDelete();
                  setOpen(false);
                }}
                className=\"flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-red-400/80 transition-colors hover:bg-white/5 hover:text-red-400\"
              >
                <span className=\"material-symbols-outlined text-base\">delete</span>
                Delete
              </button>
            </div>
          ) : null}
        </div>
      );
    }·
    /**
     * Unified Inbox — port of PaperWorking `/dashboard/inbox` notification center
     * (two-pane list + reading pane, tabs, compose, mark-all-read).
     */
    export default function InboxNotificationCenter() {
      const [items, setItems] = useState<InboxThread[]>(() => [...INBOX_THREADS]);
      const [activeTab, setActiveTab] = useState<InboxTabId>('all');
      const [selectedId, setSelectedId] = useState<string | null>(null);
      const [searchQuery, setSearchQuery] = useState('');
      const [composeOpen, setComposeOpen] = useState(false);
      const [readOverrides, setReadOverrides] = useState<Record<string, boolean>>({});
      const [archivedIds, setArchivedIds] = useState<Set<string>>(() => new Set());
      const [actionFlash, setActionFlash] = useState<string | null>(null);·
      const isUnread = useCallback(
        (item: InboxThread) => {
          if (item.id in readOverrides) return !readOverrides[item.id];
          return item.unread;
        },
        [readOverrides],
      );·
      const visibleItems = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return items.filter((item) => {
          if (archivedIds.has(item.id)) return false;
          if (activeTab !== 'all' && item.tab !== activeTab) return false;
          if (!q) return true;
          return (
            item.subject.toLowerCase().includes(q) ||
            item.body.toLowerCase().includes(q) ||
            item.from.toLowerCase().includes(q) ||
            item.project.toLowerCase().includes(q)
          );
        });
      }, [items, archivedIds, activeTab, searchQuery]);·
      const unreadCounts = useMemo(() => {
        const counts = emptyCounts();
        for (const item of items) {
          if (archivedIds.has(item.id) || !isUnread(item)) continue;
          counts.all += 1;
          counts[item.tab] += 1;
        }
        return counts;
      }, [items, archivedIds, isUnread]);·
      const unreadTotal = unreadCounts.all;
      const selectedItem = visibleItems.find((i) => i.id === selectedId) ?? null;
      const selectedUnread = selectedItem ? isUnread(selectedItem) : false;·
      function markRead(id: string) {
        setReadOverrides((prev) => ({ ...prev, [id]: true }));
      }·
      function markUnread(id: string) {
        setReadOverrides((prev) => ({ ...prev, [id]: false }));
      }·
      function markAllRead() {
        const next: Record<string, boolean> = { ...readOverrides };
        for (const item of items) {
          if (!archivedIds.has(item.id)) next[item.id] = true;
        }
        setReadOverrides(next);
      }·
      function archiveItem(id: string) {
        setArchivedIds((prev) => new Set(prev).add(id));
        if (selectedId === id) setSelectedId(null);
      }·
      function deleteItem(id: string) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        if (selectedId === id) setSelectedId(null);
      }·
      function selectItem(id: string) {
        setSelectedId(id);
        markRead(id);
      }·
      function executeAction() {
        if (!selectedItem) return;
        setActionFlash(`Action queued for “${selectedItem.subject}” (seed preview).`);
        markRead(selectedItem.id);
        setTimeout(() => setActionFlash(null), 2500);
      }·
      const showDetail = Boolean(selectedItem);·
      return (
        <>
          <div
            className=\"-mb-24 flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-[#0d0a0b] text-[#9E9DA0] md:-mb-8\"
            data-testid=\"inbox-notification-center\"
          >
            {/* List pane */}
            <section
              className={`w-full shrink-0 flex-col border-r border-white/10 bg-[#161318]/50 md:flex md:w-[420px] ${
                showDetail ? 'hidden md:flex' : 'flex'
              }`}
            >
              <div className=\"space-y-4 p-6\">
                <div className=\"flex items-center justify-between\">
                  <h1 className=\"text-2xl font-bold text-[#fdfffc]\">Inbox</h1>
                  <div className=\"flex items-center gap-2\">
                    {unreadTotal > 0 ? (
                      <span className=\"rounded border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300\">
                        {unreadTotal} UNREAD
                      </span>
                    ) : null}
                    {unreadTotal > 0 ? (
                      <button
                        type=\"button\"
                        onClick={markAllRead}
                        className=\"cursor-pointer rounded-lg p-1.5 text-[#9E9DA0] transition-colors hover:bg-white/5 hover:text-emerald-300\"
                        title=\"Mark all as read\"
                      >
                        <span className=\"material-symbols-outlined text-[18px]\">done_all</span>
                      </button>
                    ) : null}
                    <button
                      type=\"button\"
                      onClick={() => setComposeOpen(true)}
                      className=\"cursor-pointer rounded-lg p-1.5 text-[#9E9DA0] transition-colors hover:bg-white/5 hover:text-emerald-300\"
                      title=\"Compose email\"
                    >
                      <span className=\"material-symbols-outlined text-[18px]\">add</span>
                    </button>
                  </div>
                </div>·
                <div className=\"relative\">
                  <span className=\"material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-[#9E9DA0]\">
                    search
                  </span>
                  <input
                    type=\"text\"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder=\"Search logs...\"
                    className=\"w-full rounded-lg border border-[#3c4a46] bg-[#0d0a0b] py-2 pl-10 pr-4 text-sm text-[#9E9DA0] outline-none transition-all placeholder:text-[#9E9DA0]/40 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/30\"
                  />
                </div>
              </div>·
              <InboxTabs
                activeTab={activeTab}
                onTabChange={(tab) => {
                  setActiveTab(tab);
                  setSelectedId(null);
                }}
                unreadCounts={unreadCounts}
              />·
              <div className=\"relative flex-1 overflow-y-auto\">
                {visibleItems.length === 0 ? (
                  <div className=\"flex flex-col items-center justify-center px-6 py-16 text-center\">
                    <span className=\"material-symbols-outlined mb-3 text-5xl opacity-20\">inbox</span>
                    <p className=\"text-sm font-medium text-white/60\">No items in this view</p>
                    <p className=\"mt-1 text-xs text-white/35\">
                      {searchQuery
                        ? 'Try a different search.'
                        : 'You’re caught up — new alerts will land here.'}
                    </p>
                  </div>
                ) : (
                  visibleItems.map((item) => (
                    <InboxItemCard
                      key={item.id}
                      item={item}
                      isUnread={isUnread(item)}
                      isActive={selectedId === item.id}
                      onSelect={() => selectItem(item.id)}
                      onArchive={() => archiveItem(item.id)}
                      onDelete={() => deleteItem(item.id)}
                    />
                  ))
                )}
              </div>
            </section>·
            {/* Reading pane */}
            <section
              className={`relative flex flex-1 flex-col overflow-hidden bg-[#0d0a0b] ${
                showDetail ? 'flex' : 'hidden md:flex'
              }`}
            >
              <div className=\"pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-[#454955]/5 blur-[100px]\" />
              <div className=\"pointer-events-none absolute bottom-20 left-20 h-64 w-64 rounded-full bg-[#7A9EAA]/5 blur-[80px]\" />·
              {selectedItem ? (
                <div className=\"z-10 flex flex-1 flex-col overflow-y-auto\">
                  <div className=\"flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0d0a0b]/50 px-6 py-5 backdrop-blur-sm sm:px-8 sm:py-6\">
                    <div className=\"flex min-w-0 items-center gap-4\">
                      <button
                        type=\"button\"
                        onClick={() => setSelectedId(null)}
                        className=\"cursor-pointer rounded-lg p-2 text-[#9E9DA0] transition-colors hover:bg-white/5 md:hidden\"
                        aria-label=\"Back\"
                      >
                        <span className=\"material-symbols-outlined\">arrow_back</span>
                      </button>
                      <div className=\"flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#0d0a0b]/60 text-emerald-400 shadow-[inset_1px_1px_0px_rgba(255,255,255,0.05)]\">
                        <span className=\"material-symbols-outlined text-[24px]\">mark_email_read</span>
                      </div>
                      <div className=\"min-w-0\">
                        <h2 className=\"truncate text-xl font-bold text-[#fdfffc] sm:text-2xl\">
                          {selectedItem.subject}
                        </h2>
                        <p className=\"font-mono text-[10px] uppercase text-[#454955]\">
                          ID: {selectedItem.id.slice(0, 8)} · STATUS:{' '}
                          {selectedUnread ? 'UNREAD' : 'READ'}
                        </p>
                      </div>
                    </div>
                    <div className=\"flex gap-1\">
                      <button
                        type=\"button\"
                        onClick={() => archiveItem(selectedItem.id)}
                        className=\"cursor-pointer rounded-lg p-2 text-[#9E9DA0] transition-colors hover:bg-white/5\"
                        title=\"Archive\"
                      >
                        <span className=\"material-symbols-outlined\">archive</span>
                      </button>
                      <button
                        type=\"button\"
                        onClick={() => deleteItem(selectedItem.id)}
                        className=\"cursor-pointer rounded-lg p-2 text-[#9E9DA0] transition-colors hover:bg-white/5\"
                        title=\"Delete\"
                      >
                        <span className=\"material-symbols-outlined\">delete</span>
                      </button>
                      <NotifMoreMenu
                        item={selectedItem}
                        isUnread={selectedUnread}
                        onMarkUnreadToggle={() =>
                          selectedUnread ? markRead(selectedItem.id) : markUnread(selectedItem.id)
                        }
                        onArchive={() => archiveItem(selectedItem.id)}
                        onDelete={() => deleteItem(selectedItem.id)}
                      />
                    </div>
                  </div>·
                  <div className=\"flex-1 overflow-y-auto p-6 sm:p-8\">
                    <div className=\"mx-auto max-w-3xl space-y-8\">
                      <div className=\"flex items-start gap-4\">
                        <div className=\"flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#454955]/20 bg-[#161318] text-lg font-bold text-[#454955]\">
                          {selectedItem.from[0]}
                        </div>
                        <div className=\"min-w-0 flex-1\">
                          <div className=\"mb-1 flex flex-wrap items-center justify-between gap-2\">
                            <span className=\"font-bold text-[#fdfffc]\">{selectedItem.from}</span>
                            <span className=\"font-mono text-[10px] uppercase text-[#9E9DA0]\">
                              {new Date(selectedItem.receivedAt).toLocaleString()} UTC
                            </span>
                          </div>
                          {selectedItem.fromRole ? (
                            <p className=\"mb-4 text-sm text-[#454955]\">{selectedItem.fromRole}</p>
                          ) : null}·
                          <div className=\"mt-4 space-y-4 rounded-2xl border border-white/10 bg-[#0d0a0b]/60 p-6 shadow-[inset_1px_1px_0px_rgba(255,255,255,0.05)] backdrop-blur-xl\">
                            <p className=\"whitespace-pre-wrap text-base leading-relaxed text-[#c8c7c9]\">
                              {selectedItem.body}
                            </p>·
                            {selectedItem.type === 'DOCUMENT_SIGNED' ||
                            selectedItem.type === 'RECEIPT_APPROVAL' ? (
                              <div className=\"mt-6 flex items-center justify-between rounded-xl border border-[#3c4a46] bg-[#0d0a0b] p-4\">
                                <div className=\"flex items-center gap-3\">
                                  <span className=\"material-symbols-outlined text-[#454955]\">
                                    description
                                  </span>
                                  <div>
                                    <p className=\"text-xs font-bold text-[#9E9DA0]\">
                                      Attached_Document.pdf
                                    </p>
                                    <p className=\"font-mono text-[10px] text-[#9E9DA0]\">
                                      SECURE // PDF-DOCUMENT
                                    </p>
                                  </div>
                                </div>
                                <span className=\"material-symbols-outlined text-[#9E9DA0]\">download</span>
                              </div>
                            ) : null}·
                            {selectedItem.type === 'VENDOR_BID' ? (
                              <div className=\"mt-6 flex flex-col gap-2 rounded-xl border border-[#3c4a46] bg-[#0d0a0b] p-4\">
                                <div className=\"flex items-center gap-3\">
                                  <span className=\"material-symbols-outlined text-[#454955]\">
                                    engineering
                                  </span>
                                  <div>
                                    <p className=\"text-xs font-bold text-[#9E9DA0]\">
                                      Summit Roofing Bid Summary
                                    </p>
                                    <p className=\"font-mono text-[10px] text-[#9E9DA0]\">
                                      PROPOSAL // ROOF INSPECTION
                                    </p>
                                  </div>
                                </div>
                                <div className=\"mt-2 grid grid-cols-2 gap-4 border-t border-white/5 pt-2 text-xs text-[#9E9DA0]\">
                                  <div>
                                    <p className=\"text-[10px] font-semibold uppercase text-[#9E9DA0]/60\">
                                      Proposed Service Date
                                    </p>
                                    <p className=\"font-medium\">Next Tuesday</p>
                                  </div>
                                  <div>
                                    <p className=\"text-[10px] font-semibold uppercase text-[#9E9DA0]/60\">
                                      Payment Terms
                                    </p>
                                    <p className=\"font-medium\">Net 15 upon completion</p>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>·
                      {actionFlash ? (
                        <p className=\"text-center text-sm font-semibold text-emerald-400\">{actionFlash}</p>
                      ) : null}·
                      <div className=\"flex flex-wrap items-center justify-center gap-3 py-6\">
                        {selectedItem.actionable ? (
                          <button
                            type=\"button\"
                            onClick={executeAction}
                            className=\"flex cursor-pointer items-center gap-2 rounded-full bg-emerald-500 px-8 py-3 font-bold text-slate-950 transition-all hover:brightness-110\"
                          >
                            <span className=\"material-symbols-outlined text-[18px]\">edit_square</span>
                            EXECUTE ACTION
                          </button>
                        ) : null}
                        <button
                          type=\"button\"
                          onClick={() => setComposeOpen(true)}
                          className=\"flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-[#0d0a0b]/60 px-8 py-3 font-bold text-[#9E9DA0] shadow-[inset_1px_1px_0px_rgba(255,255,255,0.05)] backdrop-blur-xl transition-all hover:bg-white/5\"
                        >
                          <span className=\"material-symbols-outlined text-[18px]\">reply</span>
                          REPLY
                        </button>
                        {selectedItem.deepLinkUrl ? (
                          <Link
                            href={selectedItem.deepLinkUrl}
                            className=\"flex items-center gap-2 rounded-full border border-white/10 px-6 py-3 text-sm font-semibold text-white/70 no-underline hover:bg-white/5\"
                          >
                            Open related
                            <span className=\"material-symbols-outlined text-[16px]\">north_east</span>
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>·
                  <div className=\"flex shrink-0 items-center justify-between border-t border-white/10 bg-[#0d0a0b]/80 px-8 py-2 backdrop-blur\">
                    <div className=\"flex gap-4\">
                      <p className=\"font-mono text-[10px] text-[#9E9DA0]\">
                        <span className=\"text-[#454955]\">RUNNING:</span> inbox_handler.sh
                      </p>
                      <p className=\"hidden font-mono text-[10px] text-[#9E9DA0] sm:block\">
                        <span className=\"text-[#454955]\">ENCRYPTION:</span> AES-256-GCM
                      </p>
                    </div>
                    <p className=\"font-mono text-[10px] text-[#9E9DA0]\">LAST_SYNC: 0.2s AGO</p>
                  </div>
                </div>
              ) : (
                <div className=\"z-10 flex flex-1 flex-col items-center justify-center text-[#9E9DA0]\">
                  <span className=\"material-symbols-outlined mb-4 text-6xl opacity-20\">inbox</span>
                  <p className=\"text-lg font-medium\">Select an item to read</p>
                  <p className=\"text-sm opacity-60\">
                    Your messages and notifications will appear here.
                  </p>
                  <p className=\"mt-4 text-xs text-white/35\">
                    {INBOX_TABS.find((t) => t.id === activeTab)?.label} · {visibleItems.length} items
                  </p>
                </div>
              )}
            </section>
          </div>·
          <ComposeEmailModal isOpen={composeOpen} onClose={() => setComposeOpen(false)} />
        </>
      );
    }
    "

       98 |       'utf8',
       99 |     );
    > 100 |     expect(source).toContain("bffFetch(`/api/inbox/${id}`");
          |                    ^
      101 |     expect(source).toContain("bffFetch(`/api/inbox/${item.id}`");
      102 |     expect(source).not.toContain('apiFetch');
      103 |   });

      at Object.<anonymous> (src/__tests__/phase-b6-inbox-mutations.test.ts:100:20)

  ● phase B6 — inbox browser transport status › inbox list and mutations are same-origin in api-provider and notification center

    expect(received).toContain(expected) // indexOf

    Expected substring: "bffFetch"
    Received string:    "'use client';·
    import Link from 'next/link';
    import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
    import ComposeEmailModal from '@/components/inbox/ComposeEmailModal';
    import InboxItemCard from '@/components/inbox/InboxItemCard';
    import InboxTabs from '@/components/inbox/InboxTabs';
    import {
      INBOX_TABS,
      INBOX_THREADS,
      type InboxTabId,
      type InboxThread,
    } from '@/lib/dashboard/shell-seed';·
    function emptyCounts(): Record<InboxTabId, number> {
      return {
        all: 0,
        opportunities: 0,
        tasks: 0,
        vendor: 0,
        team: 0,
        system: 0,
      };
    }·
    function NotifMoreMenu({
      item,
      isUnread,
      onMarkUnreadToggle,
      onArchive,
      onDelete,
    }: {
      item: InboxThread;
      isUnread: boolean;
      onMarkUnreadToggle: () => void;
      onArchive: () => void;
      onDelete: () => void;
    }) {
      const [open, setOpen] = useState(false);
      const ref = useRef<HTMLDivElement>(null);·
      useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
          if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
      }, [open]);·
      return (
        <div ref={ref} className=\"relative\">
          <button
            type=\"button\"
            id=\"notif-more-menu-trigger\"
            onClick={() => setOpen((v) => !v)}
            className=\"cursor-pointer rounded-lg p-2 text-[#9E9DA0] transition-colors hover:bg-white/5\"
            aria-label=\"Notification actions\"
            aria-expanded={open}
          >
            <span className=\"material-symbols-outlined\">more_vert</span>
          </button>
          {open ? (
            <div
              id=\"notif-more-menu\"
              role=\"menu\"
              className=\"absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#161318] py-1 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.6)]\"
            >
              <button
                type=\"button\"
                role=\"menuitem\"
                onClick={() => {
                  onMarkUnreadToggle();
                  setOpen(false);
                }}
                className=\"flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-[#9E9DA0] transition-colors hover:bg-white/5 hover:text-white\"
              >
                <span className=\"material-symbols-outlined text-base\">
                  {isUnread ? 'drafts' : 'mark_email_unread'}
                </span>
                {isUnread ? 'Mark as Read' : 'Mark as Unread'}
              </button>
              <div className=\"my-1 border-t border-white/5\" />
              <button
                type=\"button\"
                role=\"menuitem\"
                onClick={() => {
                  onArchive();
                  setOpen(false);
                }}
                className=\"flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-[#9E9DA0] transition-colors hover:bg-white/5 hover:text-white\"
              >
                <span className=\"material-symbols-outlined text-base\">archive</span>
                Archive
              </button>
              <button
                type=\"button\"
                role=\"menuitem\"
                onClick={() => {
                  onDelete();
                  setOpen(false);
                }}
                className=\"flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-red-400/80 transition-colors hover:bg-white/5 hover:text-red-400\"
              >
                <span className=\"material-symbols-outlined text-base\">delete</span>
                Delete
              </button>
            </div>
          ) : null}
        </div>
      );
    }·
    /**
     * Unified Inbox — port of PaperWorking `/dashboard/inbox` notification center
     * (two-pane list + reading pane, tabs, compose, mark-all-read).
     */
    export default function InboxNotificationCenter() {
      const [items, setItems] = useState<InboxThread[]>(() => [...INBOX_THREADS]);
      const [activeTab, setActiveTab] = useState<InboxTabId>('all');
      const [selectedId, setSelectedId] = useState<string | null>(null);
      const [searchQuery, setSearchQuery] = useState('');
      const [composeOpen, setComposeOpen] = useState(false);
      const [readOverrides, setReadOverrides] = useState<Record<string, boolean>>({});
      const [archivedIds, setArchivedIds] = useState<Set<string>>(() => new Set());
      const [actionFlash, setActionFlash] = useState<string | null>(null);·
      const isUnread = useCallback(
        (item: InboxThread) => {
          if (item.id in readOverrides) return !readOverrides[item.id];
          return item.unread;
        },
        [readOverrides],
      );·
      const visibleItems = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return items.filter((item) => {
          if (archivedIds.has(item.id)) return false;
          if (activeTab !== 'all' && item.tab !== activeTab) return false;
          if (!q) return true;
          return (
            item.subject.toLowerCase().includes(q) ||
            item.body.toLowerCase().includes(q) ||
            item.from.toLowerCase().includes(q) ||
            item.project.toLowerCase().includes(q)
          );
        });
      }, [items, archivedIds, activeTab, searchQuery]);·
      const unreadCounts = useMemo(() => {
        const counts = emptyCounts();
        for (const item of items) {
          if (archivedIds.has(item.id) || !isUnread(item)) continue;
          counts.all += 1;
          counts[item.tab] += 1;
        }
        return counts;
      }, [items, archivedIds, isUnread]);·
      const unreadTotal = unreadCounts.all;
      const selectedItem = visibleItems.find((i) => i.id === selectedId) ?? null;
      const selectedUnread = selectedItem ? isUnread(selectedItem) : false;·
      function markRead(id: string) {
        setReadOverrides((prev) => ({ ...prev, [id]: true }));
      }·
      function markUnread(id: string) {
        setReadOverrides((prev) => ({ ...prev, [id]: false }));
      }·
      function markAllRead() {
        const next: Record<string, boolean> = { ...readOverrides };
        for (const item of items) {
          if (!archivedIds.has(item.id)) next[item.id] = true;
        }
        setReadOverrides(next);
      }·
      function archiveItem(id: string) {
        setArchivedIds((prev) => new Set(prev).add(id));
        if (selectedId === id) setSelectedId(null);
      }·
      function deleteItem(id: string) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        if (selectedId === id) setSelectedId(null);
      }·
      function selectItem(id: string) {
        setSelectedId(id);
        markRead(id);
      }·
      function executeAction() {
        if (!selectedItem) return;
        setActionFlash(`Action queued for “${selectedItem.subject}” (seed preview).`);
        markRead(selectedItem.id);
        setTimeout(() => setActionFlash(null), 2500);
      }·
      const showDetail = Boolean(selectedItem);·
      return (
        <>
          <div
            className=\"-mb-24 flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-[#0d0a0b] text-[#9E9DA0] md:-mb-8\"
            data-testid=\"inbox-notification-center\"
          >
            {/* List pane */}
            <section
              className={`w-full shrink-0 flex-col border-r border-white/10 bg-[#161318]/50 md:flex md:w-[420px] ${
                showDetail ? 'hidden md:flex' : 'flex'
              }`}
            >
              <div className=\"space-y-4 p-6\">
                <div className=\"flex items-center justify-between\">
                  <h1 className=\"text-2xl font-bold text-[#fdfffc]\">Inbox</h1>
                  <div className=\"flex items-center gap-2\">
                    {unreadTotal > 0 ? (
                      <span className=\"rounded border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300\">
                        {unreadTotal} UNREAD
                      </span>
                    ) : null}
                    {unreadTotal > 0 ? (
                      <button
                        type=\"button\"
                        onClick={markAllRead}
                        className=\"cursor-pointer rounded-lg p-1.5 text-[#9E9DA0] transition-colors hover:bg-white/5 hover:text-emerald-300\"
                        title=\"Mark all as read\"
                      >
                        <span className=\"material-symbols-outlined text-[18px]\">done_all</span>
                      </button>
                    ) : null}
                    <button
                      type=\"button\"
                      onClick={() => setComposeOpen(true)}
                      className=\"cursor-pointer rounded-lg p-1.5 text-[#9E9DA0] transition-colors hover:bg-white/5 hover:text-emerald-300\"
                      title=\"Compose email\"
                    >
                      <span className=\"material-symbols-outlined text-[18px]\">add</span>
                    </button>
                  </div>
                </div>·
                <div className=\"relative\">
                  <span className=\"material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-[#9E9DA0]\">
                    search
                  </span>
                  <input
                    type=\"text\"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder=\"Search logs...\"
                    className=\"w-full rounded-lg border border-[#3c4a46] bg-[#0d0a0b] py-2 pl-10 pr-4 text-sm text-[#9E9DA0] outline-none transition-all placeholder:text-[#9E9DA0]/40 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/30\"
                  />
                </div>
              </div>·
              <InboxTabs
                activeTab={activeTab}
                onTabChange={(tab) => {
                  setActiveTab(tab);
                  setSelectedId(null);
                }}
                unreadCounts={unreadCounts}
              />·
              <div className=\"relative flex-1 overflow-y-auto\">
                {visibleItems.length === 0 ? (
                  <div className=\"flex flex-col items-center justify-center px-6 py-16 text-center\">
                    <span className=\"material-symbols-outlined mb-3 text-5xl opacity-20\">inbox</span>
                    <p className=\"text-sm font-medium text-white/60\">No items in this view</p>
                    <p className=\"mt-1 text-xs text-white/35\">
                      {searchQuery
                        ? 'Try a different search.'
                        : 'You’re caught up — new alerts will land here.'}
                    </p>
                  </div>
                ) : (
                  visibleItems.map((item) => (
                    <InboxItemCard
                      key={item.id}
                      item={item}
                      isUnread={isUnread(item)}
                      isActive={selectedId === item.id}
                      onSelect={() => selectItem(item.id)}
                      onArchive={() => archiveItem(item.id)}
                      onDelete={() => deleteItem(item.id)}
                    />
                  ))
                )}
              </div>
            </section>·
            {/* Reading pane */}
            <section
              className={`relative flex flex-1 flex-col overflow-hidden bg-[#0d0a0b] ${
                showDetail ? 'flex' : 'hidden md:flex'
              }`}
            >
              <div className=\"pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-[#454955]/5 blur-[100px]\" />
              <div className=\"pointer-events-none absolute bottom-20 left-20 h-64 w-64 rounded-full bg-[#7A9EAA]/5 blur-[80px]\" />·
              {selectedItem ? (
                <div className=\"z-10 flex flex-1 flex-col overflow-y-auto\">
                  <div className=\"flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0d0a0b]/50 px-6 py-5 backdrop-blur-sm sm:px-8 sm:py-6\">
                    <div className=\"flex min-w-0 items-center gap-4\">
                      <button
                        type=\"button\"
                        onClick={() => setSelectedId(null)}
                        className=\"cursor-pointer rounded-lg p-2 text-[#9E9DA0] transition-colors hover:bg-white/5 md:hidden\"
                        aria-label=\"Back\"
                      >
                        <span className=\"material-symbols-outlined\">arrow_back</span>
                      </button>
                      <div className=\"flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#0d0a0b]/60 text-emerald-400 shadow-[inset_1px_1px_0px_rgba(255,255,255,0.05)]\">
                        <span className=\"material-symbols-outlined text-[24px]\">mark_email_read</span>
                      </div>
                      <div className=\"min-w-0\">
                        <h2 className=\"truncate text-xl font-bold text-[#fdfffc] sm:text-2xl\">
                          {selectedItem.subject}
                        </h2>
                        <p className=\"font-mono text-[10px] uppercase text-[#454955]\">
                          ID: {selectedItem.id.slice(0, 8)} · STATUS:{' '}
                          {selectedUnread ? 'UNREAD' : 'READ'}
                        </p>
                      </div>
                    </div>
                    <div className=\"flex gap-1\">
                      <button
                        type=\"button\"
                        onClick={() => archiveItem(selectedItem.id)}
                        className=\"cursor-pointer rounded-lg p-2 text-[#9E9DA0] transition-colors hover:bg-white/5\"
                        title=\"Archive\"
                      >
                        <span className=\"material-symbols-outlined\">archive</span>
                      </button>
                      <button
                        type=\"button\"
                        onClick={() => deleteItem(selectedItem.id)}
                        className=\"cursor-pointer rounded-lg p-2 text-[#9E9DA0] transition-colors hover:bg-white/5\"
                        title=\"Delete\"
                      >
                        <span className=\"material-symbols-outlined\">delete</span>
                      </button>
                      <NotifMoreMenu
                        item={selectedItem}
                        isUnread={selectedUnread}
                        onMarkUnreadToggle={() =>
                          selectedUnread ? markRead(selectedItem.id) : markUnread(selectedItem.id)
                        }
                        onArchive={() => archiveItem(selectedItem.id)}
                        onDelete={() => deleteItem(selectedItem.id)}
                      />
                    </div>
                  </div>·
                  <div className=\"flex-1 overflow-y-auto p-6 sm:p-8\">
                    <div className=\"mx-auto max-w-3xl space-y-8\">
                      <div className=\"flex items-start gap-4\">
                        <div className=\"flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#454955]/20 bg-[#161318] text-lg font-bold text-[#454955]\">
                          {selectedItem.from[0]}
                        </div>
                        <div className=\"min-w-0 flex-1\">
                          <div className=\"mb-1 flex flex-wrap items-center justify-between gap-2\">
                            <span className=\"font-bold text-[#fdfffc]\">{selectedItem.from}</span>
                            <span className=\"font-mono text-[10px] uppercase text-[#9E9DA0]\">
                              {new Date(selectedItem.receivedAt).toLocaleString()} UTC
                            </span>
                          </div>
                          {selectedItem.fromRole ? (
                            <p className=\"mb-4 text-sm text-[#454955]\">{selectedItem.fromRole}</p>
                          ) : null}·
                          <div className=\"mt-4 space-y-4 rounded-2xl border border-white/10 bg-[#0d0a0b]/60 p-6 shadow-[inset_1px_1px_0px_rgba(255,255,255,0.05)] backdrop-blur-xl\">
                            <p className=\"whitespace-pre-wrap text-base leading-relaxed text-[#c8c7c9]\">
                              {selectedItem.body}
                            </p>·
                            {selectedItem.type === 'DOCUMENT_SIGNED' ||
                            selectedItem.type === 'RECEIPT_APPROVAL' ? (
                              <div className=\"mt-6 flex items-center justify-between rounded-xl border border-[#3c4a46] bg-[#0d0a0b] p-4\">
                                <div className=\"flex items-center gap-3\">
                                  <span className=\"material-symbols-outlined text-[#454955]\">
                                    description
                                  </span>
                                  <div>
                                    <p className=\"text-xs font-bold text-[#9E9DA0]\">
                                      Attached_Document.pdf
                                    </p>
                                    <p className=\"font-mono text-[10px] text-[#9E9DA0]\">
                                      SECURE // PDF-DOCUMENT
                                    </p>
                                  </div>
                                </div>
                                <span className=\"material-symbols-outlined text-[#9E9DA0]\">download</span>
                              </div>
                            ) : null}·
                            {selectedItem.type === 'VENDOR_BID' ? (
                              <div className=\"mt-6 flex flex-col gap-2 rounded-xl border border-[#3c4a46] bg-[#0d0a0b] p-4\">
                                <div className=\"flex items-center gap-3\">
                                  <span className=\"material-symbols-outlined text-[#454955]\">
                                    engineering
                                  </span>
                                  <div>
                                    <p className=\"text-xs font-bold text-[#9E9DA0]\">
                                      Summit Roofing Bid Summary
                                    </p>
                                    <p className=\"font-mono text-[10px] text-[#9E9DA0]\">
                                      PROPOSAL // ROOF INSPECTION
                                    </p>
                                  </div>
                                </div>
                                <div className=\"mt-2 grid grid-cols-2 gap-4 border-t border-white/5 pt-2 text-xs text-[#9E9DA0]\">
                                  <div>
                                    <p className=\"text-[10px] font-semibold uppercase text-[#9E9DA0]/60\">
                                      Proposed Service Date
                                    </p>
                                    <p className=\"font-medium\">Next Tuesday</p>
                                  </div>
                                  <div>
                                    <p className=\"text-[10px] font-semibold uppercase text-[#9E9DA0]/60\">
                                      Payment Terms
                                    </p>
                                    <p className=\"font-medium\">Net 15 upon completion</p>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>·
                      {actionFlash ? (
                        <p className=\"text-center text-sm font-semibold text-emerald-400\">{actionFlash}</p>
                      ) : null}·
                      <div className=\"flex flex-wrap items-center justify-center gap-3 py-6\">
                        {selectedItem.actionable ? (
                          <button
                            type=\"button\"
                            onClick={executeAction}
                            className=\"flex cursor-pointer items-center gap-2 rounded-full bg-emerald-500 px-8 py-3 font-bold text-slate-950 transition-all hover:brightness-110\"
                          >
                            <span className=\"material-symbols-outlined text-[18px]\">edit_square</span>
                            EXECUTE ACTION
                          </button>
                        ) : null}
                        <button
                          type=\"button\"
                          onClick={() => setComposeOpen(true)}
                          className=\"flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-[#0d0a0b]/60 px-8 py-3 font-bold text-[#9E9DA0] shadow-[inset_1px_1px_0px_rgba(255,255,255,0.05)] backdrop-blur-xl transition-all hover:bg-white/5\"
                        >
                          <span className=\"material-symbols-outlined text-[18px]\">reply</span>
                          REPLY
                        </button>
                        {selectedItem.deepLinkUrl ? (
                          <Link
                            href={selectedItem.deepLinkUrl}
                            className=\"flex items-center gap-2 rounded-full border border-white/10 px-6 py-3 text-sm font-semibold text-white/70 no-underline hover:bg-white/5\"
                          >
                            Open related
                            <span className=\"material-symbols-outlined text-[16px]\">north_east</span>
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>·
                  <div className=\"flex shrink-0 items-center justify-between border-t border-white/10 bg-[#0d0a0b]/80 px-8 py-2 backdrop-blur\">
                    <div className=\"flex gap-4\">
                      <p className=\"font-mono text-[10px] text-[#9E9DA0]\">
                        <span className=\"text-[#454955]\">RUNNING:</span> inbox_handler.sh
                      </p>
                      <p className=\"hidden font-mono text-[10px] text-[#9E9DA0] sm:block\">
                        <span className=\"text-[#454955]\">ENCRYPTION:</span> AES-256-GCM
                      </p>
                    </div>
                    <p className=\"font-mono text-[10px] text-[#9E9DA0]\">LAST_SYNC: 0.2s AGO</p>
                  </div>
                </div>
              ) : (
                <div className=\"z-10 flex flex-1 flex-col items-center justify-center text-[#9E9DA0]\">
                  <span className=\"material-symbols-outlined mb-4 text-6xl opacity-20\">inbox</span>
                  <p className=\"text-lg font-medium\">Select an item to read</p>
                  <p className=\"text-sm opacity-60\">
                    Your messages and notifications will appear here.
                  </p>
                  <p className=\"mt-4 text-xs text-white/35\">
                    {INBOX_TABS.find((t) => t.id === activeTab)?.label} · {visibleItems.length} items
                  </p>
                </div>
              )}
            </section>
          </div>·
          <ComposeEmailModal isOpen={composeOpen} onClose={() => setComposeOpen(false)} />
        </>
      );
    }
    "

      164 |     );
      165 |     expect(provider).toContain("bffFetch('/api/inbox'");
    > 166 |     expect(center).toContain('bffFetch');
          |                    ^
      167 |     expect(provider).not.toMatch(/apiFetch\('\/api\/inbox/);
      168 |     expect(center).not.toContain('apiFetch');
      169 |   });

      at Object.<anonymous> (src/__tests__/phase-b6-inbox-mutations.test.ts:166:20)

FAIL src/__tests__/phase-b17-profile-insights-transport.test.ts
  ● phase B17 — global browser transport guard (admin-only apiFetch) › no unexpected apiFetch in production browser modules

    expect(received).toEqual(expected) // deep equality

    - Expected  - 1
    + Received  + 4

    - Array []
    + Array [
    +   "app/(project)/project/[id]/underwriting/page.tsx",
    +   "context/SavedDealsContext.tsx",
    + ]

      78 |     }
      79 |
    > 80 |     expect(violations).toEqual([]);
         |                        ^
      81 |   });
      82 |
      83 |   it('allowlisted apiFetch callers removed after Phase D', () => {

      at Object.<anonymous> (src/__tests__/phase-b17-profile-insights-transport.test.ts:80:24)

FAIL src/__tests__/phase-b16-reports-transport.test.ts
  ● phase B16 — global browser transport guard › no unexpected apiFetch in production browser modules

    expect(received).toEqual(expected) // deep equality

    - Expected  - 1
    + Received  + 4

    - Array []
    + Array [
    +   "app/(project)/project/[id]/underwriting/page.tsx",
    +   "context/SavedDealsContext.tsx",
    + ]

      71 |     }
      72 |
    > 73 |     expect(violations).toEqual([]);
         |                        ^
      74 |   });
      75 |
      76 |   it('allowlisted apiFetch callers are privileged admin exception only (B18)', () => {

      at Object.<anonymous> (src/__tests__/phase-b16-reports-transport.test.ts:73:24)

FAIL src/__tests__/phase-b18-admin-transport.test.ts
  ● phase B18 — global browser transport guard › no production browser modules use apiFetch

    expect(received).toEqual(expected) // deep equality

    - Expected  - 1
    + Received  + 4

    - Array []
    + Array [
    +   "app/(project)/project/[id]/underwriting/page.tsx",
    +   "context/SavedDealsContext.tsx",
    + ]

      69 |     }
      70 |
    > 71 |     expect(violations).toEqual([]);
         |                        ^
      72 |   });
      73 |
      74 |   it('impersonation uses same-origin BFF (Phase D)', () => {

      at Object.<anonymous> (src/__tests__/phase-b18-admin-transport.test.ts:71:24)

FAIL src/__tests__/phase-v1-certification-correction.test.ts
  ● V1 certification correction — browser Nest transport › no production browser modules reference apiFetch(

    expect(received).toEqual(expected) // deep equality

    - Expected  - 1
    + Received  + 5

    - Array []
    + Array [
    +   "app/(project)/project/[id]/underwriting/page.tsx",
    +   "context/SavedDealsContext.tsx",
    +   "lib/api/client.ts",
    + ]

      56 |       if (content.includes('apiFetch(')) violations.push(rel);
      57 |     }
    > 58 |     expect(violations).toEqual([]);
         |                        ^
      59 |   });
      60 |
      61 |   it('impersonation uses same-origin BFF helper (Phase D)', () => {

      at Object.<anonymous> (src/__tests__/phase-v1-certification-correction.test.ts:58:24)

FAIL src/__tests__/phase-5g-marketplace.test.ts
  ● phase 5g — marketplace handlers › lists discover deals for authenticated user

    expect(received).toBe(expected) // Object.is equality

    Expected: 2
    Received: 9

      70 |     expect(result.status).toBe(200);
      71 |     const body = result.body as { total: number; deals: Array<{ slug: string }> };
    > 72 |     expect(body.total).toBe(2);
         |                        ^
      73 |     expect(body.deals.map((deal) => deal.slug)).toEqual(['1247elmst', 'melroseduplex']);
      74 |   });
      75 |

      at Object.<anonymous> (src/__tests__/phase-5g-marketplace.test.ts:72:24)

FAIL src/__tests__/phase-5a-marketing.test.ts
  ● phase 5a — marketing content › includes v0 primary navigation links

    expect(received).toEqual(expected) // deep equality

    - Expected  - 1
    + Received  + 0

      Array [
        "How It Works",
        "Marketplaces",
        "Pricing",
        "Support",
    -   "Contact",
      ]

      32 | describe('phase 5a — marketing content', () => {
      33 |   it('includes v0 primary navigation links', () => {
    > 34 |     expect(MARKETING_NAV_LINKS.map((link) => link.label)).toEqual([
         |                                                           ^
      35 |       'How It Works',
      36 |       'Marketplaces',
      37 |       'Pricing',

      at Object.<anonymous> (src/__tests__/phase-5a-marketing.test.ts:34:59)

FAIL src/__tests__/phase-b15-billing-stripe.test.ts
  ● phase B15 — browser billing transport › BillingPreviewPanel uses same-origin billing BFF helpers

    expect(received).toContain(expected) // indexOf

    Expected substring: "getBillingSummaryFromBff"
    Received string:    "'use client';·
    import { useState, useEffect } from 'react';
    import { useRouter, useSearchParams } from 'next/navigation';
    import { Button } from '@/components/ui/Button';·
    interface BillingPaymentMethod {
      id: string;
      brand: string;
      last4: string;
      expMonth: number;
      expYear: number;
      isDefault: boolean;
    }·
    interface BillingInvoice {
      id: string;
      number: string;
      date: string;
      amount: string;
      status: string;
      pdfUrl?: string;
    }·
    interface BillingData {
      plan: string;
      price: string;
      monthlyPrice?: number;
      status: string;
      subscriptionStatus: string;
      nextBillingDate: string;
      trialEnds?: string;
      billingEmail?: string;
      companyName?: string;
      billingAddress?: string;
      stripeConfigured?: boolean;
      paymentMethods: BillingPaymentMethod[];
      invoices: BillingInvoice[];
    }·
    export default function BillingPreviewPanel() {
      const router = useRouter();
      const searchParams = useSearchParams();
      const paywall = searchParams.get('paywall');·
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState<string | null>(null);
      const [data, setData] = useState<BillingData | null>(null);·
      // Modals state
      const [showPlanModal, setShowPlanModal] = useState(false);
      const [selectedPlan, setSelectedPlan] = useState('Team');
      const [planUpdating, setPlanUpdating] = useState(false);·
      const [showCancelModal, setShowCancelModal] = useState(false);
      const [cancelLoading, setCancelLoading] = useState(false);·
      const [showCardModal, setShowCardModal] = useState(false);
      const [cardLast4, setCardLast4] = useState('');
      const [cardUpdating, setCardUpdating] = useState(false);·
      const [actionSuccess, setActionSuccess] = useState<string | null>(null);·
      const fetchBilling = async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await fetch('/api/billing');
          if (res.status === 401) {
            router.push('/login?next=/dashboard/settings?section=billing');
            return;
          }
          if (!res.ok) {
            let errorMsg = `Failed to load subscription & billing records (${res.status})`;
            try {
              const errJson = await res.json();
              if (errJson && typeof errJson.error === 'string') {
                errorMsg = errJson.error;
              }
            } catch {
              // ignore
            }
            throw new Error(errorMsg);
          }
          const json = await res.json();
          setData(json);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Error connecting to billing service');
        } finally {
          setLoading(false);
        }
      };·
      useEffect(() => {
        fetchBilling();
      }, []);·
      const handleChangePlan = async () => {
        setPlanUpdating(true);
        try {
          const res = await fetch('/api/billing/change-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId: selectedPlan }),
          });
          if (res.status === 401) {
            router.push('/login?next=/dashboard/settings?section=billing');
            return;
          }
          if (!res.ok) throw new Error('Failed to update plan');
          setShowPlanModal(false);
          setActionSuccess(`Subscription updated to ${selectedPlan} tier.`);
          setTimeout(() => setActionSuccess(null), 4000);
          await fetchBilling();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to update plan');
        } finally {
          setPlanUpdating(false);
        }
      };·
      const handleCancelSubscription = async () => {
        setCancelLoading(true);
        try {
          const res = await fetch('/api/billing/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          if (res.status === 401) {
            router.push('/login?next=/dashboard/settings?section=billing');
            return;
          }
          if (!res.ok) throw new Error('Failed to cancel subscription');
          setShowCancelModal(false);
          setActionSuccess('Cancellation scheduled at the end of the current billing cycle.');
          setTimeout(() => setActionSuccess(null), 4000);
          await fetchBilling();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
        } finally {
          setCancelLoading(false);
        }
      };·
      const handleUpdateCard = async () => {
        if (!cardLast4 || cardLast4.length !== 4) return;
        setCardUpdating(true);
        try {
          const res = await fetch('/api/billing/payment-methods', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              card: {
                brand: 'visa',
                last4: cardLast4,
                expMonth: 12,
                expYear: 2029,
              },
            }),
          });
          if (res.status === 401) {
            router.push('/login?next=/dashboard/settings?section=billing');
            return;
          }
          if (!res.ok) throw new Error('Failed to update card');
          setShowCardModal(false);
          setCardLast4('');
          setActionSuccess('Payment method updated successfully.');
          setTimeout(() => setActionSuccess(null), 4000);
          await fetchBilling();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to update payment card');
        } finally {
          setCardUpdating(false);
        }
      };·
      const handleDownloadInvoice = (invoiceId: string) => {
        window.open(`/api/billing/invoices/${invoiceId}/download`, '_blank');
      };·
      if (loading) {
        return (
          <div className=\"flex min-h-[350px] items-center justify-center p-8\">
            <div className=\"flex items-center gap-3 text-sm text-[var(--text-secondary)]\">
              <span className=\"material-symbols-outlined animate-spin text-[var(--accent)]\">
                progress_activity
              </span>
              Loading subscription &amp; invoices…
            </div>
          </div>
        );
      }·
      // Loud Error State with Retry (never a silent shell)
      if (error || !data) {
        return (
          <div className=\"w-full space-y-6\" data-testid=\"billing-error-container\">
            <div>
              <h2 className=\"text-xl font-bold text-[var(--text-primary)]\">Billing &amp; Subscriptions</h2>
              <p className=\"mt-1 text-sm text-[var(--text-muted)]\">
                Manage your subscription plan, payment methods, and invoices.
              </p>
            </div>·
            <div
              data-testid=\"billing-error-banner\"
              className=\"rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-6 shadow-sm\"
            >
              <div className=\"flex items-start gap-3\">
                <span className=\"material-symbols-outlined text-2xl text-[var(--danger)]\">
                  error
                </span>
                <div className=\"flex-1\">
                  <h3 className=\"text-base font-bold text-[var(--danger)]\">
                    Unable to load billing data
                  </h3>
                  <p className=\"mt-1 text-sm text-[var(--text-secondary)]\">
                    {error || 'An unexpected error occurred while communicating with the billing service.'}
                  </p>
                  <div className=\"mt-4\">
                    <Button
                      type=\"button\"
                      variant=\"primary\"
                      size=\"sm\"
                      onClick={fetchBilling}
                      data-testid=\"billing-retry-button\"
                      data-variant=\"primary\"
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }·
      const defaultPm = data.paymentMethods.find((pm) => pm.isDefault) || data.paymentMethods[0];·
      return (
        <div className=\"w-full space-y-6\" data-testid=\"billing-preview-panel\">
          <div>
            <h2 className=\"text-xl font-bold text-[var(--text-primary)]\">Billing &amp; Subscriptions</h2>
            <p className=\"mt-1 text-sm text-[var(--text-muted)]\">
              {data.plan} plan · <span className=\"capitalize\">{data.status}</span>
            </p>
          </div>·
          {paywall === 'deals' && (
            <div className=\"rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5\">
              <p className=\"text-xs font-bold uppercase tracking-wider text-amber-300\">
                Deals Marketplace Locked
              </p>
              <p className=\"mt-1 text-sm text-[var(--text-secondary)]\">
                Deals Marketplace access requires an active operator subscription. Upgrade your tier to browse and post deals.
              </p>
            </div>
          )}·
          {actionSuccess && (
            <div className=\"flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400\">
              <span className=\"material-symbols-outlined text-base\">check_circle</span>
              {actionSuccess}
            </div>
          )}·
          {/* Current Plan Overview (Single Primary Action) */}
          <section className=\"rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm\">
            <div className=\"flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between\">
              <div>
                <p className=\"text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]\">
                  Current Plan
                </p>
                <h3 className=\"mt-1 text-2xl font-bold text-[var(--text-primary)]\" data-testid=\"billing-plan-name\">
                  {data.plan}
                </h3>
                <p className=\"mt-1 text-sm text-[var(--text-secondary)]\">
                  {data.price} · Renewal date: {new Date(data.nextBillingDate).toLocaleDateString()}
                </p>
              </div>
              {data.stripeConfigured ? (
                <div className=\"flex flex-wrap items-center gap-2\">
                  <Button
                    type=\"button\"
                    variant=\"primary\"
                    size=\"sm\"
                    onClick={() => setShowPlanModal(true)}
                    data-variant=\"primary\"
                    data-testid=\"billing-change-plan-btn\"
                  >
                    Change Plan
                  </Button>
                  <Button
                    type=\"button\"
                    variant=\"secondary\"
                    size=\"sm\"
                    onClick={() => setShowCancelModal(true)}
                    data-testid=\"billing-cancel-btn\"
                    className=\"text-[var(--danger)] border-[var(--danger)]/30 hover:bg-[var(--danger)]/10\"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div data-testid=\"billing-self-hosted-note\" className=\"rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-xs text-[var(--text-secondary)]\">
                  <span className=\"font-semibold text-[var(--text-primary)]\">Self-Hosted / Managed:</span> Stripe payments unconfigured in this environment. Tiers are managed directly by your workspace administrator.
                </div>
              )}
            </div>
          </section>·
          {/* Payment Method & Billing Info Grid */}
          <section className=\"grid gap-4 lg:grid-cols-2\">
            <article className=\"rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-sm\">
              <h3 className=\"mb-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]\">
                Payment Method
              </h3>
              {defaultPm ? (
                <div className=\"flex items-center gap-3\">
                  <span className=\"material-symbols-outlined text-2xl text-[var(--accent)]\">
                    credit_card
                  </span>
                  <div>
                    <p className=\"text-sm font-semibold capitalize text-[var(--text-primary)]\">
                      {defaultPm.brand} ending in {defaultPm.last4}
                    </p>
                    <p className=\"text-xs text-[var(--text-muted)]\">
                      Expires {defaultPm.expMonth}/{defaultPm.expYear}
                    </p>
                  </div>
                </div>
              ) : (
                <p className=\"text-sm text-[var(--text-secondary)]\">No payment method on file.</p>
              )}
              {data.stripeConfigured && (
                <div className=\"mt-4\">
                  <Button
                    type=\"button\"
                    variant=\"secondary\"
                    size=\"sm\"
                    onClick={() => setShowCardModal(true)}
                    data-testid=\"billing-update-card-btn\"
                  >
                    Update Card
                  </Button>
                </div>
              )}
            </article>·
            <article className=\"rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-sm\">
              <h3 className=\"mb-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]\">
                Billing Information
              </h3>
              <dl className=\"space-y-2 text-sm\">
                <div className=\"flex justify-between gap-3\">
                  <dt className=\"text-[var(--text-muted)]\">Billing Email</dt>
                  <dd className=\"text-[var(--text-primary)] font-medium\">{data.billingEmail || 'alex@apexcap.internal'}</dd>
                </div>
                <div className=\"flex justify-between gap-3\">
                  <dt className=\"text-[var(--text-muted)]\">Subscription Status</dt>
                  <dd className=\"capitalize text-emerald-400 font-bold\">{data.subscriptionStatus}</dd>
                </div>
                <div className=\"flex justify-between gap-3\">
                  <dt className=\"text-[var(--text-muted)]\">Organization</dt>
                  <dd className=\"text-[var(--text-primary)]\">{data.companyName || 'Apex Capital Partners'}</dd>
                </div>
              </dl>
            </article>
          </section>·
          {/* Invoices History Table */}
          <section className=\"overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm\">
            <div className=\"border-b border-[var(--border-subtle)] px-5 py-3\">
              <h3 className=\"text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]\">
                Invoice History
              </h3>
            </div>
            <div className=\"overflow-x-auto\">
              <table className=\"w-full text-left text-sm\">
                <thead className=\"bg-[var(--bg-elevated)] text-xs uppercase tracking-wider text-[var(--text-muted)]\">
                  <tr>
                    <th className=\"px-5 py-3 font-semibold\">Invoice</th>
                    <th className=\"px-5 py-3 font-semibold\">Date</th>
                    <th className=\"px-5 py-3 font-semibold\">Amount</th>
                    <th className=\"px-5 py-3 font-semibold\">Status</th>
                    <th className=\"px-5 py-3 text-right font-semibold\">Action</th>
                  </tr>
                </thead>
                <tbody className=\"divide-y divide-[var(--border-subtle)]\">
                  {data.invoices.map((inv) => (
                    <tr key={inv.id} className=\"hover:bg-[var(--bg-elevated)]/50 transition-colors\">
                      <td className=\"px-5 py-3 font-mono font-medium text-[var(--text-primary)]\">
                        {inv.number}
                      </td>
                      <td className=\"px-5 py-3 text-[var(--text-secondary)]\">
                        {new Date(inv.date).toLocaleDateString()}
                      </td>
                      <td className=\"px-5 py-3 font-mono text-[var(--text-primary)]\">{inv.amount}</td>
                      <td className=\"px-5 py-3\">
                        <span className=\"inline-flex rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold capitalize text-emerald-400\">
                          {inv.status}
                        </span>
                      </td>
                      <td className=\"px-5 py-3 text-right\">
                        <Button
                          type=\"button\"
                          variant=\"tertiary\"
                          size=\"sm\"
                          onClick={() => handleDownloadInvoice(inv.id)}
                          className=\"text-xs text-[var(--accent)] hover:text-[var(--accent)]\"
                        >
                          Download PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>·
          {/* Plan Selection Modal */}
          {showPlanModal && (
            <div className=\"fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4\">
              <div className=\"w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4\">
                <div className=\"flex items-center justify-between border-b border-[var(--border-subtle)] pb-3\">
                  <h3 className=\"text-base font-bold text-[var(--text-primary)]\">Change Subscription Plan</h3>
                  <button
                    type=\"button\"
                    onClick={() => setShowPlanModal(false)}
                    className=\"text-[var(--text-muted)] hover:text-[var(--text-primary)]\"
                  >
                    ✕
                  </button>
                </div>
                <div className=\"space-y-2\">
                  {['Individual', 'Pro Portfolio', 'Team'].map((p) => (
                    <label
                      key={p}
                      className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all ${
                        selectedPlan === p
                          ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]'
                      }`}
                    >
                      <div className=\"flex items-center gap-3\">
                        <input
                          type=\"radio\"
                          name=\"plan\"
                          checked={selectedPlan === p}
                          onChange={() => setSelectedPlan(p)}
                          className=\"accent-[var(--accent)]\"
                        />
                        <span className=\"text-sm font-semibold text-[var(--text-primary)]\">{p}</span>
                      </div>
                      <span className=\"font-mono text-xs text-[var(--text-muted)]\">
                        {p === 'Individual' ? '$59/mo' : p === 'Pro Portfolio' ? '$79/mo' : '$99/mo'}
                      </span>
                    </label>
                  ))}
                </div>
                <div className=\"flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]\">
                  <Button type=\"button\" variant=\"secondary\" size=\"sm\" onClick={() => setShowPlanModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    type=\"button\"
                    variant=\"primary\"
                    size=\"sm\"
                    onClick={handleChangePlan}
                    disabled={planUpdating}
                  >
                    {planUpdating ? 'Updating…' : 'Confirm Plan'}
                  </Button>
                </div>
              </div>
            </div>
          )}·
          {/* Cancellation Modal */}
          {showCancelModal && (
            <div className=\"fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4\">
              <div className=\"w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4\">
                <h3 className=\"text-base font-bold text-[var(--danger)]\">Cancel Subscription</h3>
                <p className=\"text-sm text-[var(--text-secondary)]\">
                  Your subscription will remain active until the end of your current billing period ({new Date(data.nextBillingDate).toLocaleDateString()}). Afterwards, premium marketplace tools will be locked.
                </p>
                <div className=\"flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]\">
                  <Button type=\"button\" variant=\"secondary\" size=\"sm\" onClick={() => setShowCancelModal(false)}>
                    Keep Plan
                  </Button>
                  <Button
                    type=\"button\"
                    variant=\"danger\"
                    size=\"sm\"
                    onClick={handleCancelSubscription}
                    disabled={cancelLoading}
                  >
                    {cancelLoading ? 'Cancelling…' : 'Confirm Cancellation'}
                  </Button>
                </div>
              </div>
            </div>
          )}·
          {/* Update Card Modal */}
          {showCardModal && (
            <div className=\"fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4\">
              <div className=\"w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4\">
                <h3 className=\"text-base font-bold text-[var(--text-primary)]\">Update Payment Card</h3>
                <div>
                  <label htmlFor=\"card-last4\" className=\"block text-xs font-semibold text-[var(--text-secondary)] mb-1\">
                    Last 4 Digits of New Card
                  </label>
                  <input
                    id=\"card-last4\"
                    type=\"text\"
                    maxLength={4}
                    value={cardLast4}
                    onChange={(e) => setCardLast4(e.target.value.replace(/\\D/g, ''))}
                    placeholder=\"4242\"
                    className=\"w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]\"
                  />
                </div>
                <div className=\"flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]\">
                  <Button type=\"button\" variant=\"secondary\" size=\"sm\" onClick={() => setShowCardModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    type=\"button\"
                    variant=\"primary\"
                    size=\"sm\"
                    onClick={handleUpdateCard}
                    disabled={cardUpdating || cardLast4.length !== 4}
                  >
                    {cardUpdating ? 'Saving…' : 'Save Card'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
    "

      24 |       'utf8',
      25 |     );
    > 26 |     expect(panel).toContain('getBillingSummaryFromBff');
         |                   ^
      27 |     expect(panel).toContain('createStripeCheckoutFromBff');
      28 |     expect(panel).toContain('createStripePortalFromBff');
      29 |     expect(panel).toContain('cancelBillingSubscriptionFromBff');

      at Object.<anonymous> (src/__tests__/phase-b15-billing-stripe.test.ts:26:19)

FAIL src/__tests__/phase-d-admin-transport.test.ts
  ● phase D — production browser apiFetch guard › no production browser modules call apiFetch

    expect(received).toEqual(expected) // deep equality

    - Expected  - 1
    + Received  + 4

    - Array []
    + Array [
    +   "app/(project)/project/[id]/underwriting/page.tsx",
    +   "context/SavedDealsContext.tsx",
    + ]

      48 |     }
      49 |
    > 50 |     expect(violations).toEqual([]);
         |                        ^
      51 |   });
      52 | });
      53 |

      at Object.<anonymous> (src/__tests__/phase-d-admin-transport.test.ts:50:24)

FAIL src/__tests__/phase-e-firebase-only.test.ts
  ● phase E — Supabase runtime removed › legacy api client module removed

    expect(received).toBe(expected) // Object.is equality

    Expected: true
    Received: false

      37 |       threw = true;
      38 |     }
    > 39 |     expect(threw).toBe(true);
         |                   ^
      40 |   });
      41 |
      42 |   it('OAuth callback redirects away from Supabase flow', () => {

      at Object.<anonymous> (src/__tests__/phase-e-firebase-only.test.ts:39:19)

FAIL src/__tests__/yves-ui-port.test.ts
  ● Yves-update-UI marketing copy lock (V1 paths) › Landing Hero subcopy matches approved 4-phase copy

    expect(received).toContain(expected) // indexOf

    Expected substring: "Every real estate deal runs through the same four phases: Acquisition, Fund, Hold, Exit."
    Received string:    "'use client';·
    import Link from 'next/link';
    import {
      heroHeadline,
      heroSubheadline,
      heroBody,
      heroInsurance,
      heroKicker,
    } from '@/lib/marketing/copy';·
    function BrowserMockup() {
      return (
        <div className=\"relative w-full aspect-[16/10] min-w-[280px] max-w-[600px] rounded-2xl overflow-hidden border border-white/10 bg-[#161622] shadow-[0_24px_50px_rgba(0,0,0,0.5)]\">
          {/* Toolbar */}
          <div className=\"flex items-center justify-between bg-[#12121a] px-4 py-3 border-b border-white/[0.06]\">
            {/* Window controls */}
            <div className=\"flex items-center gap-1.5\">
              <span className=\"h-2.5 w-2.5 rounded-full bg-[#ff5f56]\" />
              <span className=\"h-2.5 w-2.5 rounded-full bg-[#ffbd2e]\" />
              <span className=\"h-2.5 w-2.5 rounded-full bg-[#27c93f]\" />
            </div>
            {/* Address bar */}
            <div className=\"mx-auto flex h-6 w-3/5 items-center justify-center rounded-lg bg-white/[0.04] px-3 border border-white/[0.06] text-[10px] text-white/40 font-medium tracking-wide\">
              paperworking.co/dashboard
            </div>
            {/* Right spacer to balance window controls */}
            <div className=\"w-12\" />
          </div>·······
          {/* Inner Screen - Gradient placeholder */}
          <div className=\"relative h-[calc(100%-48px)] w-full bg-gradient-to-br from-[#121420] via-[#1b1c30] to-[#0c0d15] flex flex-col items-center justify-center\">
            {/* Grid pattern overlay */}
            <div className=\"absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] bg-[size:16px_16px]\" />
            {/* Soft center glow */}
            <div className=\"pointer-events-none absolute left-1/2 top-1/2 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--color-primary)]/10 blur-[45px]\" aria-hidden />·········
            <span className=\"relative z-10 font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-widest text-white/40\">
              Dashboard preview
            </span>
          </div>
        </div>
      );
    }·
    export default function LandingHero() {
      return (
        <section className=\"relative w-full overflow-hidden bg-[#0a0a0f] py-16 md:py-24 lg:py-28\">
          {/* Ambient background glow */}
          <div
            className=\"pointer-events-none absolute right-0 top-0 h-[600px] w-[700px] rounded-full bg-[color:var(--color-primary)]/[0.06] blur-[160px]\"
            aria-hidden
          />·
          <div className=\"relative z-10 mx-auto max-w-[1280px] px-6 md:px-8\">
            <div className=\"grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16\">···········
              {/* Left Text Column */}
              <div className=\"flex flex-col items-start text-left space-y-6\">
                {/* Kicker bar */}
                <span className=\"inline-block text-[14px] font-medium uppercase tracking-[0.08em] text-[color:var(--color-primary)]\">
                  {heroKicker}
                </span>·
                {/* Headline */}
                <h1 className=\"text-4xl font-medium tracking-tight text-white sm:text-5xl md:text-6xl leading-[1.05]\">
                  {heroHeadline}
                </h1>·
                {/* Subheadline */}
                <h2 className=\"text-[20px] leading-relaxed text-white/70\">
                  {heroSubheadline}
                </h2>·
                {/* Body and Insurance paragraphs */}
                <div className=\"space-y-4\">
                  <p className=\"text-[16px] leading-[1.65] text-white/50\">
                    {heroBody}
                  </p>
                  <p className=\"text-[16px] leading-[1.65] text-white/50\">
                    {heroInsurance}
                  </p>
                </div>·
                {/* CTA row */}
                <div className=\"flex w-full flex-col gap-3.5 sm:flex-row sm:w-auto\">
                  <Link
                    href=\"/pricing\"
                    className=\"inline-flex min-h-[44px] items-center justify-center bg-[color:var(--color-primary)] text-[#0a0a0f] px-6 py-3 text-[14px] font-semibold rounded-[10px] hover:brightness-110 transition shadow-[0_0_24px_-4px_rgba(0,221,148,0.35)]\"
                  >
                    Get started
                  </Link>
                  <Link
                    href=\"#deal-calculator\"
                    className=\"inline-flex min-h-[44px] items-center justify-center border border-white/15 hover:border-white/30 text-white px-6 py-3 text-[14px] font-semibold rounded-[10px] transition\"
                  >
                    See how it works
                  </Link>
                </div>
              </div>·
              {/* Right Visual Column */}
              <div className=\"relative flex justify-center lg:justify-end\">
                <div
                  className=\"pointer-events-none absolute inset-0 rounded-3xl bg-[color:var(--color-primary)]/[0.04] blur-[50px]\"
                  aria-hidden
                />
                <BrowserMockup />
              </div>·
            </div>
          </div>
        </section>
      );
    }
    "

      12 |   it('Landing Hero subcopy matches approved 4-phase copy', () => {
      13 |     const heroContent = fs.readFileSync(landingHeroPath, 'utf8');
    > 14 |     expect(heroContent).toContain(
         |                         ^
      15 |       'Every real estate deal runs through the same four phases: Acquisition, Fund, Hold, Exit.',
      16 |     );
      17 |     expect(heroContent).toContain('Start Free 14-Day Trial');

      at Object.<anonymous> (src/__tests__/yves-ui-port.test.ts:14:25)

  ● Yves-update-UI marketing copy lock (V1 paths) › How It Works hero matches approved copy

    expect(received).toContain(expected) // indexOf

    Expected substring: "The REIL"
    Received string:    "'use client';·
    import Link from 'next/link';
    import HowItWorksLifecycleGraphic from '@/components/marketing/HowItWorksLifecycleGraphic';
    import {
      howItWorksHeader,
      howItWorksSubheadline,
      howItWorksBody,
      dealCalculatorSectionTitle,
      dealCalculatorSectionBody,
      dealCalculatorSectionSub,
    } from '@/lib/marketing/copy';·
    const PHASE_CARDS = [
      {
        num: 'PHASE 01',
        title: 'Acquisition',
        color: 'text-[color:var(--color-primary)]',
        accentBg: 'bg-[color:var(--color-primary)]/10 border-[color:var(--color-primary)]/20',
        description:
          'Acquisition: Decide if the deal works before you buy. The Deal Calculator pulls live property data, an automated valuation, and projected cap rate, IRR, and cash-on-cash.',
      },
      {
        num: 'PHASE 02',
        title: 'Fund',
        color: 'text-sky-400',
        accentBg: 'bg-sky-400/10 border-sky-400/20',
        description:
          'Fund: Get the money and paperwork lined up. Track contingency deadlines and earnest money, keep contracts in one vault, get alerted before dates go hard.',
      },
      {
        num: 'PHASE 03',
        title: 'Hold',
        color: 'text-amber-400',
        accentBg: 'bg-amber-400/10 border-amber-400/20',
        description:
          'Hold: Own it and improve it. Link milestones to your budget, log expenses as they happen, watch holding costs and budget-vs-actual in real time.',
      },
      {
        num: 'PHASE 04',
        title: 'Exit',
        color: 'text-white/50',
        accentBg: 'bg-white/5 border-white/15',
        description:
          'Exit: Sell it or keep it as a rental, and prove what it made. Generate the performance record your buyer, lender, or appraiser expects.',
      },
    ] as const;·
    /** Ported from PaperWorking `components/landing/HowItWorks.tsx`. */
    export default function HowItWorks() {
      return (
        <div>
          <section className=\"relative overflow-hidden border-b border-white/5 pb-16 pt-8 md:pb-24 md:pt-12\">
            <div className=\"pointer-events-none absolute left-1/2 top-1/4 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--color-primary)]/5 blur-[160px]\" />·
            <div className=\"relative z-10 mx-auto max-w-[1280px] px-6 text-center\">
              <div className=\"mb-6 inline-flex items-center gap-2 rounded-full border border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-primary)]\">
                <span className=\"material-symbols-outlined text-sm\">hub</span>
                {howItWorksHeader}
              </div>·
              <h1 className=\"landing-display mx-auto mb-6 max-w-4xl font-semibold leading-[1.1] tracking-[-0.025em] text-white\">
                {howItWorksSubheadline}
              </h1>·
              <p className=\"mx-auto mb-14 max-w-3xl text-base leading-[1.65] text-white/65 sm:text-lg\">
                {howItWorksBody}
              </p>·
              <div className=\"grid grid-cols-1 gap-5 text-left md:grid-cols-2 md:gap-6 lg:grid-cols-4\">
                {PHASE_CARDS.map((card) => (
                  <div
                    key={card.num}
                    className=\"glass-card group flex flex-col justify-between rounded-[22px] border border-white/10 bg-[#0c090b]/80 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--color-primary)]/40 sm:p-7\"
                  >
                    <div>
                      <div className=\"mb-4 flex items-center justify-between\">
                        <span
                          className={`font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-medium uppercase tracking-[0.15em] ${card.color}`}
                        >
                          {card.num}
                        </span>
                        <span className={`h-2 w-2 rounded-full border ${card.accentBg}`} />
                      </div>
                      <h2 className=\"mb-3 text-2xl font-bold tracking-[-0.02em] text-white transition-colors group-hover:text-[color:var(--color-primary)]\">
                        {card.title}
                      </h2>
                      <p className=\"text-[13.5px] leading-[1.6] text-white/60 sm:text-[14px]\">
                        {card.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>·
          <section className=\"border-b border-white/5 bg-white/[0.02] py-14 md:py-20\">
            <div className=\"mx-auto max-w-[1280px] px-6 md:px-10\">
              <div className=\"max-w-3xl\">
                <h2 className=\"mb-6 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white md:text-3xl\">
                  What a Project is
                </h2>
                <p className=\"mb-5 text-base leading-[1.65] text-white/65 sm:text-lg\">
                  A Project is the home base for one investment. It holds the Deal (the property and its
                  numbers), the phase it&apos;s in, the tasks and deadlines ahead, the documents, the
                  budget, and the ledger of every dollar in and out. You work in the Project; PaperWorking
                  calculates your metrics from it.
                </p>
                <p className=\"text-base font-semibold leading-relaxed text-white sm:text-lg\">
                  The work you already do becomes the numbers you need.
                </p>
              </div>
            </div>
          </section>·
          <section className=\"border-b border-white/5 py-14 md:py-20\">
            <div className=\"mx-auto max-w-[1280px] space-y-10 px-6 md:px-10\">
              <div className=\"mb-8 max-w-3xl\">
                <span className=\"mb-2 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-[color:var(--color-primary)]\">
                  DEEP-DIVE WORKFLOWS
                </span>
                <h2 className=\"text-2xl font-semibold leading-tight tracking-[-0.02em] text-white md:text-3xl\">
                  Inside each phase of your deal
                </h2>
              </div>·
              <div className=\"glass-card rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-xl sm:p-10\">
                <span className=\"mb-3 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-[color:var(--color-primary)]\">
                  {dealCalculatorSectionTitle}
                </span>
                <h3 className=\"mb-4 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white\">
                  {dealCalculatorSectionBody}
                </h3>
                <div className=\"space-y-4 text-base leading-[1.65] text-white/65\">
                  <p>
                    {dealCalculatorSectionSub}
                  </p>
                  <p>
                    What you log here (purchase price, projected rents, rehab estimate) becomes the
                    baseline your actuals are measured against later.
                  </p>
                  <p>
                    Raising money from partners? List the deal on the Deal Marketplace to track interest
                    from other real estate investors in your network and pledges from investors in the
                    PaperWorking community. Interest and pledges are tracked here; every closing happens
                    between the parties, off-platform. No money moves through PaperWorking.
                  </p>
                </div>
              </div>·
              <div className=\"glass-card rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-xl sm:p-10\">
                <span className=\"mb-3 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-sky-400\">
                  PHASE 02 · CAPITAL & CONTINGENCIES
                </span>
                <h3 className=\"mb-4 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white\">
                  Phase 2 — Fund
                </h3>
                <div className=\"space-y-4 text-base leading-[1.65] text-white/65\">
                  <p>
                    Fund: Get the money and paperwork lined up. Track contingency deadlines and earnest
                    money, keep contracts in one vault, get alerted before dates go hard.
                  </p>
                </div>
              </div>·
              <div className=\"glass-card rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-xl sm:p-10\">
                <span className=\"mb-3 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-amber-400\">
                  PHASE 03 · EXECUTE & OPTIMIZE
                </span>
                <h3 className=\"mb-4 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white\">
                  Phase 3 — Hold
                </h3>
                <div className=\"space-y-4 text-base leading-[1.65] text-white/65\">
                  <p>
                    Hold: Own it and improve it. Link milestones to your budget, log expenses as they
                    happen, watch holding costs and budget-vs-actual in real time.
                  </p>
                  <p>
                    The Vendor Marketplace earns its keep here: find the contractor, appraiser, or attorney
                    when the project needs them.
                  </p>
                </div>
              </div>·
              <div className=\"glass-card rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-xl sm:p-10\">
                <span className=\"mb-3 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-white/50\">
                  PHASE 04 · REALIZE & PROVE
                </span>
                <h3 className=\"mb-4 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white\">
                  Phase 4 — Exit
                </h3>
                <div className=\"space-y-4 text-base leading-[1.65] text-white/65\">
                  <p>
                    Exit: Sell it or keep it as a rental, and prove what it made. Generate the performance
                    record your buyer, lender, or appraiser expects.
                  </p>
                </div>
              </div>
            </div>
          </section>·
          <section className=\"border-b border-white/5 bg-white/[0.02] py-14 md:py-20\">
            <div className=\"mx-auto max-w-[1280px] px-6 md:px-10\">
              <div className=\"max-w-3xl\">
                <h2 className=\"mb-6 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white sm:text-3xl md:text-4xl\">
                  The Real Estate Investment Lifecycle
                </h2>
                <div className=\"space-y-5 text-base leading-[1.65] text-white/65 sm:text-lg\">
                  <p>
                    Real Estate investments move through a unique lifecycle that is different from most
                    traditional project management workflows. PaperWorking structures every deal around
                    four core phases: Acquisition, Fund, Hold, and Exit. Each phase has its own specific
                    inputs, milestones, compliance gates, and financial calculations.
                  </p>
                  <p>
                    By organizing your work around these four phases, PaperWorking ensures that no critical
                    deadline is missed, expenses are tracked from day one, and investment metrics are
                    calculated automatically from your actual project data — per deal and across your
                    entire portfolio.
                  </p>
                </div>
              </div>
            </div>
          </section>·
          <section className=\"border-b border-white/5 py-14 md:py-20\">
            <div className=\"mx-auto max-w-[1280px] px-6 md:px-10\">
              <div className=\"max-w-3xl\">
                <h2 className=\"mb-8 text-3xl font-semibold leading-tight tracking-[-0.02em] text-white sm:text-4xl\">
                  One deal, all the way through
                </h2>
                <div className=\"space-y-6 text-base leading-[1.65] text-white/65 sm:text-lg\">
                  <p>
                    Take one deal. You find a duplex and run the address through the Deal Calculator; the
                    projected cap rate and cash-on-cash clear your bar, so you save it to the pipeline.
                    Those projections become your baseline.
                  </p>
                  <p>
                    You go under contract, and the Project moves to Fund. The inspection deadline, the
                    appraisal contingency, and the earnest money date get tracked with alerts. Contracts
                    and title work go into the vault.
                  </p>
                  <p>
                    At Hold, you build the rehab budget line by line and link each milestone to it. Every
                    contractor draw and invoice gets logged against a line item. Rent comes in through your
                    connected accounts. You never open a spreadsheet, but cost basis, holding costs, and
                    cash-on-cash stay current, because the ledger is the work.
                  </p>
                  <p>
                    When you sell or refinance, the Exit report reads from that same ledger: actual NOI,
                    DSCR, equity multiple. Your CPA gets the P&amp;L export. The Project closes, the history
                    stays, and your portfolio numbers update the day it happens.
                  </p>
                </div>
              </div>
            </div>
          </section>·
          <section className=\"border-b border-white/5 bg-white/[0.02] py-14 md:py-20\">
            <div className=\"mx-auto max-w-[1280px] px-6 md:px-10\">
              <div className=\"max-w-3xl\">
                <h2 className=\"mb-6 text-3xl font-semibold leading-tight tracking-[-0.02em] text-white sm:text-4xl\">
                  Lead Investor and Team roles
                </h2>
                <p className=\"mb-6 text-base leading-[1.65] text-white/65 sm:text-lg\">
                  An Investor account runs solo. An Investment Team account has a Lead Investor, the person
                  running the team, who invites members, assigns tasks and phases, and controls what each
                  can view or edit.
                </p>
                <ul className=\"mb-6 list-disc space-y-3 pl-5 text-base text-white/65 sm:text-lg\">
                  <li>Partners work the phases they&apos;re assigned.</li>
                  <li>Your CPA reads the books without being able to touch them.</li>
                  <li>Contractors and vendors see only the work they&apos;re assigned.</li>
                </ul>
                <p className=\"mb-4 text-base font-semibold leading-relaxed text-white sm:text-lg\">
                  Two investors can also team up on a single Project without merging accounts.
                </p>
              </div>
            </div>
          </section>·
          <section className=\"relative overflow-hidden border-b border-white/5 bg-white/[0.03] py-14 md:py-20 lg:py-24\">
            <div className=\"pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[color:var(--color-primary)]/[0.03] to-transparent\" />
            <div className=\"relative z-10 mx-auto max-w-3xl px-6 text-center\">
              <p className=\"mb-8 text-base font-medium text-white sm:text-lg\">
                Want to see it first? Walk through a live demo deal: pipeline, budgets, deadlines, and
                metrics included.
              </p>
              <div className=\"flex flex-col items-center justify-center gap-4 sm:flex-row\">
                <Link
                  href=\"/pricing\"
                  className=\"inline-flex cursor-pointer items-center gap-2.5 rounded-full bg-[color:var(--color-primary)] px-8 py-4 text-[15px] font-semibold tracking-wide text-[#0a0a0f] shadow-[0_0_24px_-4px_rgba(0,221,148,0.45)]\"
                >
                  Start Free 14-Day Trial
                  <span className=\"material-symbols-outlined text-[18px]\">arrow_forward</span>
                </Link>
              </div>
            </div>
          </section>·
          <HowItWorksLifecycleGraphic />
        </div>
      );
    }
    "

      21 |   it('How It Works hero matches approved copy', () => {
      22 |     const hwContent = fs.readFileSync(howItWorksPath, 'utf8');
    > 23 |     expect(hwContent).toContain('The REIL');
         |                       ^
      24 |     expect(hwContent).toContain('Four phases. One record. Thirty-three key datapoints.');
      25 |   });
      26 |

      at Object.<anonymous> (src/__tests__/yves-ui-port.test.ts:23:23)

  ● Yves-update-UI marketing copy lock (V1 paths) › Marketplaces page has approved marketplace copy

    expect(received).toContain(expected) // indexOf

    Expected substring: "PaperWorking subscribers run real deals through the same four phases you do."
    Received string:    "'use client';·
    import Link from 'next/link';
    import { useEffect, useState } from 'react';
    import {
      twoMarketplacesTitle,
      twoMarketplacesBody,
      dealMarketplaceBlurb,
      vendorMarketplaceBlurb,
      legalDisclaimer,
    } from '@/lib/marketing/copy';·
    /** Ported from PaperWorking `components/landing/MarketplacesClient.tsx`. */
    export default function MarketplacesClient() {
      const [activeTab, setActiveTab] = useState<'deals' | 'vendors'>('deals');·
      useEffect(() => {
        const handleHash = () => {
          const hash = window.location.hash;
          if (hash === '#vendors') setActiveTab('vendors');
          else if (hash === '#deals') setActiveTab('deals');
        };·
        handleHash();
        window.addEventListener('hashchange', handleHash);
        return () => window.removeEventListener('hashchange', handleHash);
      }, []);·
      function handleTabClick(tab: 'deals' | 'vendors') {
        setActiveTab(tab);
        window.history.pushState(null, '', `#${tab}`);
      }·
      return (
        <div className=\"mx-auto flex min-h-[60vh] max-w-[1200px] flex-col justify-center py-8 md:py-14\">
          <section className=\"mx-auto max-w-3xl space-y-6 pt-4 text-center md:pt-6\">
            <span className=\"inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 backdrop-blur-sm\">
              <span className=\"h-1.5 w-1.5 rounded-full bg-[color:var(--color-primary)]\" />
              <span className=\"font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-[color:var(--color-primary)]\">
                Two marketplaces, one network
              </span>
            </span>·
            <h1 className=\"landing-display font-semibold leading-[1.05] tracking-[-0.025em] text-white\">
              {twoMarketplacesTitle}
            </h1>·
            <div className=\"mx-auto max-w-3xl space-y-4 text-center\">
              <p className=\"text-base font-medium leading-[1.65] text-white/70 sm:text-lg\">
                {twoMarketplacesBody}
              </p>
              <p className=\"text-sm leading-[1.65] text-white/60 sm:text-base\">
                {activeTab === 'deals' ? dealMarketplaceBlurb : vendorMarketplaceBlurb}
              </p>
            </div>·
            <div className=\"flex justify-center pt-2\">
              <div
                role=\"tablist\"
                aria-label=\"Marketplace options\"
                className=\"inline-flex max-w-full items-center overflow-x-auto rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur-sm\"
              >
                <button
                  type=\"button\"
                  role=\"tab\"
                  aria-selected={activeTab === 'deals'}
                  aria-controls=\"deals\"
                  onClick={() => handleTabClick('deals')}
                  className={`flex min-h-[44px] cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-6 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] ${
                    activeTab === 'deals'
                      ? 'bg-[color:var(--color-primary)] text-[#0a0a0f] shadow-md'
                      : 'text-white/55 hover:text-white'
                  }`}
                >
                  Deal Marketplace
                </button>·
                <button
                  type=\"button\"
                  role=\"tab\"
                  aria-selected={activeTab === 'vendors'}
                  aria-controls=\"vendors\"
                  onClick={() => handleTabClick('vendors')}
                  className={`flex min-h-[44px] cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-6 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] ${
                    activeTab === 'vendors'
                      ? 'bg-[color:var(--color-primary)] text-[#0a0a0f] shadow-md'
                      : 'text-white/55 hover:text-white'
                  }`}
                >
                  Vendor Marketplace
                </button>
              </div>
            </div>·
            <div className=\"space-y-6 pb-2 pt-6\">
              <div className=\"flex flex-col items-center justify-center gap-4 sm:flex-row\">
                <Link
                  href={activeTab === 'deals' ? '/dashboard/deals' : '/dashboard/marketplace'}
                  className=\"inline-flex items-center gap-2 rounded-full bg-[color:var(--color-primary)] px-8 py-4 text-[14px] font-semibold tracking-wide text-[#0a0a0f] shadow-[0_0_24px_-4px_rgba(0,221,148,0.45)] transition-all duration-150 active:scale-95\"
                >
                  Browse the marketplaces
                  <span className=\"material-symbols-outlined text-[18px]\">arrow_forward</span>
                </Link>
                <Link
                  href=\"/pricing\"
                  className=\"inline-flex items-center gap-2 rounded-full border border-white/15 px-8 py-4 text-[14px] font-semibold text-white transition-all duration-150 hover:border-[color:var(--color-primary)]/40 hover:text-[color:var(--color-primary)]\"
                >
                  List your services as a vendor
                  <span className=\"material-symbols-outlined text-[18px]\">arrow_forward</span>
                </Link>
              </div>
              <p className=\"mx-auto max-w-lg font-[family-name:var(--font-jetbrains-mono)] text-xs leading-relaxed text-white/40\">
                {legalDisclaimer}
              </p>
            </div>
          </section>
        </div>
      );
    }
    "

      27 |   it('Marketplaces page has approved marketplace copy', () => {
      28 |     const clientContent = fs.readFileSync(marketplacesPath, 'utf8');
    > 29 |     expect(clientContent).toContain(
         |                           ^
      30 |       'PaperWorking subscribers run real deals through the same four phases you do.',
      31 |     );
      32 |     expect(clientContent).toContain('Put your Project in front of investors who are looking.');

      at Object.<anonymous> (src/__tests__/yves-ui-port.test.ts:29:27)

  ● Yves-update-UI marketing copy lock (V1 paths) › Logo uses canonical raster brand masters

    expect(received).toContain(expected) // indexOf

    Expected substring: "/brand/paperworking-logotype-white-transparent.png"
    Received string:    "'use client';·
    import Link from 'next/link';
    import { PaperWorkingIcon } from '@/components/brand/icons/PaperWorkingIcon';
    import { PaperWorkingLogotype } from '@/components/brand/icons/PaperWorkingLogotype';·
    type SizeKey = 'h-6' | 'h-8' | 'h-10' | 'h-12' | 'sm' | 'md' | 'lg';·
    interface LogoProps {
      href?: string;
      /** `full` = icon+wordmark; `icon` = mark only; `hero-landing` = full with w-1/2 */
      variant?: 'full' | 'icon' | 'hero-landing';
      /** light = black mark; dark = white mark; auto follows tone */
      theme?: 'light' | 'dark' | 'auto';
      size?: SizeKey | number;
      className?: string;
      /** Presets for marketing / auth / dashboard chrome */
      tone?: 'marketing' | 'auth' | 'dashboard';
      collapsed?: boolean;
    }·
    const heightMap: Record<SizeKey, number> = {
      'h-6': 24,
      'h-8': 32,
      'h-10': 40,
      'h-12': 48,
      sm: 20,
      md: 24,
      lg: 30,
    };·
    const ASPECT_RATIOS = {
      full: 400 / 51.38,
      icon: 512 / 474,
    };·
    export default function Logo({
      href = '/',
      variant,
      theme = 'auto',
      size,
      className = '',
      tone = 'marketing',
      collapsed = false,
    }: LogoProps) {
      const resolvedTheme: 'light' | 'dark' =
        theme === 'auto' ? (tone === 'auth' || tone === 'dashboard' ? 'dark' : 'dark') : theme;·
      // Marketing landing is dark-first (v0 parity); light pages can pass theme=\"light\".
      const color = resolvedTheme === 'dark' ? '#fdfffc' : '#0a0a0f';·
      const targetVariant: 'full' | 'icon' =
        variant === 'hero-landing' ? 'full' : (variant ?? (collapsed || tone === 'dashboard' ? 'icon' : 'full'));·
      let resolvedHeight = 24;
      if (typeof size === 'number') resolvedHeight = size;
      else if (size && size in heightMap) resolvedHeight = heightMap[size];
      else resolvedHeight = targetVariant === 'icon' ? 24 : 28;·
      const resolvedWidth = Math.round(resolvedHeight * ASPECT_RATIOS[targetVariant]);
      const Svg = targetVariant === 'full' ? PaperWorkingLogotype : PaperWorkingIcon;·
      // Sizing utilities: responsive when size is not provided, clamping to max-width 50%
      let widthClass = '';
      let svgClassName = 'select-none max-w-none';·
      if (!size) {
        widthClass = variant === 'hero-landing'
          ? 'w-1/2 max-w-[50%]'
          : 'w-[25%] md:w-[20%] lg:w-[18%] max-w-[50%]';
        svgClassName = 'w-full h-auto select-none';
      } else {
        widthClass = 'max-w-[50%]';
      }·
      const mark = (
        <>
          {targetVariant === 'full' ? (
            <>
              <PaperWorkingLogotype
                width={!size ? '100%' : resolvedWidth}
                height={!size ? '100%' : resolvedHeight}
                role=\"img\"
                aria-label=\"PaperWorking\"
                style={{ color, flexShrink: 0 }}
                className={`hidden select-none md:block ${svgClassName}`}
              />
              <PaperWorkingIcon
                width={!size ? '100%' : Math.round(resolvedHeight * ASPECT_RATIOS.icon)}
                height={!size ? '100%' : resolvedHeight}
                role=\"img\"
                aria-label=\"PaperWorking\"
                style={{ color, flexShrink: 0 }}
                className={`block select-none md:hidden ${svgClassName}`}
              />
            </>
          ) : (
            <Svg
              width={!size ? '100%' : resolvedWidth}
              height={!size ? '100%' : resolvedHeight}
              role=\"img\"
              aria-label=\"PaperWorking\"
              style={{ color, flexShrink: 0 }}
              className={svgClassName}
            />
          )}
        </>
      );·
      if (href) {
        return (
          <Link
            href={href}
            className={`inline-flex shrink-0 transition-opacity duration-150 hover:opacity-75 focus-visible:opacity-75 focus-visible:outline-none ${widthClass} ${className}`}
            aria-label=\"PaperWorking — Return to homepage\"
          >
            {mark}
          </Link>
        );
      }·
      return <span className={`inline-flex items-center shrink-0 ${widthClass} ${className}`}>{mark}</span>;
    }
    "

      37 |     const logoPath = path.join(webRoot, 'components/marketing/Logo.tsx');
      38 |     const logoContent = fs.readFileSync(logoPath, 'utf8');
    > 39 |     expect(logoContent).toContain('/brand/paperworking-logotype-white-transparent.png');
         |                         ^
      40 |     expect(logoContent).toContain('/brand/paperworking-icon-black-transparent.png');
      41 |   });
      42 |

      at Object.<anonymous> (src/__tests__/yves-ui-port.test.ts:39:25)

FAIL src/__tests__/phase-b14-project-documents.test.ts
  ● phase B14 — browser document transport › ProjectDocumentsPanel uses same-origin document BFF helpers

    expect(received).toContain(expected) // indexOf

    Expected substring: "listProjectDocumentsFromBff"
    Received string:    "'use client';·
    import Link from 'next/link';
    import { getSeedProjectById } from '@/lib/projects/seed-data';·
    export default function ProjectDocumentsPanel({ projectId }: { projectId: string }) {
      const project = getSeedProjectById(projectId);
      const documents = project?.documents ?? [];·
      if (!project) {
        return (
          <div className=\"rounded-2xl border border-white/10 bg-black/25 p-8 text-sm text-white/65\">
            Project not found.
          </div>
        );
      }·
      return (
        <div className=\"space-y-6\">
          <div>
            <p className=\"mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45\">
              {project.propertyName}
            </p>
            <h2 className=\"text-2xl font-semibold tracking-[-0.02em]\">Document vault</h2>
            <p className=\"mt-2 max-w-2xl text-sm text-white/65\">
              Seed documents from project workspace. Upload pipeline connects via `handleProjectsDocumentsPost` post-cutover.
            </p>
          </div>·
          <div className=\"overflow-hidden rounded-2xl border border-white/10\">
            <table className=\"w-full text-left text-sm\">
              <thead className=\"bg-white/[0.04] text-white/45\">
                <tr>
                  <th className=\"px-5 py-3 font-medium\">Name</th>
                  <th className=\"px-5 py-3 font-medium\">Type</th>
                  <th className=\"px-5 py-3 font-medium\">Added</th>
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={3} className=\"px-5 py-8 text-white/45\">
                      No documents yet.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.doc_id} className=\"border-t border-white/8\">
                      <td className=\"px-5 py-4 font-medium\">{doc.name}</td>
                      <td className=\"px-5 py-4 text-white/65\">{doc.type}</td>
                      <td className=\"px-5 py-4 text-white/65\">
                        {doc.generated_at ? new Date(doc.generated_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>·
          <Link href={`/project/${projectId}`} className=\"text-sm text-white/60 underline-offset-4 hover:underline\">
            ← Project overview
          </Link>
        </div>
      );
    }
    "

      13 |     );
      14 |
    > 15 |     expect(panel).toContain('listProjectDocumentsFromBff');
         |                   ^
      16 |     expect(panel).toContain('uploadProjectDocumentFromBff');
      17 |     expect(panel).toContain('getProjectDocumentAccessFromBff');
      18 |     expect(panel).not.toContain('loadProjectById');

      at Object.<anonymous> (src/__tests__/phase-b14-project-documents.test.ts:15:19)


Test Suites: 12 failed, 41 passed, 53 total
Tests:       16 failed, 318 passed, 334 total
Snapshots:   0 total
Time:        14.848 s
Ran all test suites.
npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /home/runner/work/PaperWorking/PaperWorking/apps/web
npm error workspace @paperworking/web@0.1.0
npm error location /home/runner/work/PaperWorking/PaperWorking/apps/web
npm error command failed
npm error command sh -c node --experimental-vm-modules ../../node_modules/jest/bin/jest.js


> @paperworking/authz@0.1.0 test
> node --experimental-vm-modules ../../node_modules/jest/bin/jest.js

(node:3291) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS src/__tests__/csrf.test.ts
  ● Console

    console.warn
      [CSRF] Rejected — unlisted Origin: https://evil.example.com

       96 |       return { ok: true };
       97 |     }
    >  98 |     console.warn('[CSRF] Rejected — unlisted Origin:', origin);
          |             ^
       99 |     return { ok: false, status: 403, reason: 'Origin not allowed' };
      100 |   }
      101 |

      at validateCsrf (src/csrf.ts:98:13)
      at Object.<anonymous> (src/__tests__/csrf.test.ts:53:20)

    console.warn
      [CSRF] Rejected — Sec-Fetch-Site: cross-site

      87 |   const fetchSite = request.headers.get('sec-fetch-site');
      88 |   if (fetchSite === 'cross-site') {
    > 89 |     console.warn('[CSRF] Rejected — Sec-Fetch-Site: cross-site');
         |             ^
      90 |     return { ok: false, status: 403, reason: 'Cross-site request rejected' };
      91 |   }
      92 |

      at validateCsrf (src/csrf.ts:89:13)
      at Object.<anonymous> (src/__tests__/csrf.test.ts:62:20)

(node:3290) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS src/__tests__/authorization.service.test.ts

Test Suites: 2 passed, 2 total
Tests:       9 passed, 9 total
Snapshots:   0 total
Time:        0.971 s
Ran all test suites.

> @paperworking/database@0.1.0 test
> node --experimental-vm-modules ../../node_modules/jest/bin/jest.js

(node:3348) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS src/firestore/__tests__/marketplace-vendors-firestore.test.ts
(node:3354) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:3347) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS src/firestore/__tests__/inbox-team-firestore.test.ts
PASS src/firestore/__tests__/admin-firestore.test.ts
PASS src/firestore/__tests__/billing-firestore.test.ts
PASS src/firestore/__tests__/profile-reports-firestore.test.ts
PASS src/firestore/__tests__/financial-portfolio-firestore.test.ts
PASS src/firestore/__tests__/deals-repository.test.ts
PASS src/firestore/__tests__/project-kpi-documents.test.ts
PASS src/firestore/__tests__/repositories.test.ts
PASS src/firestore/__tests__/converters.test.ts
PASS src/firestore/__tests__/identity-user-repository.test.ts
PASS src/firestore/__tests__/auth-boundary.test.ts
PASS src/firebase/__tests__/firebase-file-storage-config.test.ts
PASS src/sync/__tests__/sync-orchestrator.test.ts
PASS src/runtime/__tests__/auth-profile-access.test.ts

Test Suites: 15 passed, 15 total
Tests:       123 passed, 123 total
Snapshots:   0 total
Time:        6.103 s
Ran all test suites.

> @paperworking/financial-engine@0.1.0 test
> node --experimental-vm-modules ../../node_modules/jest/bin/jest.js

(node:3407) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS src/__tests__/depreciation-golden.test.ts
(node:3409) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS src/__tests__/netsuite-kpi.test.ts
(node:3406) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS src/__tests__/statement-engine.test.ts
PASS src/__tests__/honesty-rule.test.ts
PASS src/__tests__/golden-values.test.ts

Test Suites: 5 passed, 5 total
Tests:       31 passed, 31 total
Snapshots:   0 total
Time:        1.512 s
Ran all test suites.

> @paperworking/identity@0.1.0 test
> node --experimental-vm-modules ../../node_modules/jest/bin/jest.js

(node:3465) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS src/__tests__/firebase-verifier.test.ts
(node:3464) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS src/__tests__/identity-router.test.ts

Test Suites: 2 passed, 2 total
Tests:       12 passed, 12 total
Snapshots:   0 total
Time:        0.983 s
Ran all test suites.

> @paperworking/services@0.1.0 test
> node --experimental-vm-modules ../../node_modules/jest/bin/jest.js

(node:3528) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS src/__tests__/project-documents-service.test.ts
(node:3521) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS src/__tests__/deals-command-service.test.ts
PASS src/__tests__/portfolio-metrics-read-service.test.ts
(node:3522) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS src/__tests__/projects-command-service.test.ts
PASS src/__tests__/team-command-service.test.ts
PASS src/__tests__/project-kpi-read-service.test.ts
PASS src/__tests__/profile-command-service.test.ts
PASS src/__tests__/admin-cutover-service.test.ts
PASS src/__tests__/deal-reply-service.test.ts
PASS src/__tests__/team-members-read-service.test.ts
PASS src/__tests__/inbox-read-service.test.ts
PASS src/__tests__/vendor-portal-command-service.test.ts
PASS src/__tests__/deal-broadcast-service.test.ts
PASS src/__tests__/billing-checkout-service.test.ts
PASS src/__tests__/marketplace-profile-read-service.test.ts
PASS src/__tests__/deals-read-service.test.ts
PASS src/__tests__/inbox-command-service.test.ts
PASS src/__tests__/cash-flow-events.test.ts
PASS src/__tests__/projects-read-service.test.ts
PASS src/__tests__/deal-communication-flow.test.ts
PASS src/__tests__/vendors-read-service.test.ts
PASS src/__tests__/identity-provisioning.test.ts
PASS src/__tests__/build-live-portfolio-report.test.ts
PASS src/__tests__/broadcast-token.test.ts
PASS src/__tests__/profile-safe-dto.test.ts
PASS src/__tests__/session-resolver.test.ts
PASS src/__tests__/build-project-kpi-engine-inputs.test.ts
PASS src/__tests__/session-command.test.ts
PASS src/__tests__/project-kpi-provenance.test.ts
PASS src/__tests__/portfolio-insights-read-service.test.ts
PASS src/__tests__/stripe-webhook-service.test.ts
PASS src/__tests__/marketplace-investors-read-service.test.ts
PASS src/__tests__/marketplace-follow-command-service.test.ts
PASS src/__tests__/reports-read-service.test.ts
PASS src/__tests__/deal-baseline-to-financials.test.ts

Test Suites: 35 passed, 35 total
Tests:       221 passed, 221 total
Snapshots:   0 total
Time:        4.29 s
Ran all test suites.

> @paperworking/shared@0.1.0 test
> node --experimental-vm-modules ../../node_modules/jest/bin/jest.js --passWithNoTests

No tests found, exiting with code 0

> @paperworking/validation@0.1.0 test
> node --experimental-vm-modules ../../node_modules/jest/bin/jest.js

(node:3580) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS src/schemas/__tests__/schemas.test.ts
  User Schema
    ✓ accepts a valid user document (3 ms)
    ✓ rejects a user with invalid email (1 ms)
    ✓ rejects a user with empty uid
    ✓ accepts null email for phone-only auth (1 ms)
  Organization Schema
    ✓ accepts a valid organization (1 ms)
    ✓ rejects an org with invalid account tier
    ✓ rejects an org with maxSeats < 1
  Project Schema
    ✓ accepts a valid project document (2 ms)
    ✓ rejects a project with invalid status (1 ms)
    ✓ accepts currentPhase as a number (1-4)
    ✓ rejects currentPhase > 4
    ✓ rejects negative purchase price (1 ms)
    ✓ accepts project with cost entries
  Property Metric Snapshot Schema
    ✓ accepts a valid snapshot
    ✓ accepts null metric fields (insufficient data)
  Project Document Schemas
    ✓ accepts a valid folder
    ✓ accepts a valid file (1 ms)
    ✓ rejects a file with invalid category
    ✓ rejects a file with invalid storage URL
  Vendor Request Schema
    ✓ accepts a valid vendor request
    ✓ rejects an invalid status
    ✓ accepts a request with quoted fee
    ✓ validates create vendor request input (1 ms)
  Notification Schema
    ✓ accepts a valid notification
    ✓ rejects a notification with invalid type
  Inbox Item Schema
    ✓ accepts a valid inbox item (1 ms)
    ✓ rejects an inbox item with invalid priority
  Stripe Event Schema
    ✓ accepts a valid stripe event
    ✓ rejects a stripe event with empty eventId
    ✓ accepts optional processing fields (1 ms)

Test Suites: 1 passed, 1 total
Tests:       30 passed, 30 total
Snapshots:   0 total
Time:        0.759 s
Ran all test suites.

> @paperworking/integration@0.1.0 test
> node --experimental-vm-modules ../../node_modules/jest/bin/jest.js

(node:3650) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS src/__tests__/auth-flow.integration.test.ts
  ● Console

    console.warn
      [CSRF] Rejected — Sec-Fetch-Site: cross-site

      87 |   const fetchSite = request.headers.get('sec-fetch-site');
      88 |   if (fetchSite === 'cross-site') {
    > 89 |     console.warn('[CSRF] Rejected — Sec-Fetch-Site: cross-site');
         |             ^
      90 |     return { ok: false, status: 403, reason: 'Cross-site request rejected' };
      91 |   }
      92 |

      at validateCsrf (../../packages/authz/src/csrf.ts:89:13)
      at validateCsrfFromRequest (../../apps/api/src/routes/auth/session/handler.ts:67:10)
      at handleSessionPost (../../apps/api/src/routes/auth/session/handler.ts:114:16)
      at Object.<anonymous> (src/__tests__/auth-flow.integration.test.ts:42:27)

PASS src/__tests__/web-adapter-coverage.integration.test.ts
(node:3649) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:3653) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS src/__tests__/metrics-pipeline.integration.test.ts
PASS src/__tests__/admin-impersonation.integration.test.ts
PASS src/__tests__/sendgrid-sandbox.integration.test.ts
PASS src/__tests__/stripe-sandbox.integration.test.ts

Test Suites: 6 passed, 6 total
Tests:       13 passed, 13 total
Snapshots:   0 total
Time:        3.1 s
Ran all test suites.
Error: Process completed with exit code 1.