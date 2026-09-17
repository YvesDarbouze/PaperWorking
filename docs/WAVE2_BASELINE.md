# Wave 2 Authoritative Baseline (`docs/WAVE2_BASELINE.md`)

**Date:** 2026-09-14  
**Cut Point:** `integration/wave-2` cut from `integration/wave-1` at HEAD commit [`c3761a3f1f07ba578715f1d13cc1e0c0b13efbbb`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1)  
**Parent Integration Commit:** `bf5a656` (`feat(integration): finalize wave 1 integration merge gate — extended cross-lane smoke and guarded admin impersonation`)  
**Operating Lane:** `lane/w2-00-scaffold`  
**Merge Target:** `integration/wave-2`  

---

## 1. Regression Floor Baseline

| Workspace | Test Suites | Tests | Status |
|---|---|---|---|
| `@paperworking/api` | 67 | 522 | PASS |
| `@paperworking/web` | 126 | 1,067 | PASS |
| `@paperworking/database` | 10 | 41 | PASS |
| `@paperworking/financial-engine` | 7 | 72 | PASS |
| `@paperworking/shared` | 0 (passWithNoTests) | 0 | PASS |
| `@paperworking/validation` | 2 | 53 | PASS |
| `@paperworking/integration` | 6 | 14 | PASS |
| **TOTAL** | **218** | **1,769** | **ALL PASS (0 failures)** |

**Authoritative Floor Contract:**  
- **Suites Floor:** $\ge 218$ suites  
- **Tests Floor:** $\ge 1,731$ tests (Wave 1 baseline floor); actual baseline is **1,769** tests.  
- **Regression Policy:** No Wave 2 mission may merge with totals falling below this floor.

---

## 2. Verbatim Verification Outputs (`npm run verify`)

### A. CI Guardrails & Gitignore
```text
> paperworking-migration@0.1.0 check:gitignore
> node scripts/check-gitignore.mjs

Verifying .gitignore coverage for ephemeral data paths...
✓ Ignored: apps/web/.data/ (matched rule: apps/web/.data/)
✓ Ignored: apps/web/.data/calculator-snapshots.json (matched rule: apps/web/.data/calculator-snapshots.json)
✓ Ignored: .data/ (matched rule: .data/)
✓ Ignored: .data/test.json (matched rule: .data/test.json)

[PASS] All required data paths are strictly ignored by git.

> paperworking-migration@0.1.0 check:guardrails
> node scripts/check-ci-guardrails.mjs

Running CI Security Guardrails...
1. Verifying NEXT_PUBLIC_ allowlist...
✓ All NEXT_PUBLIC_ variables conform to the approved allowlist (16 approved).
2. Scanning client bundle and components for secret leak patterns...
✓ Zero forbidden secret shapes detected in client bundles and components.

[PASS] All CI security guardrails verified successfully.
```

### B. Workspace Test Suite Totals
```text
@paperworking/api:
Test Suites: 67 passed, 67 total
Tests:       522 passed, 522 total
Snapshots:   0 total
Time:        5.021 s

@paperworking/web:
Test Suites: 126 passed, 126 total
Tests:       1067 passed, 1067 total
Snapshots:   0 total
Time:        22.428 s

@paperworking/database:
Test Suites: 10 passed, 10 total
Tests:       41 passed, 41 total
Snapshots:   0 total
Time:        1.134 s

@paperworking/financial-engine:
Test Suites: 7 passed, 7 total
Tests:       72 passed, 72 total
Snapshots:   0 total
Time:        0.8 s

@paperworking/shared:
No tests found, exiting with code 0 (passWithNoTests)

@paperworking/validation:
Test Suites: 2 passed, 2 total
Tests:       53 passed, 53 total
Snapshots:   0 total
Time:        0.5 s

@paperworking/integration:
Test Suites: 6 passed, 6 total
Tests:       14 passed, 14 total
Snapshots:   0 total
Time:        2.197 s
```

### C. Next.js Production Build
```text
> @paperworking/web@0.1.0 build
> next build

   ▲ Next.js 15.5.23

   Creating an optimized production build ...
 ✓ Compiled successfully in 12.3s
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (91/91) ...
 ✓ Generating static pages (91/91)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                              Size  First Load JS
91 App Router routes compiled cleanly.
+ First Load JS shared by all                          103 kB
ƒ Middleware                                            33 kB

○ (Static)   prerendered as static content
● (SSG)      prerendered as static HTML
ƒ (Dynamic)  server-rendered on demand
```

### D. Verification Summary Tail
```text
> @paperworking/database@0.1.0 prebuild
> npm run generate

> @paperworking/database@0.1.0 generate
> prisma generate --config prisma.config.ts

Loaded Prisma config from prisma.config.ts.
Prisma schema loaded from prisma/schema.prisma.
✔ Generated Prisma Client (v7.9.1) to ./generated/client in 608ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

> @paperworking/database@0.1.0 build
> tsc -p tsconfig.json && node -e "const fs=require('fs'); fs.cpSync('generated', 'dist/generated', { recursive: true });"

> @paperworking/financial-engine@0.1.0 build
> tsc -p tsconfig.json

> @paperworking/shared@0.1.0 build
> tsc -p tsconfig.json

> @paperworking/validation@0.1.0 build
> tsc -p tsconfig.json

The command exited with code 0.
```
