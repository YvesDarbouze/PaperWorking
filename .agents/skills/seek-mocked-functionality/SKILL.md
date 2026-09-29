---
name: seek-mocked-functionality
description: >-
  Audits the PaperWorking codebase to seek, detect, and eliminate mocked functionality,
  dead UI, alerts, and ungrounded placeholders per the strict NO-MOCK CONTRACT. Use this
  skill whenever auditing code for production readiness, verifying that interactive UI
  elements are wired to real state/APIs, or hunting down placeholder patterns.
---

# Seek Mocked Functionality Skill (NO-MOCK CONTRACT Enforcement)

This skill provides procedures, scripts, and rules for identifying and eliminating mocked, simulated, placeholder, or dead functionality across the PaperWorking repository.

## The PaperWorking NO-MOCK CONTRACT (Core Rules)

1. **No Dead UI**:
   - Every button, link, tab, modal, and form must be wired to real state and real logic.
   - Banned: `href="#"`, `href='#'`, `href="javascript:..."`.
   - Banned: `onClick={() => {}}` or empty no-op handlers.
   - Banned: `window.alert(...)`, `confirm(...)`, or `console.log(...)` handlers masquerading as user feedback.
   - Required: Use real reactive state, toast/banner components, or modal workflows.

2. **No Placeholder Content**:
   - Banned: "Lorem ipsum", "TODO", "FIXME", "TBD", "Coming soon", grey placeholder boxes.
   - Required: Real contextual copy, verified financial metrics, or AI-generated real domain imagery.

3. **No Hardcoded Fake Data Masquerading as a Live Data Layer**:
   - If a screen renders financial data, project status, or legal records, it must come from the canonical store/API/database.
   - Seed data is permitted only for initial DB seeding or verifiable test fixtures, never as an ungrounded client-side illusion.

4. **No Fake Calculations**:
   - Every metric (IRR, Cap Rate, DSCR, NOI, CoC, ROE, Waterfall splits) must be calculated dynamically by `@paperworking/financial-engine` from real inputs.

5. **Honest Credential Handling (Rule 5)**:
   - When external services (Google Maps, RentCast, SendGrid, Plaid, Cloud Storage) lack API keys in local development, components must declare a typed interface, check configuration status, and display an honest `REQUIRES CREDENTIALS: [Service] unconfigured` badge. Never silently simulate a success or hide missing credentials.

6. **Continuous Test Guard**:
   - Every interactive flow must have automated tests verifying behavior and asserting zero mock regressions.

---

## Procedures

### Step 1: Run the Automated Audit Script
Execute the audit script to scan all frontend and backend source trees:

```bash
node .agents/skills/seek-mocked-functionality/scripts/audit-no-mock.mjs
```

### Step 2: Targeted Codebase Grep Checks

Scan for browser alert calls in client components:
```bash
npx ripgrep "alert\(" apps/web/components apps/web/app
```

Scan for dead links:
```bash
npx ripgrep "href=[\"']#[\"']" apps/web
```

Scan for placeholder text:
```bash
npx ripgrep -i "coming soon|lorem ipsum" apps/web/components apps/web/app
```

Scan for unhandled console logging in components:
```bash
npx ripgrep "console\.log\(" apps/web/components
```

### Step 3: Remediate Violations
- Replace any `alert(...)` with inline alert banners (`aria-live="polite"` or `role="alert"`), dismissible notices, or real state.
- Wire any unattached buttons or empty `onClick` handlers to real handlers and persistent state.
- Replace any hardcoded fake math with calls to canonical functions in `@paperworking/financial-engine`.

### Step 4: Run CI Test Suite
Verify that the automated No-Mock Contract test suite passes:
```bash
npm test -- apps/web/src/__tests__/no-mock-contract.test.ts
```
