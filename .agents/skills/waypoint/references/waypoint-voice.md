# Waypoint Voice

A writing style guide for waypoint comment blocks. Load this reference before
writing or polishing waypoint text. Every principle here serves one goal:
a reader encountering waypoints for the first time can understand what they
are looking at within ten seconds.

## Guiding Metaphor

Waypoint blocks are trail markers. A trail marker succeeds when a hiker who
has never been on this path can glance at it and know: where they are, where
the trail leads, and how to follow it. The marker earns trust through clarity,
warmth, and directness — without being verbose.

## Audience

Write every piece of waypoint text for a reader who:

- Has opened this file for the first time
- Has never encountered the waypoint system before
- Wants to know two things: **"What does this file do here?"** and **"Where do I look next?"**
- Will decide within seconds whether this comment is worth reading

## Principles

### Concrete over abstract

Describe what the file *does*, not the category it belongs to.

| Vague | Concrete |
|-------|----------|
| build configuration | compiles the browser bundle and uploads sourcemaps to Sentry |
| CI trigger | triggers the Docker build when code merges |
| deployment config | deploys the upload-assets job to Kubernetes |

### Active over passive

Name the actor and the action. When a description hides who does what, the
reader has to reconstruct the relationship themselves.

| Passive | Active |
|---------|--------|
| RELEASE is passed to the build | passes the release version into the Docker build |
| sourcemaps are uploaded | uploads sourcemaps after the build completes |
| build args are injected | injects build arguments into this image |

### Orient first, then detail

Lead with the relationship, follow with specifics. The reader needs the
directional context before the technical payload.

| Detail-first | Orient-first |
|--------------|--------------|
| Sentry browser sourcemap upload plugin configuration | uploads browser sourcemaps to Sentry after the build |
| Datadog RUM SDK version configuration | reads the release version at runtime for Datadog monitoring |

### Purpose over mechanics

Name the reason an action exists, not just the action itself. A reader who
understands *why* something happens can judge whether it's necessary and debug
it when it breaks. Action without purpose is inventory — the reader sees motion
but can't tell if it matters.

Complete the thought: if you can append "so that…" and the answer adds
information, the original description was hiding its purpose.

| Mechanics only | Purpose-driven |
|----------------|----------------|
| creates deployment markers | marks releases in monitoring so errors correlate with specific deployments |
| schedules the asset upload as a job | schedules asset uploads per environment so each CDN path serves the correct files |
| uploads sourcemaps to Sentry | uploads sourcemaps to Sentry so minified errors resolve to original source |

### Self-evident over clever

Prefer familiar words over internal shorthand. Abbreviations that carry
meaning only within the team become opaque to anyone else.

| Shorthand | Spelled out |
|-----------|-------------|
| DD RUM config | Datadog Real User Monitoring configuration |
| rspack build + sourcemap uploads | runs the rspack build and uploads sourcemaps |
| k8s upload assets | Kubernetes job that uploads static assets |

### Warm over telegraphic

A trail marker is a sentence, not a database label. Write complete thoughts
that guide the reader — but keep each to one line.

| Telegraphic | Warm |
|-------------|------|
| CI trigger | CI triggers the Docker build when code merges to main |
| sourcemap upload | uploads sourcemaps so error tracking can map to original source |
| deployment marker | sets a deployment marker that links releases to monitoring |

## Shaping Role Descriptions

The role description is the first line a reader sees after the waypoint header.
It answers: *"What does this file do in this pipeline?"*

**Shape each role description to:**

- Start with a verb (runs, uploads, triggers, reads, passes, builds, configures)
- Use active voice with a clear subject implied by the file itself
- Fit on a single line — aim for under 80 characters
- Name the meaningful action, not the file type or technology stack
- Include purpose — a reader should understand *why* this action matters, not just that it happens

| Before | After |
|--------|-------|
| rspack build + sourcemap uploads | runs the rspack build and uploads sourcemaps |
| passes RELEASE and build args to Docker | passes the release version and build arguments into Docker |
| RUM SDK version field (sink) | reads the release version at runtime for Datadog RUM |
| Sentry server sourcemap upload | uploads server-side sourcemaps to Sentry |

## Shaping Relationship Descriptions

The `— <description>` after each neighbor answers: *"What does that other file
do, and why does it connect to this one?"*

**Shape each relationship description to:**

- Start with a verb describing what the *neighbor* does
- Explain the connection, not just the neighbor's existence
- Stay under 60 characters
- Orient from the neighbor's perspective ("passes X into this build" rather
  than "receives X from that file")

| Before | After |
|--------|-------|
| — passes RELEASE to Docker | — passes the release version into this build |
| — Sentry browser sourcemap upload | — uploads browser sourcemaps to Sentry |
| — DD deployment marker must match | — sets the deployment marker (must match this release) |
| — CI triggers Docker build | — triggers this Docker build when code merges |

## Proofreading Checklist

Apply these checks to every waypoint block before finalizing:

1. **Verb-first**: Does every role and relationship description start with an action verb?
2. **Actor visible**: Can the reader tell who does what without inferring?
3. **Self-contained**: Would someone unfamiliar with the project understand the gist?
4. **One line each**: Does every description fit on a single line?
5. **Spelled out**: Are abbreviations expanded on first use?
6. **Warm tone**: Does the text read as guidance, or as a terse log entry?
7. **Purpose visible**: Does every role description answer *why* this action matters, not just *what* it does?
8. **Legend present**: Does the closing include the symbol legend and search hint?

## Common Transformations

Patterns that recur in waypoint text and how to resolve them:

**Noun pileups** — stacked nouns without verbs that read like database labels.
Resolve by inserting the verb the nouns imply.

> "Sentry server sourcemap upload configuration plugin"
> → "configures the Sentry plugin to upload server sourcemaps"

**Assumed context** — references to systems or workflows that carry meaning only
if the reader already knows the codebase. Resolve by stating what the system does
in this specific pipeline step.

> "DD RUM version sink"
> → "Datadog RUM SDK reads the release version at runtime"

**Telegraphic fragments** — descriptions that drop verbs to save characters.
Resolve by restoring the verb and completing the thought.

> "sourcemap upload"
> → "uploads sourcemaps after the build completes"

**Passive relationships** — neighbor descriptions that hide who does what.
Resolve by naming the actor (the neighbor file) and its action.

> "— build args are passed"
> → "— passes build arguments into this image"

**Purpose-free actions** — descriptions that name the gesture but hide why it
matters. The reader sees something happening but can't tell if it's necessary.
Resolve by completing the sentence with "so that…" and folding the answer in.

> "creates Sentry and Datadog deployment markers"
> → "marks this release in Sentry and Datadog so errors correlate with deployments"
