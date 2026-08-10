<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:agent-harmony-protocol -->
# 🤖 Multi-Agent Harmony Protocol

This workspace is actively maintained by human developers as well as multiple AI agents (e.g., Google Deepmind's Antigravity, Anthropic's Claude Code, and IDE agents like Cursor/Windsurf). 

To ensure harmony, ALL agents MUST strictly follow these rules:

1. **Shared State (The Baton):** If you are leaving an incomplete or complex task for another agent, leave a brief summary note in `.agents/handoff.md`.
2. **Read Before Writing:** Always check `.agents/handoff.md` (if it exists) when initializing a new task to see the latest context or warnings left by the previous agent.
3. **Artifact Restraint:** Antigravity agents create `implementation_plan.md` and `task.md` inside their ephemeral `.gemini/` directories, but Claude Code might not see those. If a permanent architectural decision is made, document it in `DesignSystem.md` or a `.md` doc in the repo root so all agents have access.
4. **Tool Integrity:** Do not overwrite code blindly. Validate types and lint errors before finalizing a modification.
5. **Acknowledge the Team:** You are part of an AI engineering team. Work collaboratively on the codebase without destroying another agent's work.
<!-- END:agent-harmony-protocol -->

<!-- BEGIN:global-navigation-contract -->
# 🧭 GLOBAL NAVIGATION — FIXED CONTRACT FOR EVERY PAPERWORKING SCREEN

All agents MUST strictly enforce the navigation contract.
Single Source of Truth: `src/lib/navigation/navContract.ts`

## Brand Area
- PaperWorking SVG icon (currentColor — adapts to theme) + wordmark
- Font: Inter · "Paper" fw-700 · "Working" fw-300 · zero letter-spacing gap
- Href: `/dashboard/command-center`

## Global Navigation Contract (§9.3 v7)

### Investor Role (Subscribed) — Desktop Primary Sidebar Order
1. Portfolio (/dashboard/command-center) - default landing page — KPIs, action center, heatmap, activity
2. Projects (/dashboard/projects) - real estate investment projects in the portfolio
3. Deals (/dashboard/deals) - user-generated crowdfunding & investment opportunity marketplace (handshake icon)
4. Insights (/dashboard/insights) - portfolio-wide metrics, investment views, deep analytics
5. Reports (/dashboard/reports) - monthly / quarterly / annual expense reports
6. Inbox (/dashboard/inbox) - messages, to-dos, requests, deal crowdfund invites (unread badge + pulse)
7. Team (/dashboard/team) - team management, invites, presence status

### Investor Role (Unsubscribed)
- Deals (/dashboard/deals) renders in sidebar and drawer with a **lock badge**. Clicking routes to billing paywall (`/dashboard/settings/billing?paywall=deals`).

### Vendor Role
- Primary Nav: Portfolio, Vendor Marketplace (/dashboard/marketplace, icon "storefront"), Insights, Reports, Inbox, Team.
- **Deals Marketplace is strictly STRIPPED** from navigation, Cmd+K search index, breadcrumbs, and direct URLs (redirected to `/dashboard/marketplace`).

### Mobile Navigation (375px)
- Fixed 72px 5-icon Bottom Bar (`BottomNav.tsx`): Portfolio, Insights, Projects, Reports, Inbox.
- Top-App-Bar Drawer (`TopAppBar.tsx`): Hamburger icon button opens drawer listing secondary surfaces: Deals (lock badge if unsubscribed), Vendor Network, Team, Profile, Billing, Settings.

### Section Divider
Uppercase label: **ACCOUNT**

### Account Pages
- Profile (/dashboard/settings/profile) - avatar, company logo, licenses
- Billing (/dashboard/settings/billing) - subscription plan, credit card on file
- Settings (/dashboard/settings) - password, tier, app preferences

### Theme
- Dark: `rgba(18,16,20,0.98)` bg, `blur(24px)`, `rgba(253,255,252,0.07)` border
- Light: `#FDFFFC` bg, `rgba(69,73,85,0.10)` border
- Controlled via `data-theme` on `<html>` + `useTheme()` from `@/lib/utils/ThemeProvider`

### Changelog & Closed Findings
- **v7 (2026-08-03):** Closed NAV-01 (Deals elevated to primary sidebar for subscribed investors), NAV-02 (Vendor Marketplace role-gated), NAV-03 (Team accessible in mobile top drawer), NAV-04 (HTTP 301 Data Room redirect to Projects), NAV-05 (Dynamic document.title "PaperWorking — <Surface>"). Unified single source of truth in `src/lib/navigation/navContract.ts`.
<!-- END:global-navigation-contract -->

<!-- BEGIN:mock-conversion-rules -->
# 🔌 Mock Conversion & Integration Rules

You are converting mocked features in PaperWorking into real implementations. Apply these rules to every feature prompt that follows.

## Vendor-Agnostic & Mock-Fallback Pattern (Mandatory)
Never call an external vendor SDK directly from a component. For each integration:
1. Define a typed provider interface.
2. Implement the real adapter.
3. Refactor the existing mock into a `MockAdapter` that satisfies the same interface.
4. Select the active adapter via an env flag (e.g. `ESIGN_PROVIDER=docusign|mock`).

This keeps the app runnable without credentials and lets vendors be swapped easily.

## Definition of Done
Every feature must satisfy all of these constraints:
- **Provider Interface + Real/Mock Adapters**: Keyed and selected via environment variables.
- **Server-Side Only Secrets**: All third-party API keys and SDK calls must live in Next.js API routes or Server Actions; never leak them to client bundles.
- **Auth Guard**: Every server endpoint must verify the caller's Firebase ID token before acting.
- **Persistence**: Real results and status changes are written to Firestore (named collections/paths), not just local React component state.
- **Async & Webhooks**: For any provider resolving asynchronously (signing, etc.), implement the callback/webhook route and reconcile statuses. Do not fake completion with a client-side timer.
- **UI States**: Replace every `setTimeout` or `alert` with real API calls, and handle loading, success, error, and empty states explicitly.
- **Idempotency & Errors**: Handle retries, network failures, and partial failures. Surface actionable error messages to the user.
- **Env Documentation**: Document every new environment variable inside `.env.example` with a clear comment.
- **Telemetry**: Emit a PostHog event on success/failure.
- **Tests**: Unit-test the adapter logic against the mock and a stubbed real adapter. The existing test suite must still pass completely.

Verify current SDK/API specifics against each vendor's official docs at implementation time rather than assuming.

## Security & Correctness Acceptance (Prompts 3–11)
For every integration prompt (Prompts 3–11), the agent must demonstrate (not just claim):

The server endpoint rejects an unauthenticated/forged request — show a request with no/invalid token, or a spoofed identifier, being refused. The acting identity is derived from the token.
No third-party secret appears in the client bundle — show the key is only referenced server-side.
A provider failure does not break the user's action — show the core operation succeeding (or failing gracefully with an actionable error) when the external call throws.
For async features, status comes from a verified webhook/poll, demonstrated end-to-end — never a client timer.
Confirm tsc clean and the full suite green, and state explicitly which of the above were verified by hand, since tests don't cover them.
<!-- END:mock-conversion-rules -->

<!-- BEGIN:rentcast-integration-rules -->
# RentCast API Integration Rules
We are integrating the RentCast API (https://api.rentcast.io/v1) as PaperWorking's primary live property-data provider. Key facts from its documentation:
- Auth: X-Api-Key header. The key is server-side only — never in client bundles.
- Rate limit: 20 requests/second. Billing is per request, so unnecessary calls cost real money.
- Endpoints we use: /properties (property records incl. attributes, last sale, tax assessments), /avm/value (value estimate + sale comparables), /avm/rent/long-term (rent estimate + rental comparables), /markets (zip-level sale & rental statistics with ~12 months history), /listings/sale and /listings/rental (active listings).
- AVM responses include the estimate, a low/high range, the subject property, and comparables each carrying price, distance, daysOnMarket, correlation (0–1 similarity), listedDate, and status.
- AVM accuracy: pass the full address and let lookupSubjectAttributes default to true; tune maxRadius, daysOld, compCount only when needed.

Caching is mandatory. Every RentCast response is cached in Firestore with fetchedAt and a per-endpoint TTL.
Estimates are AVMs, not appraisals — display the range, not just the point value, and label the source.
Zillow policy: partner-gated... No Zillow code beyond keeping provider interfaces adapter-ready.
<!-- END:rentcast-integration-rules -->
