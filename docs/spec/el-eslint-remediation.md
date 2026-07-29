# EL Series — ESLint Debt Remediation (v2, amended)

*Spec authority for the EL dispatch series. Founder-authored, committed to `docs/spec/`. Subordinate to the `paperworking-reil` SKILL.md in all cases: where this document conflicts with the skill, the skill governs. This document does not redefine the Definition of Done — the SKILL.md's "runtime evidence only" rule is the sole DoD authority for every EL dispatch.*

*v2 (2026-07-28): the ratchet mechanism is amended from Betterer to ESLint native bulk suppressions, following an evidenced upstream failure in `@betterer/betterer` v6 (internal path-replacement invariant crash on quote-wrapped strings in ESLint messages). The severity policy is amended to a total freeze. Both amendments are founder rulings; this committed document is their only authoritative form. No chat instruction, agent inference, or prior version of this file governs where it conflicts with v2.*

## Purpose

The repository carries a standing ESLint backlog. This series does two things, in strict order: first **freeze** the backlog so no new violation of any kind can enter (EL-0R), then **burn it down** by category and by boundary (EL-1 onward). The backlog is not one problem: unused variables/imports are mechanical and bulk-safe; `@typescript-eslint/no-explicit-any` is a per-site typing decision where a wrong concrete type is worse than the `any` it replaced.

## Severity Policy — Total Freeze

Bulk suppressions capture **errors only**. A rule left at `warn` is therefore outside the ratchet: its violations neither enter the baseline nor fail the build, and new ones leak in silently. Accordingly:

- **Every active lint rule in `eslint.config.mjs` is set to `error`.** No rule runs at `warn`. The warn tier is retired for this repo: a rule either matters enough to fail the build (error, suppressible via the baseline) or it is deliberately not enforced (`off`, founder-approved only).
- `@typescript-eslint/no-unused-vars` carries `argsIgnorePattern: '^_'`, `varsIgnorePattern: '^_'`, `caughtErrorsIgnorePattern: '^_'`. The `_` prefix is reserved for bindings that must exist positionally but are genuinely unused. Prefixing solely to silence the linter is a fake fix, rejected on sight.
- No agent may change any rule's severity or set any rule to `off`. Severity is founder-hand configuration. Turning a rule off to reduce a count is concealment, not remediation.
- The react-hooks rule family (`react-hooks/exhaustive-deps` and kin) is explicitly inside the freeze: its findings are frequently live bugs (stale closures, dependency drift), and it gets no exemption.

*(This supersedes v1's warn-globally policy for `no-explicit-any`. The v1 Per-Path Lock Policy is retired as a mechanism — under total freeze, every path is locked with a tolerated baseline — but its burn-down sequencing survives below.)*

## Ratchet Mechanism — Native Bulk Suppressions

The freeze is implemented with ESLint's first-party bulk suppressions (requires ESLint ≥ 9.24):

- `npx eslint . --suppress-all` generates **`eslint-suppressions.json`**, recording every current violation as tolerated. This committed file **is** the EL backlog. It is generated once at EL-0R and thereafter only shrinks.
- **The suppress flag is never combined with `--fix`.** Baseline generation is a freeze operation; autofixing is remediation work belonging to EL-1 and its side-effect STOP gate. Running them together in one pass is a named process violation.
- The gate: `npm run lint` runs `eslint .`. With suppressions active, the backlog passes and any **new** violation — any rule, any file — fails. CI runs `eslint . --pass-on-unpruned-suppressions` so already-fixed entries never block a build.
- Burn-down: remediation dispatches fix violations, then run `npx eslint . --prune-suppressions`; the shrinking of `eslint-suppressions.json` (its committed diff) is the objective progress instrument for the entire series. Progress is never an agent's assertion.
- `--suppress-rule <name>` scoping may be used in later dispatches to baseline-manage a single rule; `--suppress-all` is EL-0R-only.

## Guardrails — eslint-disable and side-effect bindings

1. **No `eslint-disable`.** No agent adds `/* eslint-disable */`, `// eslint-disable-line`, `// eslint-disable-next-line`, or file-top disable blocks, ever, for any count. The suppressions file is the only tolerance mechanism in this repo. A disable comment is a hidden violation — lint self-certification — rejected on sight.
2. **No blind removal of side-effect bindings.** An unused `const x = someCall()` may not be removed on the assumption it is dead; `someCall()` may carry a side effect. Every such candidate is listed and STOPPED for founder review. Deleting a call that mattered is a defect a green lint count will happily hide.

## Evidence Integrity (applies to every EL bundle)

- Every submission includes the **full, unfiltered** `git status --porcelain` and complete `git diff --stat` of the working tree. A filtered or curated status presented as the status is a named process violation of the same class as jest-output-as-runtime-evidence.
- Baselines and prechecks are captured **before** any configuration or code change in the same session, and the capture order is stated in the bundle.
- A claim in a bundle that is contradicted by the bundle's own tool output (e.g., "all rules at error" alongside surviving warnings) invalidates the bundle.

## Financial-Core Carve-Out

The metrics and financial computation path is **founder-hand only** for `@typescript-eslint/no-explicit-any` remediation. No agent dispatch may replace `any` with a concrete type inside, or across the typed boundary of: `reiMetrics.ts`; `deriveAllProjectMetrics` and everything it calls; the shared amortization utility; any Fund-plane computation engine (debt service, equity splits, preferred-return accruals, waterfall distributions, sources-and-uses reconciliation).

Rationale: per SKILL.md rule 5, all metric math lives in one engine, and per rule 9, the golden values (NOI $12,486 · Cap 4.5% · CF −$4,444 · DSCR 0.74 · CoC −7.41%) must remain reproducible from a live call. A wrong concrete type on a financial value is a silent money bug — false confidence exactly where the product can least afford it. If a dispatched directory feeds this path such that clearing its `any`s would require typing a financial value, the dispatch STOPS and reports; that work is founder-reserved.

## Burn-Down Sequencing

`any` remediation proceeds by boundary, not at random: each EL-2-shaped dispatch names exactly ONE non-financial directory, replaces each `any` with the correct concrete type inferable from surrounding usage, prunes the suppressions file, and commits the shrunken baseline in the same PR. Not permitted as a way to clear an entry: `as any`, `as unknown as T`, blanket `unknown`, or any disable comment. Where the correct type is not unambiguous from the code in front of the agent, the agent STOPS and proposes the type for founder approval rather than guessing.

## Dispatch Sequence

- **EL-0R** — Ratchet under v2. Verifies/repairs working-tree integrity from the prior run, applies the Severity Policy founder-verified, generates the suppressions baseline (no `--fix`), wires the lint script and CI gate, proves the ratchet bites on a new violation of an error-tier rule AND a formerly-warn-tier rule, then removes all scratch. Fixes nothing.
- **EL-1** — Mechanical unused sweep: `eslint-plugin-unused-imports` auto-removal plus `_`-prefixing of genuinely structural bindings only; honors the side-effect STOP gate; ends with `--prune-suppressions` and a committed baseline shrink. Gated behind EL-0R merged and a clean, quiet tree (own PR, straight after a merge point, coordinated around the concurrent second checkout).
- **EL-2 (repeatable)** — Bounded `any` cleanup of ONE named non-financial directory per the Burn-Down Sequencing rules.

## Operational Notes

Reading-proof for every EL dispatch quotes verbatim the relevant v2 block(s) above **and** the SKILL.md Definition-of-Done rule. A dispatch that cannot locate its quoted canon in the committed file STOPS. Spec content comes from the founder only; an agent edit to this file, however sensible, does not stand and is reverted.
