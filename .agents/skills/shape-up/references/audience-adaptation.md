# Audience Adaptation

Detecting user type and adapting conversation style during elicitation.

## Overview

Claude detects audience type from the first 2–3 exchanges based on language, not credentials. The goal is to match vocabulary, framing, and emphasis so that elicitation feels natural rather than like a form being filled out. All six spec elements are surfaced regardless of audience — only the language and order of emphasis change.

---

## Detection Signals

| Signal | Customer / Business | Engineer | PM / Mixed |
|--------|---------------------|----------|------------|
| Vocabulary | "workflow", "process", "customer", "ROI", "revenue" | "API", "database", "microservice", "queue", "schema" | Bridges both: "the user needs X, which means the backend needs Y" |
| Problem framing | Outcomes: "our customers complain about..." | Systems: "the current architecture can't handle..." | Features: "we need to ship X by Q3..." |
| Questions asked | "What should it do?" | "How should it work? What constraints exist?" | "What's the priority? What fits this sprint?" |
| Current state | Manual processes, spreadsheets, existing tools | Codebases, deployments, tech debt, existing APIs | Backlogs, roadmaps, team capacity |
| Technology | Does not mention specific technologies | Names specific technologies and trade-offs | High-level: "we use AWS" but not implementation detail |

Detection happens passively. Do not ask "are you a developer?" — infer from the signals above.

---

## Adaptation Rules

### For customers

- Use business language. Avoid jargon unless the customer uses it first.
- Start with pain: "What's the biggest frustration with how things work today?"
- Visualize with workflow diagrams, before/after comparisons, and process flows.
- Translate technical implications into business impact during the conversation: "That means the system would need to process orders in real-time, which adds complexity — but it eliminates the 4-hour manual reconciliation."
- Write solution elements using business names, not technical names.
- Probe boundaries by asking about business constraints: "Are there compliance requirements? SLAs with customers? Peak seasons?"
- De-emphasize technical interfaces in conversation; capture them for the spec separately.

### For engineers

- Use technical language. Match their precision level.
- Start with system context: "What exists today? What are we adding to or replacing?"
- Visualize with system/component diagrams, entity relationships, and sequence flows.
- Probe constraints early: existing tech stack, deployment environment, team experience, existing APIs.
- Ask about non-functional requirements aggressively — engineers usually have opinions.
- Write solution elements with technical precision: name the services, the data stores, the interfaces.
- Probe for rabbit holes using technical language: "Is there an existing library for this, or does it need to be built from scratch?"

### For PMs

- Start with scope and priority: "What's in scope for this release vs. future?"
- Use prioritized capability lists with release mapping.
- Balance business context with technical precision.
- Probe for appetite directly — PMs often have explicit time/resource budgets.
- Visualize with scope tables showing must-have / nice-to-have / future columns.

---

## Re-calibration

If Claude detects a shift mid-conversation — a customer starts using technical terms, an engineer starts talking about user experience — re-calibrate silently. Do not announce the change or ask about it. Adjust vocabulary and emphasis and continue.

Signals that warrant re-calibration:

- Vocabulary shift: suddenly technical or suddenly business-focused
- Depth shift: suddenly asking "how" instead of "what", or vice versa
- A second person joins the conversation with different expertise

The adaptation is in language and emphasis, not in what elements are surfaced. All six elements matter regardless of audience.

---

## Example Fragments

The same topic — order status tracking — elicited differently for each audience type.

### Customer

The user says: "When a customer places an order, they want to know where it is. Right now they have to email support, which takes hours. They just want to check themselves."

Claude responds: "So the core pain is visibility — customers can't self-serve on order status. Today that hits your support team too. Let me sketch what the happy path looks like: [flow trace in business terms]."

What changed: the response names the pain in the customer's words, surfaces the support team impact they implied, and offers to continue in a business-readable format.

### Engineer

The user says: "We need an order tracking endpoint. The warehouse API gives us shipment events via webhook, but there's no consumer for those events yet. We also need to handle the case where the webhook is delayed."

Claude responds: "So the system needs a webhook consumer for shipment events, a status aggregation layer, and a customer-facing query endpoint. The webhook delay is a rabbit hole — let's patch that: [technical options]."

What changed: the response names components precisely, mirrors the engineer's framing, and flags the rabbit hole immediately using technical language.

### PM

The user says: "We need to let customers track their orders without calling support. We're hoping to get this into Q2, but there's a question about what the warehouse team can expose."

Claude responds: "Got it — core capability is customer self-serve on order status. The warehouse integration is the external dependency that could shift scope. Want to map out the must-have slice vs. what gets cut if the warehouse API isn't ready?"

What changed: the response centers on scope and dependency risk, uses release-planning language, and offers a scoping exercise rather than a flow trace or component breakdown.

---

## Anti-pattern

**Assuming from title.** "I'm a CTO" does not mean engineer — some CTOs are business-focused. "I'm a designer" does not mean customer — some designers are deeply technical. Detect from language, not credentials. A title provides a weak prior at best; three sentences of conversation override it.
