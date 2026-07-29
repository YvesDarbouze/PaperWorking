# DM-47: Deal Marketplace Prompts & Walkthroughs

**Governing Authorities:** `.agents/skills/paperworking-reil/SKILL.md` · `docs/spec/dm-build-pack-deal-marketplace.md`

This document defines the E2E acceptance journeys, prompts, and dispatches for the Deal Marketplace.

---

## 1. DM-47 Verification Journeys

### Journey 1: Subscriber Deal Creation & Gating
* **Prompt**: A subscriber searches for an address, starts a deal, and invites contacts.
* **Evidence Check**: The deal is set up, but cannot move past Prospecting without the Acquisition phase purchase agreement contract (**D-4 / B-2**) uploaded as a Project file.

### Journey 2: Subscriber Drill-Down & Citation (C-3)
* **Prompt**: A subscriber views a deal listing and clicks on a provenance badge.
* **Evidence Check**: The popover displays document citation metadata. Clicking `Open Document` succeeds only if the file is exposed or the subscriber is a member.

### Journey 3: Business Card Exchange (G-4)
* **Prompt**: Exchanging business cards on a deal.
* **Evidence Check**: Exchanged cards must land in both parties' Project attachments (`projectFiles`) or fall back to account-level contacts if a party has no Project for that deal.

---

## 2. Media Dispatches (DM-20)

### DM-20 Media Dispatch Rule
* When a media dispatch occurs (e.g. sharing deal flyers, photos, or brochures to external channels):
  * The media asset must be stored in `projectFiles` under the appropriate phase folder (e.g. `Acquisition`, `Renovation`).
  * The public link generated for the dispatch reads directly from the exposed `projectFiles` download URL, adhering to RM-3 security settings.
  * There is **no dependency** on a centralized Data Room for public/subscriber media access.
