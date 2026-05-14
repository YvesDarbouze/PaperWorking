# Domain Modeling

Lightweight domain modeling through conversation. Loaded on-demand when
the elicitation reveals entity complexity — multiple entity types,
business rules that constrain behavior, or terms that mean different
things to different stakeholders.

## When to Model

**Load this reference when:**

- Multiple entity types emerge ("orders contain line items, which
  reference products from a catalog")
- Business rules constrain behavior ("an order can't be modified after
  shipment")
- Stakeholders use the same term to mean different things ("order" means
  the transaction to sales, but the fulfillment package to warehouse)
- The solution has data relationships that affect the design

**Do NOT model when:**

- The system is simple CRUD with obvious entities
- The system is pure integration/plumbing (connecting APIs, no domain logic)
- The system has a single primary entity with no meaningful relationships
- Modeling would delay the conversation without adding clarity

When in doubt, skip it. A domain model is only valuable if it prevents
downstream confusion. If the domain is obvious to everyone in the room,
modeling it wastes time.

## Conversational Technique

Surface the domain model through four progressive steps. Do NOT present
this as a modeling exercise — weave it into the elicitation conversation.

### Step 1: Surface the Nouns

Listen for entity names that recur in the conversation. When 2-3 emerge
naturally, name them:

"I'm hearing a few key things in your system: Orders, Customers, and
Products. Are those the main concepts, or am I missing something?"

Do not over-prompt. Let nouns emerge from the user's own description.

### Step 2: Establish Relationships

Once entities are named, probe how they connect:

- "Can a customer have multiple orders?"
- "Does an order contain products directly, or through something like
  line items?"
- "Can a product exist without being in any order?"

Sketch the relationships inline:

```
Customer 1──* Order *──* Product
                |
                * LineItem (qty, price)
```

The sketch is a conversational tool — validate it with the user, then
discard. Only the distilled model goes into the spec.

### Step 3: Discover Invariants

Invariants are business rules that must always hold. They are the most
valuable output of domain modeling:

- "What must ALWAYS be true about an order?"
- "What must NEVER happen to a customer record?"
- "If someone tried to [violation], what should the system do?"

Examples of invariants:

- "An order cannot be modified after it ships."
- "A customer's email must be unique across the system."
- "Line item quantity must be positive."
- "An order must have at least one line item."

Invariants become validation rules, constraints, and acceptance criteria
in the spec.

### Step 4: Name the Ubiquitous Language

If different stakeholders use different terms for the same concept, or
the same term for different concepts, resolve it:

"When you say 'order', do you mean the same thing the warehouse team
means? Sales sees it as a purchase transaction, but fulfillment sees
it as a shipment request. Should we distinguish these?"

Establish one term per concept. This prevents terminology confusion
during implementation.

## Integration into the Spec

If domain modeling was used during elicitation, the spec includes a
Domain Model subsection within Solution. The format:

**Entities table:**

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| Order | A customer's purchase request | status, total, created_at |
| LineItem | A product + quantity within an order | quantity, unit_price |
| Product | A catalog item available for purchase | name, sku, price |

**Relationships** — either ASCII diagram or prose, whichever is clearer
for the complexity level:

```
Customer 1──* Order 1──* LineItem *──1 Product
```

**Invariants** — numbered list:

1. An order cannot be modified after status = "shipped"
2. Line item quantity must be > 0
3. Order total = sum of (line item quantity * unit price)

## Anti-Patterns

**Over-modeling.** Creating a full class hierarchy with inheritance,
interfaces, and design patterns during requirements elicitation. The
domain model in a spec is a communication tool, not a UML diagram.
Name the entities, their relationships, and their invariants. Stop there.

**Under-modeling.** Ignoring domain complexity when it matters. If
stakeholders argue about what a term means, that is a signal to model.
If business rules are complex enough to cause bugs, that is a signal
to model. Skipping it "to save time" costs more time later.

**Terminology drift.** Using different words for the same concept in
different parts of the conversation. Once the ubiquitous language is
established, use it consistently. If the user drifts, gently redirect:
"Earlier we called that a 'fulfillment request' — is that still the
right term?"

**Modeling everything.** Not every entity needs to be in the model.
Include only entities that have non-obvious relationships or invariants.
If an entity is straightforward and self-explanatory, leave it out.
