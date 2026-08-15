# EM Series v2 — Transactional & Correspondence Email Build Pack

**Author:** Founder (Yves Darbouze / Tell) · **Target agent:** Antigravity  
**Provider:** Twilio SendGrid · **Intended commit path:** `docs/spec/em-series-transactional-email-prompts.md`  
**Status:** RATIFIED & COMMITTED — governing over any conflicting email, sender, or template content elsewhere in the repository.  
**Gates:** E-1…E-12 ratified 2026-08-14.  
**Supersedes:** EM Series v1 in its entirety. v1 was written from general knowledge; v2 is written against the vendor documentation and corrects v1 in nine places, listed in §0.3.  

This pack inherits `SKILL.md` (paperworking-reil) in full. Where anything here conflicts with `SKILL.md` or `docs/spec/reil-complete-four-phase-questions-tasks.md`, those govern and the conflict is reported, never reconciled by the agent.

---

## 0. Verified provider facts

Everything in this section was read from vendor documentation, not recalled. It is here so Antigravity builds against the platform's real behavior rather than a plausible description of it. Where a fact carries a design consequence, the consequence is stated as binding.

### 0.1 SendGrid

| # | Verified fact | Source | Binding consequence |
|---|---|---|---|
| **F-1** | Domain authentication with Automated Security publishes **CNAME** records: a return-path subdomain delegated to SendGrid plus two DKIM selector CNAMEs (`s1`/`s2`) that SendGrid rotates on our behalf. With Automated Security off, you get TXT + MX instead and own key rotation yourself. Underscores in CNAMEs are required; DNS providers that reject underscores cannot use Automated Security. | twilio.com/docs/sendgrid/ui/account-and-settings/how-to-set-up-domain-authentication | Automated Security **stays on**. We do not hand-manage DKIM rotation. EM-2 verifies the CNAMEs resolve, not TXT records. |
| **F-2** | SendGrid selects which authenticated domain signs a message by **matching the domain of the From address**. No match → it falls back to the default authenticated domain → failing that, `sendgrid.net`. | twilio.com/docs/sendgrid/ui/account-and-settings/troubleshooting-sender-authentication | Every From address must be `@mail.paperworking.co`. A From on the root domain silently downgrades to `sendgrid.net` signing and breaks DMARC alignment. This is an acceptance check, not a style note. |
| **F-3** | The v3 Mail Send API **rejects the request** if `text/html` appears before `text/plain` in the `content` array. Order is enforced by the API. | github.com/sendgrid/sendgrid-python#451; deepwiki sendgrid-php content ordering | The plain-text mandate is enforced by the vendor, not only by us. A missing or misordered text part is a 400, not a degraded send. |
| **F-4** | A successful send returns **202 Accepted with an empty body**. Sandbox mode (`mail_settings.sandbox_mode.enable`) validates the payload without sending and returns **200**. | twilio.com/docs/sendgrid/api-reference/mail-send/mail-send; captaindns technical guide | 202 means *accepted for processing*. It is not delivery and must never be recorded, logged, or reported as delivery. Sandbox mode is the test transport for CI. |
| **F-5** | `bypass_list_management` overrides **all** suppression lists and is **mutually exclusive** with the granular filters. Its mere presence in the payload — even set to `false` — triggers a mutual-exclusivity error alongside any granular filter. The granular filters are `bypass_unsubscribe_management`, `bypass_bounce_management`, `bypass_spam_management`. | twilio.com/docs/sendgrid/ui/sending-email/index-suppressions; github.com/sendgrid/docs#6549 | **`bypass_list_management` is forbidden in this codebase.** Class `E` mail uses `bypass_unsubscribe_management: true` alone. Bypassing bounce or spam suppression is never permitted — mailing a hard-bounced or complaining address is how a sending domain dies. |
| **F-6** | Unsubscribe groups (ASM) require **both** `asm.group_id` and `asm.groups_to_display` in the send payload; without a group id passed, the unsubscribe link does not populate. | support.sendgrid.com — How to Use ASM Tags | Group ids are configuration, registered per catalog key, not literals scattered through call sites. |
| **F-7** | Gmail/Yahoo bulk-sender rules: the **DMARC policy requirement and one-click unsubscribe requirement apply only to bulk senders** (5,000+/day to those providers); the remaining requirements apply to all senders. Transactional mail is excluded from one-click unsubscribe. Spam-complaint ceiling is **0.3%**, with 0.1% or lower encouraged. | sendgrid.com/en-us/blog/gmail-yahoo-updates-faq | PaperWorking is almost certainly below the bulk threshold today. We implement DMARC and RFC 8058 anyway, but EM-24 reports our actual daily volume to Gmail rather than assuming compliance urgency. The 0.3% complaint ceiling is the Sentry alert threshold. |
| **F-8** | RFC 8058 one-click requires **`List-Unsubscribe` followed by `List-Unsubscribe-Post`**, in that order, and the unsubscribe must complete without a further page or login. | aws.amazon.com/blogs/messaging-and-targeting — one-click unsubscribe | Header order is verifiable in received-message headers and is an EM-4 acceptance criterion. |
| **F-9** | The Event Webhook signs with **ECDSA, not HMAC**. Headers: `X-Twilio-Email-Event-Webhook-Signature` and `X-Twilio-Email-Event-Webhook-Timestamp`. Verification concatenates timestamp + **raw request bytes**; re-serialized JSON will not verify. Events arrive **batched as a JSON array**. | twilio.com/docs/sendgrid/for-developers/tracking-events/getting-started-event-webhook-security-features | EM-10 must capture the raw body before any JSON parsing — in Next.js App Router this means reading the request body as text/bytes first. Parsing then re-stringifying is the standard way this fails. |
| **F-10** | Event Webhook posts in batches roughly every 30 seconds or 768 KB, and **retries for 24 hours** on failure. | captaindns technical guide | The endpoint must be idempotent and must return 2xx fast. Slow handlers create duplicate event storms, not just latency. |
| **F-11** | **Inbound Parse has no signature verification** — unlike the Event Webhook. It POSTs `multipart/form-data`. The receiving host needs an MX record to `mx.sendgrid.net` (priority 10) and **must be one of your authenticated domains**; SendGrid recommends exactly one MX record on that host. Failed POSTs retry on 5XX; respond 2xx to stop retries. 30 MB total size limit. | twilio.com/docs/sendgrid/for-developers/parsing-email/inbound-email; lobehub sendgrid-inbound skill | **The relay endpoint is unauthenticated by the vendor.** Anyone who learns the URL can POST a forged inbound email with any From address. EM-18 must authenticate on the opaque token in the *To* address and never trust the From. This is the single highest-risk surface in the pack. |
| **F-12** | Categories: max **10 per message**; SendGrid recommends ~100 total unique, retains top 100 (free) / 1,000 (paid), and deletes on a 7-day rolling basis. Category values must be strings. | twilio.com/docs/sendgrid/for-developers/sending-email/categories | Categories are coarse grouping (class, product area). They are not per-user or per-entity identifiers. |
| **F-13** | `custom_args` total must be under **10,000 bytes**, and SendGrid explicitly states this data is **not treated as PII**, may be visible to Twilio employees, is stored long-term, and cannot be redacted or removed. | twilio.com/docs/sendgrid/for-developers/sending-email/unique-arguments | **No PII in `custom_args`, ever.** No email address, no name, no property address, no Project name, no user id that resolves to a person in our system. An opaque send-record id and the catalog key only. |
| **F-14** | `send_at` cannot schedule more than **72 hours** ahead. Per-request caps: 1,000 recipients, 30 MB total. | twilio.com/docs/sendgrid/api-reference/mail-send/mail-send | Quiet-hours deferral schedules inside our own queue, not via `send_at`, so the 72-hour ceiling and the weekly digest cadence never collide. |
| **F-15** | Link branding requires two additional CNAMEs and rewrites tracked links to our domain. | twilio.com/docs/sendgrid — link branding; captaindns guide | `link.paperworking.co` per E-2. Branded links are required wherever click tracking is on, and click tracking is off for class `E`. |

### 0.2 Stripe and Firebase

| # | Verified fact | Source | Binding consequence |
|---|---|---|---|
| **F-16** | Stripe's failed-payment customer emails are toggled at **Settings → Billing → Subscriptions and emails**, in the *Manage failed payments for subscriptions* and *Manage invoices sent to customers* sections. | docs.stripe.com/invoicing/automatic-collection | EM-13 evidences the exact toggle state with a screenshot. E-4's "one owner per message type" is verifiable, not assertable. |
| **F-17** | Smart Retries chooses retry timing by model, and the `next_payment_attempt` attribute on the invoice tells you when Stripe will try again. Stripe does not retry non-retryable decline codes. | docs.stripe.com/invoicing/automatic-collection; stripe.com/docs/billing/revenue-recovery/smart-retries | **PaperWorking's dunning ladder must read `attempt_count` and `next_payment_attempt` from the Stripe invoice.** It may not invent a schedule, count attempts itself, or state a retry date Stripe did not supply. A dunning email promising a retry that never happens is an Honesty Rule violation with a billing consequence. |
| **F-18** | Firebase Admin SDK exposes `generateEmailVerificationLink()`, `generatePasswordResetLink()`, and `generateSignInWithEmailLink()`, letting us produce the action link server-side and deliver it through our own provider. | firebase.google.com/docs/auth/admin/email-action-links | This is the resolution to the two-senders problem: Firebase mints the link, SendGrid delivers the message. |
| **F-19** | Client-side `sendPasswordResetEmail()` and similar dispatch Firebase's **own** mail through Firebase's built-in email service, using templates edited in the Firebase Console. Password reset links expire after one hour. | firebase.google.com/docs/auth/admin/email-action-links; rapidevelopers Firebase reset tutorial | Every client-side call site must be removed, or Firebase keeps sending unbranded mail in parallel forever. EM-12 proves removal by grep, not by assertion. |
| **F-20** | Firebase **email enumeration protection** (Console → Authentication → Settings) makes reset requests succeed silently for unknown addresses rather than throwing `auth/user-not-found`. | rapidevelopers Firebase reset tutorial | Keep it on, and make the in-app confirmation copy generic regardless of whether the address exists. Leaking account existence through a reset form is a real disclosure. |
| **F-21** | Using custom email templates with a non-default landing page requires a hosted **custom email action handler** page that reads `mode`, `oobCode`, `apiKey`, `continueUrl`, `lang` and completes the action. | firebase.google.com/docs/auth/custom-email-handler | If EM-12 sends branded mail pointing at PaperWorking URLs, the handler page is part of that dispatch, not a later surprise. |

### 0.3 What v2 corrects in v1

1. v1 treated the plain-text requirement as our own discipline. It is **API-enforced** (F-3).
2. v1 said "verify the webhook signature" generically. It is **ECDSA over raw bytes**, and the most common failure is parsing first (F-9).
3. v1 was silent on Inbound Parse having **no signature verification** (F-11) — the relay design in v1 was unsafe.
4. v1 said class `E` messages get a narrowly-scoped suppression bypass. The correct mechanism is `bypass_unsubscribe_management` alone, and `bypass_list_management` is **forbidden**, including as an explicit `false` (F-5).
5. v1 put "message key, class, entity type" in `custom_args` without noticing SendGrid's **non-PII warning** (F-13).
6. v1 specified a three-step dunning ladder as if PaperWorking owned the schedule. Stripe owns the schedule; we **read** `attempt_count` and `next_payment_attempt` (F-17).
7. v1 called Gmail/Yahoo one-click unsubscribe a blanket requirement. It applies to **bulk senders**, and transactional mail is excluded (F-7). We still implement it for class `C`.
8. v1 did not state that SendGrid picks the signing domain from the **From domain** (F-2) — the most likely cause of a "verified but still `via sendgrid.net`" failure.
9. v1 left template rendering location unruled. §3 Rule 12 now rules it, on spec-authority grounds.

---

## 1. Blocking spec conflicts

| ID | Conflict | Required action |
|---|---|---|
| **SC-1** | `SKILL.md` → *Working discipline → What-not-how* names the sanctioned stack including **Resend**. SendGrid is not in the constitution. Any SendGrid code landed before amendment builds against a spec that forbids it. | Founder-hand `SKILL.md` amendment. Commit before EM-3 unlocks. |
| **SC-2** | `SKILL.md` names "Next.js 15." Forensics confirmed **16.2.3** since scaffold on 2026-04-10. | Same amendment pass. |
| **SC-3** | Marketplaces route architecture and logged-out gating are in flight in the **CD Series v2** pack, gates D-1…D-9 unresolved. EM-16…EM-18 depend on final routes, object names, and gating. | Resolve CD v2 D-series, or accept that EM-16…EM-18 dispatch last. **`docs/spec/da-series-v2-analyzer-marketplace-email.md` is NOT the CD v2 pack** — that is DA Series, Deal Analyzer. See SC-5. |
| **SC-4** | Resend may be live and sending alongside SendGrid on the same domain. | **RESOLVED** by E-1: full cutover, Resend removed in EM-3. Closes when EM-3 evidences removal. |
| **SC-5** | A repo document named `da-series-v2-analyzer-marketplace-email.md` carries "email" in its filename, contains no D-series gates and no EM- references, and predates this pack. An unadjudicated rival email spec in `docs/spec/` is the `reil-phases.md` situation repeating. | **BLOCKS EM-1.** Agent runs provenance forensics only. Founder returns one of three verdicts: founder-hand and governing; founder-hand and superseded by EM Series; agent-authored and quarantined to `docs/archive/`. |

---

## 2. Ratified founder gates

All twelve ratified founder-hand **2026-08-14**. Binding spec, not guidance. Rulings marked *refined* changed on documentation review; the ratified intent is unchanged.

| Gate | Ruling | Note |
|---|---|---|
| **E-1** | **Full cutover to SendGrid.** Resend is deleted in EM-3 — integration, call sites, env vars, dependency. Not flagged off. Reversibility lives in the EM-3 interface, in code, never in DNS. | |
| **E-2** | `mail.paperworking.co` — transactional sending, authenticated with Automated Security ON. `link.paperworking.co` — link branding. `reply.paperworking.co` — Inbound Parse relay, its own MX to `mx.sendgrid.net` at priority 10, and the **only** MX on that host. `news.paperworking.co` — reserved, unauthenticated until marketing sending begins. **Root `paperworking.co` sends nothing.** | *Refined:* the relay host is separate from the sending host (F-11 requires an MX; the sending host carries CNAMEs). |
| **E-3** | **No `no-reply@` exists anywhere.** Category From addresses, all `@mail.paperworking.co`: `security@`, `billing@`, `team@`, `notifications@`. Reply-To on non-marketplace mail is the monitored `hi@paperworking.co`. Marketplace mail uses the E-7 relay. | *Refined:* From **must** be on the authenticated sending subdomain or SendGrid falls back to `sendgrid.net` signing (F-2). |
| **E-4** | **Split ownership, one owner per type.** Stripe sends `BILL-INVOICE-RECEIPT` and `BILL-REFUND-ISSUED` only; both are struck from our catalog and never built. PaperWorking owns everything else. **Stripe's failed-payment and renewal-reminder customer emails are switched OFF** at Settings → Billing → Subscriptions and emails. | *Refined:* our ladder reads Stripe's `attempt_count` and `next_payment_attempt` rather than inventing a schedule (F-17). |
| **E-5** | **Shared IP.** A dedicated IP needs sustained volume to stay warm; idle, it is a liability. Deliberate departure from the founder's source material, which is right for scaled senders and wrong here. E-2's subdomain split provides the isolation that matters now. Revisit at volume — never on agent initiative. | |
| **E-6** | **No usage-limit email ships until per-tier numeric ceilings are committed spec.** EM-21 blocked. Limits may not be inferred from Stripe metadata, price objects, comments, seed data, or the pricing page. | Ratifies the rule; does not supply numbers (OI-1). |
| **E-7** | **Masked relay for first contact.** `reply+<opaque-token>@reply.paperworking.co`, per-thread, revocable, expiring with the thread. Real addresses exchange only on mutual acceptance of an engagement or logged LOI. | *Refined:* because Inbound Parse is unauthenticated (F-11), the token in the **To** address is the only trusted identifier. The From on an inbound message is unverified input. |
| **E-8** | **Weekly, Monday 07:00 recipient-local, ON by default, one-click off**, for both digests. An empty digest is skipped, never sent. | *Refined:* deferral is queue-side; `send_at` caps at 72 hours (F-14). |
| **E-9** | **v1 is category toggles only.** Per-Project mute is v2 and out of scope. | |
| **E-10** | **Founder-supplied postal address string** in the footer of every class `C` message. Never invented, inferred, or placeholdered. | Class `C` blocked pending OI-2. |
| **E-11** | **Every Reply-To reaches a monitored human inbox or a working relay.** A silently unmonitored `support@` is worse than `no-reply@` — it swallows replies while promising otherwise. | EM-4 gated on OI-3. |
| **E-12** | **Deal Marketplace follower updates are commercial (class `C`).** Consent, RFC 8058 one-click, postal address, provenance line. | *Refined:* one-click is not legally forced on us below bulk-sender volume (F-7). We do it anyway; complaint rate is the reputation signal that matters. |

### 2.1 Founder inputs owed

| ID | Owed | Gate | Blocks |
|---|---|---|---|
| **OI-1** | Per-tier numeric usage ceilings, committed to spec. | E-6 | §4.7 `LIMIT-*`; EM-21 |
| **OI-2** | The literal CAN-SPAM postal address string. | E-10 | All class `C`: `DEAL-MKT-DEAL-UPDATE`, both `ONBOARD-*`. EM-16 and EM-22 build but cannot ship. |
| **OI-3** | Written confirmation that `hi@paperworking.co` exists, who monitors it, expected response window. | E-3, E-11 | EM-4 does not begin. |
| **OI-4** | Founder copy for the keys listed as owed at the end of §5. | — | Those keys ship no sooner than the copy. |

---

## 3. Global Rules Block

Carried by every dispatch. Violation is a rejection condition, not a review note.

1. **Constitution first.** `SKILL.md` governs. Brand casing is `PaperWorking`. Phase labels are `Acquisition`, `Fund`, `Hold`, `Exit` — identically in subject lines, preheaders, body, and alt text. "Closing," "Hold & Rehab," "Purchase" are defects on sight.
2. **Honesty Rule in the inbox.** No email displays a metric the engine could not compute. Missing inputs render as an explicit unrecorded-input state deep-linking to the collecting card — never zero, never a dash implying zero, never an estimate. `Projected` and actual are never visually conflated.
3. **Single-function rule.** No mailer, template, job, or serializer computes a metric. Values arrive from `deriveAllProjectMetrics` or the named Fund-plane engines. Inline math in a mailer is the same defect as inline math in a component.
4. **Money-movement prohibition.** No email contains, implies, or links to payments, escrow, wiring, KYC/AML, accreditation, or fund pooling — Deal Marketplace above all. Subscription billing to PaperWorking is the sole exception and is plainly PaperWorking-as-vendor, never investor capital.
5. **No fabricated content.** No sample metrics, invented testimonials, placeholder addresses, or leftover example data. Seeded previews derive from `DEMO_FINANCIALS` only.
6. **Plain text is mandatory and API-enforced.** Every message carries a genuine `text/plain` part, ordered before `text/html` (F-3). Tag-stripped HTML is not a plain-text alternative. It reads as prose with bare URLs on their own lines.
7. **One decision per email.** One primary CTA. Secondary links limited to help, preference center, unsubscribe where applicable, and legal footer. No cross-sell, no navigation bar.
8. **Styling authority is the UX-0 token set**, compiled to an email-safe inline-style subset. CSS custom properties do not survive email clients. No ad-hoc hex, spacing, or font values in templates.
9. **Provider isolation.** No SendGrid SDK import, API key reference, or provider-shaped type outside the adapter module. This is what makes E-1 reversible.
10. **No mocks in production paths.** Mock and sandbox transports are environment-flag-gated, never a runtime fallback that silently swallows a real send.
11. **Copy is founder-owned.** §5 copy is ratified. The agent may not rewrite, polish, shorten, or A/B-vary it. Missing copy is reported as owed, never drafted.
12. **Templates render in the repo, not in the SendGrid dashboard.** Dynamic Templates put founder-owned copy in a vendor UI outside git, which contradicts *the repo is the spec authority*, defeats reading proof, and makes copy changes invisible to review. Messages are rendered in-app and sent as full `content`. ASM group ids and unsubscribe URLs are passed per-send (F-6).
13. **No PII in provider metadata.** `custom_args` and categories carry an opaque send-record id and the catalog key. No address, name, Project name, property address, or person-resolving id (F-13).
14. **202 is not delivery.** A 202 from the send API means accepted for processing (F-4). Delivery is a webhook event. The two are never conflated in logs, admin surfaces, support answers, or acceptance evidence.
15. **Runtime evidence only.** A real message, really sent, really received, screenshotted in a real client, with its `EmailEvent` row and Activity Feed entry. `tsc`, tests, builds, and self-assertion satisfy zero criteria.

---

## 4. Canonical email catalog

**Class:** `E` essential transactional — suppression-exempt only via `bypass_unsubscribe_management`, never bounce or spam. `O` optional product notification — preference-controlled. `C` commercial — consent + RFC 8058 one-click + postal address.

Agents may not add, rename, remove, or re-class a key.

### 4.1 Account & identity

| Key | Trigger | Recipient | Class | CTA |
|---|---|---|---|---|
| `ACCT-VERIFY-EMAIL` | Signup submitted | New user | E | Verify email address |
| `ACCT-WELCOME` | Verification completed | New user | E | Create your first Project |
| `ACCT-PASSWORD-RESET` | Reset requested | User | E | Reset password |
| `ACCT-PASSWORD-CHANGED` | Password changed | User | E | Secure your account |
| `ACCT-EMAIL-CHANGE-VERIFY` | New address submitted | New address | E | Confirm new address |
| `ACCT-EMAIL-CHANGE-NOTICE` | New address submitted | **Old** address | E | Reverse this change |
| `ACCT-2FA-ENABLED` | 2FA enrolled | User | E | Review security settings |
| `ACCT-2FA-DISABLED` | 2FA removed | User | E | Re-enable 2FA |
| `ACCT-NEW-DEVICE-SIGNIN` | Sign-in from unrecognized device | User | E | Review activity |
| `ACCT-DELETION-REQUESTED` | Deletion requested | User | E | Cancel deletion |
| `ACCT-DATA-EXPORT-READY` | GDPR export built | User | E | Download export |

### 4.2 Billing & subscription

| Key | Trigger | Recipient | Class | CTA |
|---|---|---|---|---|
| `BILL-SUBSCRIPTION-ACTIVE` | `customer.subscription.created` | Subscriber | E | Open your workspace |
| `BILL-PAYMENT-FAILED-EARLY` | `invoice.payment_failed`, retries remain | Subscriber | E | Update payment method |
| `BILL-PAYMENT-FINAL-NOTICE` | `invoice.payment_failed`, final attempt per Stripe | Subscriber | E | Update payment method |
| `BILL-SUBSCRIPTION-PAST-DUE` | Access restricted | Subscriber | E | Restore access |
| `BILL-CARD-EXPIRING` | Card expires within 30d | Subscriber | E | Update card |
| `BILL-RENEWAL-UPCOMING` | 7d before annual renewal | Annual subscriber | E | Review subscription |
| `BILL-PLAN-CHANGED` | Tier upgrade/downgrade | Subscriber | E | View plan |
| `BILL-CANCELED` | Cancellation scheduled | Subscriber | E | Reactivate |

**Struck at E-4 ratification — Stripe-owned, never built here:** `BILL-INVOICE-RECEIPT`, `BILL-REFUND-ISSUED`.

### 4.3 Team & vendor

| Key | Trigger | Recipient | Class | CTA |
|---|---|---|---|---|
| `TEAM-INVITE` | Lead Investor invites Investment Team member | Invitee | E | Accept invitation |
| `TEAM-INVITE-REMINDER` | 72h unaccepted, once only | Invitee | O | Accept invitation |
| `TEAM-INVITE-ACCEPTED` | Acceptance | Lead Investor | O | View team |
| `TEAM-INVITE-REVOKED` | Revocation | Invitee | E | — |
| `TEAM-ROLE-CHANGED` | Per-phase permissions changed | Member | E | View your access |
| `TEAM-REMOVED` | Member removed | Member | E | — |
| `VENDOR-INVITE` | Vendor invited to a Project | Vendor | E | Accept and view assignment |
| `VENDOR-ASSIGNMENT-CREATED` | Assignment created | Vendor | O | Open assignment |
| `VENDOR-ASSIGNMENT-UPDATED` | Scope/date changed | Vendor | O | Open assignment |
| `VENDOR-ASSIGNMENT-COMPLETED` | Vendor marks complete | Lead Investor | O | Review completion |

### 4.4 Deal Marketplace

| Key | Trigger | Recipient | Class | CTA |
|---|---|---|---|---|
| `DEAL-MKT-INTEREST-RECEIVED` | Prospect registers interest | Lead Investor | O | View interest |
| `DEAL-MKT-INTEREST-ACK` | Same event | Prospect | E | View the Deal |
| `DEAL-MKT-LOI-SUBMITTED` | Non-binding LOI logged | Lead Investor | O | Review LOI |
| `DEAL-MKT-LOI-ACK` | Same event | Submitter | E | View your submission |
| `DEAL-MKT-REPLY-RECEIVED` | Either party replies in thread | Counterparty | O | Read and reply |
| `DEAL-MKT-INTEREST-DECLINED` | Lead Investor declines | Prospect | E | Browse Deals |
| `DEAL-MKT-DEAL-UPDATE` | Lead Investor publishes update | Followers | **C** | Read update |
| `DEAL-MKT-DEAL-CLOSED` | Closed to new interest | Followers + open prospects | O | Browse Deals |

### 4.5 Vendor Marketplace

| Key | Trigger | Recipient | Class | CTA |
|---|---|---|---|---|
| `VEND-MKT-INQUIRY-RECEIVED` | Investor contacts listed Vendor | Vendor | O | Read and reply |
| `VEND-MKT-INQUIRY-ACK` | Same event | Investor | E | View your inquiry |
| `VEND-MKT-REPLY-RECEIVED` | Either party replies | Counterparty | O | Read and reply |
| `VEND-MKT-QUOTE-SUBMITTED` | Vendor submits quote | Investor | O | Review quote |
| `VEND-MKT-QUOTE-ACK` | Same event | Vendor | E | View submission |
| `VEND-MKT-ENGAGEMENT-ACCEPTED` | Investor accepts | Vendor | E | Open assignment |
| `VEND-MKT-ENGAGEMENT-DECLINED` | Investor declines | Vendor | E | — |
| `VEND-MKT-LISTING-APPROVED` | Listing approved | Vendor | E | View listing |
| `VEND-MKT-LISTING-REJECTED` | Listing rejected | Vendor | E | Edit listing |

### 4.6 Product activity

| Key | Trigger | Recipient | Class | CTA |
|---|---|---|---|---|
| `PROJ-GATE-READY` | Acquisition→Fund or Fund→Hold criteria all green from live data | Lead Investor | O | Pass the gate |
| `PROJ-PHASE-ADVANCED` | Gate passed, or Hold→Exit event fires | Lead Investor + team | O | Open the Project |
| `PROJ-CARD-ASSIGNED` | Card assigned | Assignee | O | Open card |
| `PROJ-DOC-UPLOADED` | Document added to Data Room | Watchers | O | Open Data Room |
| `PROJ-REPORT-READY` | Report / CPA package generated | Requester | E | Download report |
| `PROJ-MISSING-INPUTS-DIGEST` | Weekly, if any metric lacks inputs | Lead Investor | O | Fill the gaps |
| `PROJ-WEEKLY-PORTFOLIO-DIGEST` | Weekly | Lead Investor | O | Open Portfolio |
| `PROJ-PLAID-RECONNECT` | Plaid item requires re-auth | Lead Investor | E | Reconnect account |

### 4.7 Lifecycle & limits

| Key | Trigger | Recipient | Class | CTA |
|---|---|---|---|---|
| `LIMIT-APPROACHING` | 80% of a tier ceiling | Account owner | E | Review usage |
| `LIMIT-REACHED` | Ceiling hit | Account owner | E | Review options |
| `ONBOARD-NO-PROJECT-D2` | 2 days, zero Projects | User | **C** | Create a Project |
| `ONBOARD-STALLED-D7` | Project created, Acquisition incomplete 7d | User | **C** | Continue where you left off |

---

## 5. Ratified copy deck — Tier 1

**`ACCT-VERIFY-EMAIL`** · Subject: `Verify your email to start PaperWorking` · Preheader: `One click and your workspace is ready.` · Body: Confirm this address to activate your PaperWorking account. This link expires in 24 hours. · CTA: **Verify email address** · Footer: If you didn't create an account, you can ignore this message.

**`ACCT-WELCOME`** · Subject: `Your PaperWorking workspace is ready` · Preheader: `Start with one property. The analytics follow.` · Body: PaperWorking organizes each investment across four phases — Acquisition, Fund, Hold, and Exit. Answer questions as you go, and your metrics build themselves. Start with a single property address. · CTA: **Create your first Project**

**`ACCT-PASSWORD-RESET`** · Subject: `Reset your PaperWorking password` · Preheader: `This link expires in 60 minutes.` · Body: Use the link below to set a new password. It expires in 60 minutes and can be used once. · CTA: **Reset password** · Footer: If you didn't request this, no action is needed and your password is unchanged.

**`ACCT-PASSWORD-CHANGED`** · Subject: `Your PaperWorking password was changed` · Preheader: `If this wasn't you, act now.` · Body: The password for {email} was changed on {timestamp_local}. · CTA: **Secure your account** · No promotional footer.

**`ACCT-NEW-DEVICE-SIGNIN`** · Subject: `New sign-in to your PaperWorking account` · Preheader: `{device}, {approx_location}, {timestamp_local}.` · Body: We noticed a sign-in from a device you haven't used before. If this was you, nothing to do. · CTA: **Review account activity**

**`ACCT-EMAIL-CHANGE-NOTICE`** (old address) · Subject: `Your PaperWorking email is being changed` · Preheader: `You can reverse this for 72 hours.` · Body: A request was made to change the address on this account to {new_email_masked}. Until it's confirmed, you can cancel it. · CTA: **Reverse this change**

**`BILL-PAYMENT-FAILED-EARLY`** · Subject: `We couldn't process your payment` · Preheader: `Update your card to keep your Projects active.` · Body: The payment for your {tier_name} subscription didn't go through. We'll try again on {next_payment_attempt_date}. Your workspace is unaffected in the meantime. · CTA: **Update payment method**

**`BILL-PAYMENT-FINAL-NOTICE`** · Subject: `Final notice: your subscription lapses {date}` · Preheader: `Your data stays safe. Access pauses.` · Body: This is the last attempt on your {tier_name} subscription. If it doesn't clear by {date}, your workspace moves to read-only. Nothing is deleted. · CTA: **Update payment method**

**`BILL-RENEWAL-UPCOMING`** · Subject: `Your PaperWorking plan renews {date}` · Preheader: `{tier_name}, {amount}. No action needed.` · Body: Your annual {tier_name} subscription renews on {date} for {amount}. No action is needed to continue. · CTA: **Review subscription**

**`BILL-SUBSCRIPTION-PAST-DUE`** · Subject: `Your workspace is now read-only` · Preheader: `Restore access any time. Your data is intact.` · Body: Access to editing is paused while your subscription is past due. Every Project, document, and computed metric is retained exactly as you left it. · CTA: **Restore access**

**`TEAM-INVITE`** · Subject: `{inviter_name} invited you to {project_name}` · Preheader: `Join as {role_label} on PaperWorking.` · Body: {inviter_name} added you to the Project {project_name} as {role_label}. You'll see the phases and permissions they've granted you. This invitation expires in 14 days. · CTA: **Accept invitation**

**`VENDOR-INVITE`** · Subject: `{inviter_name} assigned you work on {project_address}` · Preheader: `Review the scope and confirm.` · Body: You've been invited to PaperWorking as a Vendor for work at {project_address}. You'll see your assignments and nothing else. · CTA: **Accept and view assignment**

**`TEAM-ROLE-CHANGED`** · Subject: `Your access to {project_name} changed` · Preheader: `New permissions take effect now.` · Body: {inviter_name} updated your permissions on {project_name}. · CTA: **View your access**

**`DEAL-MKT-INTEREST-RECEIVED`** · Subject: `{prospect_name} is interested in {deal_address}` · Preheader: `Non-binding interest, logged just now.` · Body: {prospect_name} registered non-binding interest in your Deal at {deal_address}. Nothing is committed by either party. · CTA: **View interest**

**`DEAL-MKT-INTEREST-ACK`** · Subject: `Your interest in {deal_address} was recorded` · Preheader: `Non-binding. No commitment of any kind.` · Body: We've logged your interest and notified the Lead Investor. This is an expression of interest only — it is not an offer, not a commitment, and creates no obligation for you or anyone else. PaperWorking does not accept, hold, or transfer funds. · CTA: **View the Deal** · **Locked disclosure block required.**

**`DEAL-MKT-LOI-ACK`** · Subject: `Your letter of intent for {deal_address}` · Preheader: `Recorded and non-binding.` · Body: Your non-binding letter of intent has been recorded and shared with the Lead Investor. A letter of intent is not a contract, not a subscription, and not a transfer of funds. · CTA: **View your submission** · **Locked disclosure block required.**

**`DEAL-MKT-REPLY-RECEIVED`** · Subject: `{sender_name} replied about {deal_address}` · Preheader: `{message_preview_60_chars}` · Body: Short preview, then the thread link. Never quote the full message into the email. · CTA: **Read and reply**

**`DEAL-MKT-DEAL-UPDATE`** *(class C)* · Subject: `Update on {deal_address}` · Preheader: `From {lead_investor_name}.` · Body: The publisher's update text, verbatim and unedited. · CTA: **Read the full update** · Requires one-click unsubscribe, postal address, and: You're receiving this because you followed this Deal.

**`VEND-MKT-INQUIRY-RECEIVED`** · Subject: `New inquiry: {work_category} at {project_area}` · Preheader: `From a PaperWorking investor.` · Body: An investor is looking for {work_category} in {project_area}. Reply through PaperWorking to keep the thread and any quote on record. · CTA: **Read and reply**

**`VEND-MKT-QUOTE-SUBMITTED`** · Subject: `{vendor_name} sent a quote for {project_address}` · Preheader: `{quote_summary_short}` · Body: Quote received. Review the scope and terms in the app. · CTA: **Review quote**

**`VEND-MKT-ENGAGEMENT-ACCEPTED`** · Subject: `You're engaged for work at {project_address}` · Preheader: `Scope and dates are in your assignment.` · Body: {investor_name} accepted your quote. Your assignment is live. · CTA: **Open assignment**

**`PROJ-GATE-READY`** · Subject: `{project_name} is ready to move to {next_phase}` · Preheader: `Every criterion is green.` · Body: All gate criteria for {current_phase} → {next_phase} evaluate green from your recorded data. · CTA: **Pass the gate**

**`PROJ-MISSING-INPUTS-DIGEST`** · Subject: `{count} metrics are waiting on inputs` · Preheader: `Each one links straight to the card that fills it.` · Body: These metrics can't be computed yet. Each line names the missing input and links to the card that collects it. · CTA: **Fill the gaps**

**`PROJ-WEEKLY-PORTFOLIO-DIGEST`** · Subject: `Your portfolio this week` · Preheader: `{headline_metric_summary}` · Body: The canonical 10 for the portfolio, each labeled actual or `Projected`, with unrecorded inputs shown as unrecorded. · CTA: **Open Portfolio**
