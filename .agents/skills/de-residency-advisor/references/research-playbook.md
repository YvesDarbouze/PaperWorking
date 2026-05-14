# Research Playbook

How to research German residency questions live. The skill does not carry a frozen knowledge base — every answer is grounded in a source the agent fetches at the time of the conversation.

---

## Research order

The skill is tool-agnostic. Whatever discovery-and-fetch capability the host agent has — use it. The skill's contract is with the source, not with the tool.

1. **Look up the authoritative page.** Use the `site:` queries from `sources.md` to locate the current page from the responsible Behörde. Whatever the host agent's lookup capability returns, read it.
2. **Read known URLs directly.** When the URL is already known (e.g., a paragraph in gesetze-im-internet.de), go straight to the page without a discovery step.
3. **Direct quotation only.** Never paraphrase a procedural detail (fee, threshold, deadline, document name) without quoting or paraphrasing from a source you actually read in this conversation.

Do not shell out to `curl` or `wget`.

---

## Query patterns

Use `site:` queries to pin your lookup to the authoritative source. Examples:

- `site:bamf.de Blaue Karte EU Voraussetzungen`
- `site:make-it-in-germany.com EU Blue Card salary 2026`
- `site:service.berlin.de Fiktionsbescheinigung`
- `site:aekb.de Fachsprachprüfung Termine`
- `site:gesetze-im-internet.de § 18g AufenthG`
- `site:bmi.bund.de Einbürgerung 2024`
- `site:anerkennung-in-deutschland.de Arzt Drittstaat`

When the user names a city, swap to that city's domain: `site:stadt.muenchen.de`, `site:hamburg.de`, `site:frankfurt.de`. The Berlin LEA also publishes at `service.berlin.de`.

When the source is a specific Bundesland's Landesärztekammer or Approbationsbehörde, search by the Land name first (`site:blaek.de Approbation Drittstaat` for Bayern). If the city or state is unclear, ask the user before searching — see "Bundesland handling" below.

---

## Citation format

Inline, immediately after the claim it supports, in parentheses:

```
(source: BAMF — https://www.bamf.de/DE/Themen/.../blauekarteeu-node.html)
```

Short name first, then URL. Multiple sources for one claim are joined by semicolons. The format is the same in conversational prose and in checklists.

When a claim is supported by primary law, cite the paragraph and the URL:

```
(source: § 81 Abs. 4 AufenthG — https://www.gesetze-im-internet.de/aufenthg_2004/__81.html)
```

---

## Recency check

Before quoting a number, deadline, or document list:

1. Note the page's "Stand:" date (or "Last updated") if shown. Many BAMF and city pages display this at the bottom.
2. If the page predates the most recent relevant reform (2024 StAG reform for citizenship; 2023 Skilled Workers Act for skilled-worker permits and Chancenkarte), flag this to the user and re-search.
3. Salary thresholds for the EU Blue Card are republished by the BMI in December each year. If the cited number is from before the most recent December, re-verify with Make-it-in-Germany or the city LEA's Blue Card page.
4. Anything older than ~18 months without a known reform is "verify before relying on" — say so to the user and offer to re-check.

When a search result omits the page's last-updated date, fetch the page directly and look for the date stamp.

---

## Bundesland handling

German bureaucracy is federalised. The same legal question can have different operational answers in Berlin, Munich, and Hamburg — different fees, different document checklists, different language-exam acceptance, different appointment systems.

Procedure:

1. **Ask early.** Before researching procedural specifics, ask: "Which Bundesland or city are you in?" If the user has named a city, do not extrapolate to others.
2. **Cite the local source.** When answering a procedural question for Berlin, cite a Berlin source. Do not cite a Munich page and assume it applies in Berlin.
3. **Flag when extrapolating.** If a Bundesland-specific source can't be found and you must rely on a federal source, say so: "This is the federal rule. Your Bundesland may have additional requirements — want me to check [city]'s page?"
4. **Name the body.** Different Länder give different names to the same function (LAGESO in Berlin, Regierung von Oberbayern in Bayern, Bezirksregierungen in NRW for Approbation). Use the local name; do not generalise to "the Approbationsbehörde."

---

## When sources conflict

If two sources give different answers (e.g., a 2022 BAMF page and a 2024 Make-it-in-Germany page both quote a salary threshold and the numbers differ):

1. Note both, with their dates and URLs.
2. Prefer the more recent and the more authoritative (federal portal > general overview).
3. Tell the user the conflict explicitly. Do not silently pick one.
4. Recommend the user call or email the relevant Behörde to confirm if the answer is decision-critical.

---

## When sources are silent

Sometimes the user has a specific question and no Tier 1 / Tier 2 source addresses it. Examples: "Can I bring my partner to the appointment?" "Is the payment terminal cash-only?" "Does the LEA accept a digital insurance card?"

When this happens:

1. State plainly that the official sources do not address this point.
2. Do not guess or paraphrase from training data.
3. Offer to draft a polite German email to the responsible Behörde asking the question, with proposed German wording the user can copy.
4. Also offer the user an Erin-flavoured fallback: "If you'd rather not write the email, you could call the LEA's general line — would you like me to find that number for you?"

---

## What never to do

- Never quote a fee, salary threshold, document list, or deadline without citing a source fetched in this conversation.
- Never extrapolate from one Bundesland to another.
- Never let the conversational tone soften a missing citation. A warm sentence with a fabricated number is worse than a plain sentence with a real one.
- Never rely on memory of "what BAMF used to say" — fetch.
- Never use general LLM training data to answer a specific procedural question. If lookup and direct fetching both come up empty, say so.

---

## Agent instructions

Before answering any procedural question:

1. Read the user's situation. Identify Bundesland/city, permit or process, appointment date, what they already have.
2. Open [`references/sources.md`](sources.md). Pick the Tier 1 source.
3. Look up the source with the `site:` query.
4. Read the page. Note the date.
5. If the topic is administered locally, follow with a Tier 2 city or state source.
6. Compose the answer with inline citations. Keep voice from [`references/voice.md`](voice.md). Keep facts from the sources you just fetched.
7. If anything required the user to choose (e.g., "which Bundesland?"), ask before searching deeper.
