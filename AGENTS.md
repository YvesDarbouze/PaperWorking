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

All agents MUST strictly enforce the persistent left-side navigation contract.
Source of truth: `src/components/layout/Sidebar.tsx`

## Brand Area
- PaperWorking SVG icon (currentColor — adapts to theme) + wordmark
- Font: Inter · "Paper" fw-700 · "Working" fw-300 · zero letter-spacing gap
- Href: `/dashboard/command-center`

## Primary Navigation (exact order — DO NOT change)

| Label | Route | Icon | Description |
|-------|-------|------|-------------|
| **Portfolio** | `/dashboard/command-center` | `space_dashboard` | Default landing page — KPIs, action center, heatmap, activity |
| **Projects** | `/dashboard/projects` | `folder` | All real estate investment projects in the portfolio |
| **Insights** | `/dashboard/insights` | `monitoring` | Portfolio-wide metrics, investment views, deep analytics |
| **Reports** | `/dashboard/reports` | `bar_chart_4_bars` | Generate monthly / quarterly / annual expense reports |
| **Inbox** | `/dashboard/inbox` | `inbox` | Internal messages, to-dos, requests, deal crowdfund invites (unread badge + pulse) |
| **Team** | `/dashboard/team` | `group` | Team management, invites, presence status |

## Section Divider
Uppercase label: **ACCOUNT**

## Account Navigation (exact order — DO NOT change)

| Label | Route | Icon | Description |
|-------|-------|------|-------------|
| **Profile** | `/dashboard/settings/profile` | `account_circle` | Avatar, company logo, licenses from vendor list |
| **Billing** | `/dashboard/settings/billing` | `payments` | Subscription plan, credit card on file |
| **Settings** | `/dashboard/settings` | `settings` | Password, tier, app preferences |

## Bottom Area (top to bottom)
1. **Theme toggle** — light/dark mode switch (sun/moon icon)
2. **Workspace switcher** — "acting as: Me / [Team Account]" select
3. **Profile row** — avatar + name + role + logout button

## Theme
- Dark: `rgba(18,16,20,0.98)` bg, `blur(24px)`, `rgba(253,255,252,0.07)` border
- Light: `#FDFFFC` bg, `rgba(69,73,85,0.10)` border
- Controlled via `data-theme` on `<html>` + `useTheme()` from `@/lib/utils/ThemeProvider`

**No agent may add, remove, reorder, rename, or move navigation items without explicit human override.**
Last updated: 2026-06-06 v3
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
- **Async & Webhooks**: For any provider resolving asynchronously (signing, OCR, etc.), implement the callback/webhook route and reconcile statuses. Do not fake completion with a client-side timer.
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


