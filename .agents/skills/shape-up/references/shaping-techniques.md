# Shaping Techniques

Decomposition and probing methods for different problem types. Load this
when the elicitation conversation needs structured techniques to make
progress on a complex or vague problem.

Breadboarding and fat marker sketching are adapted from
[Shape Up](https://basecamp.com/shapeup) (Basecamp/Ryan Singer).
Other techniques draw from established requirements engineering practice.

---

## Selection Guide

Match the conversation signal to the technique:

- User describes vague outcomes → **Outcome Backward**
- User describes a manual process → **Day-in-the-Life**
- Unclear where system starts/stops → **Boundary Probing**
- Multiple actors interact in complex ways → **Scenario Threading**
- Need to visualize user interaction → **Breadboarding**
- Need to identify solution components → **Fat Marker Sketching**
- Risks are accumulating → **Rabbit Hole Surfacing**
- Business rules constrain behavior → **Invariant Discovery**

Most elicitations use 2-3 techniques. Common combinations:

- **Vague intent**: Outcome Backward + Boundary Probing
- **Greenfield**: Boundary Probing + Fat Marker Sketching
- **Workflow replacement**: Day-in-the-Life + Scenario Threading
- **Complex domain**: Invariant Discovery + Scenario Threading

---

## 1. Outcome Backward

**When to use** — The user describes vague intent: "I need an app," "we need a better system," or "I want something that handles X." The problem statement is aspirational but the required capabilities are undefined.

**How to apply**

Ask the user to imagine the system already exists and works perfectly:

- "Imagine this is live and working exactly as you hoped. What's different about your day?"
- "What are people doing that they couldn't do before?"
- "What stopped happening that used to cause problems?"

Work backward from each observable outcome to the capability that enables it. Each outcome becomes a solution element candidate.

**What it surfaces** — Problem, Solution elements

**Example**

> User: "We need a better reporting system."
> Claude: "Imagine the new system has been live for three months. What's different about how your team starts the week?"
> User: "We wouldn't spend Monday mornings pulling numbers from three different spreadsheets."
> Claude: "So the core need is aggregating data that's currently spread across separate sources — not necessarily new reports, but unified ones?"

---

## 2. Day-in-the-Life

**When to use** — The user is replacing or augmenting an existing workflow. There's an existing process with known pain, and the system needs to fit into or replace it.

**How to apply**

Ask the user to narrate the current process from trigger to resolution:

- "Walk me through what happens today, step by step, from the moment it starts to when it's done."
- "Where does this break down most often?"
- "Where do you lose the most time or make the most mistakes?"

Each step becomes a potential system element. Pain points signal priorities. Steps outside the system boundary help define what to exclude.

**What it surfaces** — Problem, Solution elements, Boundaries

**Example**

> Claude: "Walk me through what happens when a new vendor needs to be onboarded today."
> User: "Someone emails me a form, I check it manually, enter it into two systems, then send a confirmation."
> Claude: "Which of those steps takes the longest or breaks most often?"
> User: "The manual check — half the forms are missing required fields."
> Claude: "So validation at intake is the highest-value part of this system."

---

## 3. Boundary Probing

**When to use** — It's unclear where the system starts and stops. The user may be describing something that depends on integrations, upstream triggers, or downstream consumers that haven't been named yet.

**How to apply**

Ask about what happens just before and just after the system is used:

- "What happens right before someone uses this system?"
- "What happens right after — who or what consumes the output?"
- "What does this system NOT do that something else handles?"
- "Are there external systems this needs to talk to?"

External touchpoints become interface requirements. Things outside the boundary become explicit no-gos.

**What it surfaces** — No-Gos, Boundaries, Rabbit Holes (integration risks)

**Example**

> Claude: "What triggers the process you're describing — what happens right before?"
> User: "A Stripe webhook fires when a payment is completed."
> Claude: "And after this system processes it, where does the data go?"
> User: "It needs to update our Salesforce records."
> Claude: "So the boundaries are: Stripe on the input side, Salesforce on the output side. Does this system own the connection to both, or does something else broker those?"

---

## 4. Scenario Threading

**When to use** — Multiple stakeholders interact differently with the system, or the happy path is clear but the edge cases and decision branches are not.

**How to apply**

Pick a concrete scenario and trace it end to end:

- "Let's follow a specific case through the whole system. [Actor] does [action] — what happens next?"
- "Who sees what at each step?"
- Branch at every decision point: "What if [condition]? What if [failure]?"

Keep threading until the scenario reaches a terminal state. Then pick a different starting condition and thread again.

**What it surfaces** — Solution (flows), Rabbit Holes (edge cases), Boundaries

**Example**

> Claude: "Let's trace an order. A customer places an order for an item that's in stock — what happens?"
> User: "It goes to the fulfillment queue."
> Claude: "What if the item is out of stock at the time they place it?"
> User: "Hmm. We haven't decided that yet."
> Claude: "That's a branch we need to resolve — it affects both the customer experience and the fulfillment logic."

---

## 5. Breadboarding

*(from [Shape Up, Ch. 4](https://basecamp.com/shapeup/1.3-chapter-04))*

**When to use** — The interaction design is unclear. You need to understand how users navigate the system without getting into visual design detail too early.

**How to apply**

Map three things: **places** (screens, pages, views), **affordances** (buttons, fields, labels), and **connections** (navigation flows between places). No wireframes, no layout — just structure and flow.

Narrate it as: "User arrives at [place]. They see [affordances]. They click [thing], which takes them to [place]."

```
[Invoice List] --(click invoice)--> [Invoice Detail]
  |                                    |
  search bar                           line items table
  status filter                        approve button
  create button                        reject button + reason field
```

Ask what the user needs to be able to do from each place. Missing affordances become gaps. Unexpected connections reveal complexity.

**What it surfaces** — Solution (elements and flows)

**Example**

> Claude: "Let's breadboard this. The user lands on the dashboard — what do they need to see and do from there?"
> User: "They need to see pending approvals and be able to click into one."
> Claude: "So: [Dashboard] shows pending approvals list, clicking one goes to [Approval Detail]. From the detail, what actions are available?"

---

## 6. Fat Marker Sketching

*(from [Shape Up, Ch. 4](https://basecamp.com/shapeup/1.3-chapter-04))*

**When to use** — The major components of the system need to be named and their responsibilities clarified. You need a coarse-grained map before going into interaction design or edge cases.

**How to apply**

Name the major elements and their responsibilities. Show what talks to what. Stay coarse — no data models, no API contracts, no implementation details.

"If I had to draw this system with a fat marker on a whiteboard, it would have these boxes."

```
Elements:
  [Webhook Consumer] --> [Event Store] --> [Status Aggregator]
                                               |
                                          [Customer API] <-- [Dashboard]
```

Each box should have a one-sentence responsibility. Connections should have a one-phrase description of what moves between them. Ambiguous connections are rabbit holes.

**What it surfaces** — Solution (elements), Rabbit Holes (integration points)

**Example**

> Claude: "Let me try to name the major pieces. There's something that receives events, something that stores them, and something that serves the UI. Does that match your mental model, or are there more pieces?"
> User: "There's also a rules engine that decides what to do with each event."
> Claude: "Where does that sit — between the store and the aggregator, or before storage?"

---

## 7. Rabbit Hole Surfacing

**When to use** — Risks are accumulating, the user is assuming hard problems are solved, or the solution involves territory the team hasn't built in before. Use proactively — don't wait for risks to surface naturally.

**How to apply**

Ask directly about the parts that could cause the project to fail or spiral:

- "Does this require building something you haven't built before?"
- "Are you assuming a solution already exists for the hard part?"
- "What's the part of this that keeps you up at night?"
- "If this took 3x longer than expected, what would be the reason?"
- "What would make this impossible to ship on time?"

For each risk identified, decide: patch the approach now, spike to de-risk, or cut from scope. Don't let rabbit holes sit unnamed.

**What it surfaces** — Rabbit Holes, No-Gos

**Example**

> Claude: "If this project took three times longer than planned, what would be the reason?"
> User: "Honestly, the real-time sync. We've never done that before."
> Claude: "That's a rabbit hole. Before we shape around it, do you need it to be real-time — or is near-real-time acceptable? That changes the complexity significantly."

---

## 8. Invariant Discovery

**When to use** — The domain has business rules that constrain behavior, and violating them would be a correctness error. Often applies to financial systems, order management, access control, and compliance-heavy domains.

**How to apply**

Ask about absolute constraints on entities and operations:

- "What must ALWAYS be true about [entity]?"
- "What must NEVER happen?"
- "If someone tried to [violation], what should the system do?"
- "Are there rules that hold regardless of who is taking the action or what state the system is in?"

Each invariant becomes a validation rule or constraint. Cluster invariants by entity. Gaps between invariants often reveal rabbit holes — what happens at the boundary of a rule?

**What it surfaces** — Boundaries (business rules), Solution (validation logic), Rabbit Holes (rule violations)

**Example**

> Claude: "What must always be true about an order in your system?"
> User: "Once it's shipped, it can't be modified."
> Claude: "What about canceled — can a shipped order be canceled?"
> User: "No. Actually, once it's in any terminal state — shipped, canceled, refunded — nothing should change."
> Claude: "So the invariant is: no mutations on orders in terminal states. That's a constraint on every write operation."
