---
name: contact
description: >-
  Implements and tests the PaperWorking /contact page, general inquiry form, and
  POST /api/contact BFF. Use when the user mentions contact page, contact form,
  BUG-005, general inquiry, support ticket submission, or hi@paperworking.co routing.
---

# Contact page (`/contact`)

## Scope

Public marketing contact flow in `PaperWorking_v1/apps/web`:

| Piece | Path |
|-------|------|
| Page | `apps/web/app/(marketing)/contact/page.tsx` |
| Form UI | `apps/web/components/marketing/ContactInquiryForm.tsx` |
| BFF route | `apps/web/app/api/contact/route.ts` |
| Shared handler | `apps/api/src/routes/public/contact/handler.ts` (`handleContactPost`) |
| Validation | `apps/api/src/lib/public/forms.ts` (`validateContactForm`) |
| Channel cards data | `apps/web/lib/marketing/support-data.ts` (`CONTACT_CHANNELS`) |

## API contract

**POST `/api/contact`** (no auth)

Request body:

```json
{
  "name": "optional string",
  "email": "required@email.com",
  "subject": "required",
  "body": "required message",
  "category": "general-inquiry | sales | support | billing"
}
```

Success `200`:

```json
{
  "success": true,
  "message": "Thank you for reaching out. Your message has been received.",
  "ticketId": "ticket_..."
}
```

Validation errors `400`: `{ "success": false, "error": "..." }`

## Implementation rules

1. **Reuse `handleContactPost`** from `@paperworking/api` in the Next BFF — do not duplicate validation.
2. **Client form** posts to same-origin `/api/contact` with `Content-Type: application/json`.
3. **Keep mailto fallback** (`hi@paperworking.co`) on the form for accessibility.
4. **Match marketing styling**: `pw-card`, `pw-pill-cta`, dark inputs with `focus:border-[#00DD94]`.
5. **Ticket persistence** is optional via `ContactPostDeps.createSupportTicket`; handler returns success even if DB write fails (failure-safe).

## QA checklist

```
- [ ] GET /contact renders form (name, email, category, subject, message)
- [ ] Empty email/subject/body → 400 with clear error
- [ ] Valid submit → 200, success message in UI, form resets
- [ ] Channel cards still link (mailto, /account/support)
- [ ] Mobile 390px — no horizontal overflow
- [ ] Link to /support remains
```

Playwright smoke:

```javascript
await page.goto('http://localhost:3000/contact');
await page.getByLabel(/Email/i).fill('qa@example.com');
await page.getByLabel(/Subject/i).fill('QA test');
await page.getByLabel(/Message/i).fill('Hello from QA');
await page.getByRole('button', { name: 'Send message' }).click();
await page.getByText(/received your message/i).waitFor();
```

## Related bugs

- **BUG-005** — contact form was placeholder; resolved by `ContactInquiryForm` + `/api/contact`.
- **UX-003** — same scope; remove "later phase" copy when form ships.

## Optional follow-ups

- Wire `createSupportTicket` to Firestore `supportTickets` when collection exists.
- SendGrid outbound email on ticket create (env: see `.env.example` SUPPORT_PROVIDER).
- Pre-fill name/email when user is logged in (`/api/auth/me` or settings profile).
