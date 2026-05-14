# Phase 1: Context

Establish the visualization's argument, viewer, cognitive mode, and constraints before any encoding decisions. This is the highest-leverage phase — getting the argument right matters more than getting the encoding right.

## When to Use

- New visualization request with no prior framing
- User's intent is unclear or underspecified
- Argument, viewer, or cognitive mode is missing
- Restarting after scope change or pivot

## Instructions

### 1. Establish the Argument

Complete this sentence: **"This visualization shows that ___."**

If the sentence cannot be completed, ask the user to clarify purpose before proceeding. A visualization without an argument is decoration, not communication.

The argument is not the topic ("revenue by region") but the claim ("the Northeast region drives 60% of revenue growth"). If only a topic exists, help the user sharpen it into a specific claim or comparison.

### 2. Identify Viewer and Task

Complete this sentence: **"[Person] needs to [action] by [when]."**

Specificity changes which data matters and how to encode it:

- "Executives need to approve Q4 budget by Friday" → design for rapid recognition, highlight anomalies
- "Analysts need to identify cost drivers over the next quarter" → design for exploration, enable drill-down
- "The public needs to understand climate trends" → design for inference, guide with annotations

If the viewer is unknown, establish reasonable assumptions and document them.

### 3. Determine Cognitive Mode

Is the viewer arriving at a **conclusion** or making a **decision**?

**Conclusion (inference)** — the viewer must hold information and reason about it:

- Design for working memory: structured hierarchy, reduced interference, direct labels
- Prioritize highest-accuracy channels (position, length)
- Provide guided reading path through annotations

**Decision (recognition)** — the viewer must pattern-match and act:

- Design for pre-attentive salience: categorical signals, minimum cognitive friction
- The answer should fire before the viewer reads a word
- Anomalies need categorical disruption, not subtle hue shift

Conflating these modes produces charts that are technically accurate but cognitively wrong.

### 4. Gather Constraints

Identify practical boundaries that shape implementation:

| Constraint | Questions to Ask |
|------------|------------------|
| **Medium** | Interactive web, static report, slide deck, print, dashboard? |
| **Audience** | Technical literacy? Domain familiarity? Accessibility requirements? |
| **Data availability** | Data in hand? Pending? Must be sourced? |
| **Timeline** | Quick prototype or production-ready? |
| **Access level** | WCAG AA baseline? AAA target? Specific mandates? |

### 5. Honesty Check

What complexity exists that simplification might hide?

- What outliers or exceptions does the argument smooth over?
- What context would change the viewer's interpretation?
- What uncertainty exists in the data that the visualization should acknowledge?

If the honest answer undermines the argument, the argument needs revision — not the honesty check.

### 6. Editorial Integrity

These checks catch subtle biases that standard visualization audits miss:

- **Threshold-based pre-interpretation:** Did you choose category boundaries, color breakpoints, or bin edges that support the narrative? Would different thresholds tell a different story?
- **Metric selection bias:** Would this metric be included if it showed the opposite trend? The metrics you leave out shape interpretation as much as the ones you include.
- **Designer's epistemic commitment:** After spending time with data, you form conclusions. Are contradictory findings in footnotes while the "interesting" finding gets visual prominence? Ask: "Would this simplification survive if the finding went the other way?" If yes, it is clarity. If no, it is comfort.

### When the Argument Is Hard to Articulate

If the user struggles to complete "This visualization shows that ___":

1. **Ask what surprised them** in the data — surprise points toward the argument
2. **Ask what decision** the visualization should inform — decisions imply comparisons
3. **Ask who they're convincing** and of what — persuasion requires a claim
4. **Ask what would change** if they didn't make this visualization — necessity reveals purpose

If no argument emerges, the data may need exploratory analysis before visualization. Recommend exploration tools (Observable Plot, notebook environments) before committing to a polished artifact.

## Data Availability Check

Determine data status before proceeding:

- **Data available** → proceed to Phase 2 with concrete data assessment
- **Data pending** → proceed to Phase 2 with provisional framing; the research phase handles the no-data-yet flow
- **No data, no schema** → help the user articulate what data they need, then revisit

## Exit

Proceed to **Phase 2: Research** with:

- Argument sentence
- Viewer and task sentence
- Cognitive mode (inference or recognition)
- Constraints documented
- Editorial integrity check completed
- Data status (available | pending)
