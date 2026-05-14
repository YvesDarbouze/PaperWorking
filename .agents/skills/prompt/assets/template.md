# Output template

The artifact has seven sections. Fill each one. A section either holds real content or carries a one-line gap note that names the absence. Padding is noise; structured absence is signal.

## Perspective

Who or what the agent is, and the stance it takes. Domain authority and orientation. State the role plainly. Avoid compliance pressure phrasing.

## Task

What the agent is being asked to do. Concrete enough that an agent reading cold can act without further interpretation.

End with one or two sentences that name what is at risk and why this matters. Stakes ride at the bottom of Task. There is no separate Why section anywhere else in the artifact.

## Context

Prior knowledge, files, paths, repo state, prior decisions, naming conventions, and background the agent already has. Anything that prevents fabrication and reduces guesswork.

## Tooling

Tools, MCPs, skills, scripts, and commands the agent may call. Name each one. Omit anything the agent will not need.

## Context To Gather

Prerequisite checks the agent runs before producing output. Verifications, lookups, file reads, and questions the agent answers for itself first. The agent does not start emitting until these complete or are explicitly waived.

## Constraints

Verifiable requirements. A constraint is something a second reader can score — a file written, a command run, a schema matched, a test passing, a register obeyed. State each one in a form that admits a yes-or-no verification, not a judgment call.

## Invitations

Judgment criteria the agent interprets in context. Permission-to-fail clauses, honesty defaults, transparency asks, decisions to surface rather than make silently, distinctions between observing and inferring. An invitation cannot be mechanically scored; it shapes the agent's stance and tells the agent what to flag rather than what to deliver.
