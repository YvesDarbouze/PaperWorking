<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:agent-harmony-protocol -->
# 🤖 Multi-Agent Harmony Protocol

This workspace is actively maintained by human developers as well as multiple AI agents (e.g., Google Deepmind's Antigravity, Anthropic's Claude Code, and IDE agents like Cursor/Windsurf). 

To ensure harmony, ALL agents MUST strictly follow these rules:

1. **Shared State (The Baton):** If you are leaving an incomplete or complex task for another agent, leave a brief summary note in `.agents/handoff.md`.
2. **Read Before Writing:** Always check `.agents/handoff.md` (if it exists) when initializing a new task to see the latest context or warnings left by the previous agent.
3. **Artifact Restraint:** Antigravity agents create `implementation_plan.md` and `task.md` inside their ephemeral `.gemini/` directories, but Claude Code might not see those. If a permanent architectural decision is made, document it in `DesignSystem.md` or a `.md` doc in the repo root so all agents have access.
4. **Tool Integrity:** Do not overwrite code blindly. Validate types and lint errors before finalizing a modification.
5. **Acknowledge the Team:** You are part of an AI engineering team. Work collaboratively on the codebase without destroying another agent's work.
<!-- END:agent-harmony-protocol -->
