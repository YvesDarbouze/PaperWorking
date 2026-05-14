# Appointment Prep

A conversational walkthrough for preparing a user for a German government appointment — visa interview, Ausländerbehörde / LEA, Einbürgerungsbehörde, Standesamt. The walkthrough is coach-led, not monologue. Each phase is a small back-and-forth.

The agent does not produce a frozen checklist. The actual document list comes from the responsible Behörde's own page, fetched live during the conversation. This file describes the *shape* of the conversation, not its content.

---

## Phase 1 — Warm opener and orientation (2–4 turns)

Acknowledge the appointment is real and soon. Keep it short.

Gather, in order:

1. **What is the appointment for?** (residence permit, Fiktionsbescheinigung, Einbürgerungstest, visa interview, naturalisation ceremony…)
2. **When is it?** (date and time — informs urgency)
3. **Where is it?** (city and specific office — informs which Behörde page to fetch)
4. **What permit type, statute, or process?** (if known — Blue Card, § 18b, Fiktionsbescheinigung, etc.)
5. **What is the user's current status?** (already in Germany on which permit, or arriving from abroad, or holding a Fiktionsbescheinigung now…)
6. **What is the worry that prompted them to ask?** (often the most useful piece — the worry is usually specific)

Voice cue: this is the *noticing* phase. Acknowledge what the user already has done. The user has booked the appointment, learned some German, gathered documents — that took real work.

Do not list questions all at once. Ask 2–3, listen, ask the next 2–3.

---

## Phase 2 — Live research (1–3 lookups)

Once the situation is clear:

1. Open [`references/sources.md`](sources.md) and pick the Tier 1 source for the question.
2. Look up the responsible Behörde's page with a `site:` query.
3. Fetch the actual document checklist for the specific procedure in the specific city.
4. Note the page's last-updated date. Flag if older than ~18 months.
5. If the topic is doctor-licensing, also fetch the relevant Landesärztekammer page (language exam) and the state Approbationsbehörde page.

Speak briefly during this phase: "Pulling up the [city] LEA's checklist now…" Then return with what you found, with citations.

---

## Phase 3 — Document pass (the core)

Walk the user through each required document one at a time. For each:

- **What it is** (e.g., "Meldebescheinigung — proof of residence registration").
- **Whether the user has it.** Ask.
- **Original or copy?** And if copy: certified by whom? (Many German authorities require *amtlich beglaubigt* — officially certified copies.)
- **Translation needed?** German authorities require translation by a *vereidigter / beeidigter Übersetzer* based in Germany.
- **Apostille needed?** Country-specific. For Chile (Hague Apostille party since 2016), apostille from the Chilean issuing authority is sufficient — full legalisation by a German embassy is generally not needed. Always check the receiving authority's own page.
- **Validity / freshness rule?** Many German authorities require certain documents (Führungszeugnis, medical certificate, language certificate) to be no older than a stated period — typically 3 months for clearance certificates, 3 years for language certificates. Quote the actual rule from the source.

Common items to walk through (the actual list comes from the authority's page):

- **Valid passport** — and confirm it remains valid for at least 6 months past the appointment.
- **Prior Aufenthaltstitel** (if any) — original.
- **Meldebescheinigung** (residence registration confirmation) — recent.
- **Biometric photos** (35×45 mm, neutral background, recent) — usually for the eAT step, sometimes earlier.
- **Health insurance proof** — current; both statutory (GKV) and private (PKV) accepted, but the proof must be current at appointment time.
- **Proof of means / employment contract / payslips** — for employment-based permits.
- **Birth certificate** — for many residence permits and for Einbürgerung.
- **Marriage certificate** — for family / spouse-related permits.
- **Police-clearance / Führungszeugnis** — for Approbation, Einbürgerung; usually max 3 months old.
- **Diploma + transcripts + sworn translations** — for academic-track permits, recognition procedures, and Approbation.
- **Language certificate** — B1 or B2 depending on permit/process.
- **Application form, completed** — fetch the latest version from the authority's page; do not trust an old PDF.
- **Fee in the accepted format** — many Behörden are EC-Karte (debit) only, not cash, not credit. Check the page.

Voice cue: keep it conversational. After two or three items, ask: "How are we doing? Want to keep going, or pause and circle back?"

---

## Phase 4 — Logistics

Smaller but easy to forget:

- **Appointment confirmation letter / online booking screenshot** — bring it printed.
- **Specific office address and floor** — Berlin's LEA has multiple buildings; Munich's KVR has multiple counters. Confirm the user knows the right one.
- **Wartenummer / queueing system** — explain what the user should expect on arrival. Some Behörden call by appointment slot, some by Wartenummer drawn on entry.
- **Travel companion / interpreter** — most Behörden allow a trusted person to accompany, especially if German is still developing. Check the page; sometimes the appointment slot covers only the applicant.
- **Children present?** — separate documents; sometimes a separate appointment is required.
- **Payment method** — cash vs EC-Karte vs ePayment. The page will say. Berlin LEA increasingly uses ePayment via the online application.
- **What to do if the user is running late** — most Behörden state a tolerance window (often 5–10 minutes). After that, the appointment is forfeit.

---

## Phase 5 — Morning-of reassurance

Brief and quiet. Not a pep talk.

The agent's job here is to remind the user:

- They have done the hard work.
- The appointment itself is mostly clerical.
- Bring water and patience for the queue.
- It's okay to ask the official to repeat in slower German.
- If something goes wrong (a missing document, a confused official), it's almost always recoverable: "Wir können einen neuen Termin machen" is a normal phrase to hear.

---

## When the appointment is doctor-specific

If the appointment is at LAGESO Berlin (or the equivalent state Approbationsbehörde elsewhere) for Approbation/Berufserlaubnis:

- Confirm whether the user has the **B2 general** certificate (telc / TestDaF / Goethe).
- Confirm whether they have the **Fachsprachprüfung** scheduled or completed (with the relevant Landesärztekammer — variation between Länder is real).
- Confirm whether they have a **Berufserlaubnis** or **Approbation** as the goal — and whether the residence permit they will then need is **§ 16d** (during recognition) or **§ 18b** / **EU Blue Card** (after Approbation).

This sequence often spans multiple appointments over months. Help the user see which appointment is which step in the chain.

---

## When the appointment is for Einbürgerung

If the appointment is at the Einbürgerungsbehörde:

- Confirm residence duration: standard 5 years (post-2024 reform), or 3 years for special integration achievements.
- Confirm German language level: B1 standard; some accelerated paths require C1.
- Einbürgerungstest: usually completed before the appointment; fetch the responsible Land's procedure for confirmation.
- Financial self-sufficiency: usually proven via tax / employment documents.
- Commitment to the free democratic basic order: signed declaration, sometimes done at the appointment itself.
- Multiple citizenship: now generally permitted post-2024 reform — but the receiving country (Chile, in the focus case) decides on its own side. Confirm both sides of dual-citizenship effects.

---

## Voice and citation reminders

- Voice from [`references/voice.md`](voice.md) throughout — warm, curious, never condescending.
- Citations from [`references/research-playbook.md`](research-playbook.md) — every claim with an inline `(source: [name] — [URL])`.
- When the source is silent, say so plainly. Never substitute pattern-from-memory for live research.

---

## Agent instructions

When the user mentions an upcoming appointment:

1. Use TaskCreate to track the appointment-prep workflow (it has 5+ steps).
2. Begin with Phase 1; do not jump to Phase 3 before the situation is clear.
3. Phase 2 (live research) must complete before Phase 3 (document pass) — the document list comes from the source.
4. Pace the document pass; do not dump all items at once.
5. Phase 5 is short and earned, not pre-emptive.
