# EL Series — ESLint Debt Remediation

*Spec authority for the EL dispatch series. Founder-authored, committed to `docs/spec/`. Subordinate to the `paperworking-reil` SKILL.md in all cases: where this document conflicts with the skill, the skill governs. This document does not redefine the Definition of Done — the SKILL.md's "runtime evidence only" rule is the sole DoD authority and applies to every EL dispatch.*

## Purpose

The repository carries a standing ESLint backlog (baseline captured at EL-0). This series does two things, in strict order: first **freeze** the backlog so no new violation can enter (EL-0), then **burn it down** by category and by boundary (EL-1 onward). No dispatch in this series may reduce the backlog before the ratchet in EL-0 is committed and proven to bite.

The backlog is not one problem. It is split by rule, because the two dominant rules have opposite risk and fix profiles: unused variables/imports are mechanical and bulk-safe; `@typescript-eslint/no-explicit-any` is a per-site typing decision where a wrong concrete type is worse than the `any` it replaced.

## Rule Severity Policy

Global severities in `eslint.config.mjs` (flat config; the repo is on ESLint 9 / Next 16, so all rule configuration is flat-config `files` overrides, never legacy `.eslintrc`):

- `@typescript-eslint/no-explicit-any` — **`warn` globally, permanently.** It is never set to `off`. It is promoted to `error` only on a per-path basis, and only for a path that has already been driven to zero and locked (see Per-Path Lock Policy). No agent may change the global severity of this rule.
- `@typescript-eslint/no-unused-vars` — configured with `argsIgnorePattern: '^_'`, `varsIgnorePattern: '^_'`, `caughtErrorsIgnorePattern: '^_'`. The `_` prefix is reserved for bindings that must exist positionally but are genuinely unused (e.g. `(_req, res)`). Prefixing a variable with `_` solely to silence the linter, when the variable is not structurally required, is a fake fix and is rejected on sight.

No rule in this repo may be set to `off` to reduce a count. Turning a rule off is not remediation; it is concealment.

## Ratchet Mechanism

The backlog is frozen by a regression ratchet, not by mass fixing. The mechanism is **Betterer** (`@betterer/cli` + `@betterer/eslint`), wired against the flat config. Betterer commits a `.betterer.results` baseline that records every current issue as *tolerated*, and fails CI only when the issue count rises above that baseline. Existing debt is grandfathered; new debt is blocked at zero.

The ratchet is wired into the CI lint step such that any regression above baseline fails the build. The ratchet is the objective burn-down instrument for the whole series: progress is measured as the movement of the Betterer baseline downward over time, captured from the tool's own output — never from an agent's assertion that it "cleaned some up."

If Betterer cannot integrate cleanly with the flat config, the dispatch STOPS and reports the exact failure. No agent may substitute a hand-rolled diff-lint workaround for the named mechanism without founder approval.

## Guardrails — eslint-disable and side-effect bindings

Two prohibitions apply to every dispatch in this series:

1. **No `eslint-disable`.** No agent may add an `/* eslint-disable */`, `// eslint-disable-line`, `// eslint-disable-next-line`, or a file-top disable block to hit a target count. A disabled rule is a hidden violation, not a fixed one — it is the lint equivalent of self-certification and is rejected. Reaching zero by disabling is a fake zero.

2. **No blind removal of side-effect bindings.** When clearing unused variables, a binding of the form `const x = someCall()` may not be removed on the assumption that it is dead, because `someCall()` may carry a side effect that matters. Any such candidate is collected into a list and STOPPED for founder review rather than removed. Deleting a call that mattered is a defect that a green lint count will happily hide.

## Financial-Core Carve-Out

The metrics and financial computation path is **founder-hand only** for `@typescript-eslint/no-explicit-any` remediation. No agent dispatch may replace `any` with a concrete type inside, or across the typed boundary of:

- `reiMetrics.ts`,
- `deriveAllProjectMetrics` and everything it calls,
- the shared amortization utility, and any Fund-plane computation engine (debt service, equity splits, preferred-return accruals, waterfall distributions, sources-and-uses reconciliation).

Rationale: per SKILL.md rule 5, all metric math lives in one engine, and per rules 9, the golden values (NOI $12,486 · Cap 4.5% · CF −$4,444 · DSCR 0.74 · CoC −7.41%) must remain reproducible from a live call. A wrong concrete type on a financial value is a silent money bug, not a lint nit — false confidence in the exact place the product can least afford it. If a dispatched directory imports from or feeds this path such that clearing its `any`s would require typing a financial value, the dispatch STOPS and reports; that work is reserved for the founder and locked by the same per-path mechanism once done by hand.

## Per-Path Lock Policy

`any` is burned down by boundary, not at random. A directory is cleared to zero, then locked: a flat-config `files` override in `eslint.config.mjs` promotes `@typescript-eslint/no-explicit-any` to `error` **for that path only**, while the global severity stays `warn`. Cleared ground is never silently re-contaminated — a new `any` in a locked path fails the build. Each EL-2-shaped dispatch names exactly one non-financial directory, clears it, and lands its lock in the same PR.

Permitted replacements are correct concrete types inferable from surrounding usage. The following are **not** permitted as a way to hit zero: `as any`, `as unknown as T`, blanket `unknown`, or an `eslint-disable`. Where the correct type is not unambiguous from the code in front of the agent, the agent STOPS and proposes the type for founder approval rather than guessing.

## Dispatch Sequence

- **EL-0** — Ratchet + rule split. Installs and wires Betterer, commits the baseline, applies the Rule Severity Policy config, wires CI. Fixes nothing. Proves the ratchet bites (introduce one `any`, show CI fails; revert, show it passes).
- **EL-1** — Mechanical unused sweep. `eslint-plugin-unused-imports` auto-removal, plus `_`-prefixing of genuinely structural bindings only. Honors the side-effect STOP gate. Gated behind EL-0 merged and a clean tree.
- **EL-2 (repeatable)** — Bounded `any` cleanup of ONE named non-financial directory, then lock per the Per-Path Lock Policy. Honors the Financial-Core Carve-Out and the type STOP gate. Re-run per boundary, outward from the safe directories.

## Operational Notes

- The EL-1 repo-wide `--fix` sweep runs in its own PR touching nothing else, timed immediately after a merge point while the tree is quiet, to avoid conflicting with concurrent forked work in a second checkout.
- Reading-proof for every EL dispatch quotes verbatim the relevant block above **and** the SKILL.md Definition-of-Done rule. A dispatch that cannot locate its quoted canon STOPS.
