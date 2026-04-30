@AGENTS.md

---

# Lead Architect Rules — PaperWorking App (Next.js 16)

These rules are binding for ALL agent calls (Claude Code, Antigravity, Cursor, Windsurf, CI).
No exceptions without an explicit override comment in `.agents/handoff.md`.

## 1. Build Invocation

Every build MUST be launched with an elevated heap limit:

```bash
export NODE_OPTIONS="--max-old-space-size=8192"
npm run build
```

Never invoke `next build` directly without this export. If a CI pipeline or script
calls `npm run build`, the `NODE_OPTIONS` export must precede it in the same shell session.

The `package.json` build script also sets `--max-old-space-size=4096` internally as a
safety floor. The environment variable takes precedence — 8192 MB is the effective cap.

## 2. Middleware & Auth — proxy.ts is the Single Source of Truth

- All middleware logic (auth guards, redirects, session validation) lives in
  [`src/proxy.ts`](src/proxy.ts).
- Do NOT add auth logic to individual route files or `middleware.ts` unless it is
  calling a helper defined in `proxy.ts`.
- When modifying `proxy.ts`, run `npm run lint` and `npm run build` to confirm no
  regressions before committing.

## 3. Build Hang Recovery Protocol

If a build produces no stdout/stderr for **120 consecutive seconds**:

1. Kill the build process.
2. Dump the last 50 lines of `dmesg` to check for OOM kills:
   ```bash
   dmesg | tail -50
   ```
3. Clear the Next.js cache (Turbopack locks files — strip permissions first):
   ```bash
   chmod -R u+rwx .next && rm -rf .next
   ```
4. Retry with Turbopack disabled:
   ```bash
   TURBOPACK=0 NODE_OPTIONS="--max-old-space-size=8192" npm run build
   ```
5. If the safe build also hangs, escalate: document the failure in `.agents/handoff.md`
   and halt — do not loop indefinitely.

## 4. OOM Escalation Threshold

| Symptom | Action |
|---|---|
| Build completes within heap | No action |
| `dmesg` shows OOM kill | Increase `--max-old-space-size` to `12288` and retry once |
| Second OOM kill | Split build: audit dynamic imports and move heavy deps to `serverExternalPackages` in `next.config.ts` |
| Repeated failures | Document in `.agents/handoff.md`, notify human engineer |

## 5. SSL & DNS — Pre-Production Checklist

Before any production domain switch or deploy:

- [ ] SSL certificate valid and not expiring within 14 days (`openssl s_client -connect <domain>:443`)
- [ ] DNS propagation confirmed in all target regions (`dig +short <domain>` from at least 2 resolvers)
- [ ] Firebase App Hosting backend health check passes
- [ ] `__session` cookie set correctly on auth flow (check Network tab — HttpOnly, Secure, SameSite=Strict)

Do not recommend a cutover until all four items are checked.

## 6. General Agent Etiquette

- Read `.agents/handoff.md` at the start of every session.
- Write a summary to `.agents/handoff.md` when leaving an incomplete or complex task.
- Do not blindly overwrite another agent's work — read the file first.
- Lint and type-check before finalizing any modification (`npm run lint && tsc --noEmit`).

