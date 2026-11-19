---
name: automate-me
description: "Use for \"automate me\", \"create/update/refresh my -mode skill\", \"turn/capture my preferences or working style into a skill\", or wanting agents to follow how the user works. Drafts or revises a personal -mode skill in Google Antigravity, optionally pulling fresh evidence from recent transcripts."
---

# Automate me

A guided flow for turning the user's working conventions into an Antigravity skill agents will follow. The output is one `-mode` skill tailored to them (e.g. `jay-mode`, `priya-mode`).

This skill orchestrates three parts: an inline mining pass (step 1), Antigravity's `agy-customizations` skill authoring conventions (step 4), and the **unslop** skill (prose discipline). It sequences them. It doesn't replace them.

## Flow

### 0. Check for an existing skill

Look for `.agents/skills/*-mode/SKILL.md`, `.agents/skills/**/*-mode/SKILL.md`, and `~/.gemini/config/skills/*-mode/SKILL.md` matching the user's handle. If one exists, confirm intent with `ask_question` (unless they already said "update my skill" or similar):

- Update the existing skill (Recommended for repeat runs)
- Start fresh (rare, ask why before doing it)

Update mode changes the rest of the flow:

- Step 1 mines only history since the skill was last edited (`git log -1 --format=%cI <path>`).
- Step 2 asks what's changed or missing, not what to capture from zero.
- Step 4 edits the existing file in place. Preserve sections the user hasn't contradicted. Revise ones with new evidence. Add new sections only for genuinely new rules.

### 1. Mine their history

Locate the active workspace's recent conversations under `<appDataDir>/brain/*/.system_generated/logs/transcript.jsonl` that reference the active workspace path. Do not pull preferences from unrelated private workspaces unless the user explicitly asks.

Survey recent conversations within that scope for recurring patterns. Use `run_workflow` with `parallel()` and `model="flash"` (or parallel `invoke_subagent` calls with `TypeName: "research"`, `Model: "flash"`) across 3 time slices of recent history (e.g. last 2-4 weeks). Each slice miner looks for these signals and returns a short structured list with conversation links (`[chat](conversation://<id>)`):

- Response preferences (length, tone, format, "dumb it down" corrections)
- Delegation habits (subagents, `run_workflow`, `swarm`, models, parallelism)
- Verification posture (what "done" means, unit tests vs live repro via `browser` / CLI, reviewers)
- Code and prose discipline (style, principles cited, lint/format tools)
- Process conventions (worktrees, commits, PRs, review/merge tooling)
- Meta preferences (fixing skills mid-task, proposing new ones)

Cross-check across slices before elevating a signal. Patterns seen in 2+ slices are high-confidence. Lone signals are weak and usually get dropped.

### 2. Ask the user directly

Mining misses intent that hasn't come up yet. Use `ask_question` (structured multi-choice) rather than asking the user to type from scratch.

Shape: one or two questions with 4-6 options each, `is_multi_select: true` for category questions. Start broad ("Which areas matter most?"), then follow up on selected areas with specific options. After the structured rounds, one free-form chat question catches anything the options missed.

Don't dump 20 questions.

### 3. Cluster findings

Group the combined signals into sections. Common ones (use only what applies):

- **Response style**: length, tone, format.
- **Autonomy**: how much to do without asking, MCP tool use.
- **Understand first**: which skills to reach for when scoping or investigating a change.
- **Subagents & orchestration**: default, parallelism, model tiers, `run_workflow` / `swarm`.
- **Prose / code discipline**: principles, lint tools, style guides.
- **Review and verify**: repro posture, verification skills, live-testing tools.
- **Process**: git worktrees, commits, PRs, review/merge tooling.
- **Skills**: skill-authoring habits, fix-the-skill-first, proposing new skills.

The **poteto-mode** skill shows the shape. Read it for granularity. Don't copy its content. The user's rules are not the same as poteto-mode's.

### 4. Draft the skill

Follow Antigravity's `agy-customizations` skill conventions (`SKILL.md` with YAML frontmatter `name` matching the folder name and a clear `description`). Placement:

- Preserve an existing mode skill's directory if updating.
- For a new mode skill, default to `.agents/skills/<handle>-mode/SKILL.md` in the project (or `~/.gemini/config/skills/<handle>-mode/SKILL.md` if the user wants it available globally across all projects).
- Handle: the user's first name or chosen identifier, lowercase kebab-case.
- Frontmatter `description`: trigger strictly on their name + `/<handle>-mode` + "work in their style", not on generic keywords like "write code" or "review PR", so it stays out of casual chats. Keep `description` as one YAML scalar (quoted or `>-`).

### 5. Iterate on prose

Apply the **unslop** skill to every line.

Show the draft to the user and take feedback. Expect multiple iterations. Cut ruthlessly. A mode skill is not a manual.

### 6. Land it

If placed in a git repository, work in a fresh branch or worktree off `main`, commit, and open a PR. Don't push to `main` directly. If placed in `~/.gemini/config/skills/`, verify it loads on the next turn.

## Guardrails

- **Don't overfit to one conversation.** A preference stated once and contradicted another time is noise. Require multiple instances before codifying it.
- **Don't be clever.** Restating other skills' contents, inventing metaphors, or writing "poetic" prose for an agent reader is cost without benefit. Keep it operational.
- **Reference, don't inline.** Other skills the user relies on should appear as path references, not pasted excerpts.
- **Keep sections minimal.** Only add a section if the user has a specific, non-default rule there. "Communicate clearly" is not a section. "Short paragraphs. Tables when comparing options. Bullets only when items are genuinely parallel." is.
- **Name conventions generic.** Use "the user" or "the human" in imperatives, not the author's first name.
- **Don't force symmetry.** If a user has no process rules worth writing down, skip the Process section entirely.

## Evaluation

A `-mode` skill is subjective output. Vibe-check with the user: does it read like them? Did it miss anything? Then ship.

## When not to use

- User wants a task-specific skill (not working conventions): follow `agy-customizations` directly, no mining required.
- User wants to capture one narrow workflow (e.g. "how I write commit messages"). That's a regular skill, not a mode skill.
