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

