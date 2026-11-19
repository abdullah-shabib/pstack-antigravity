# Cursor `pstack` → Google Antigravity Mapping

This repository maintains a native Google Antigravity port of [cursor/plugins `pstack`](https://github.com/cursor/plugins/tree/main/pstack). Instead of translating Cursor concepts at runtime, every skill, playbook, agent, and script is adapted directly to Antigravity's native primitives.

## Tool & Primitive Mapping

| Upstream Cursor `pstack` | Google Antigravity Native |
| :--- | :--- |
| `Task` subagent (`subagent_type: generalPurpose`) | `invoke_subagent` (`TypeName: "poteto-agent"` or `"self"`), or `run_workflow` `agent(...)` |
| `Task` with `readonly: true` | `invoke_subagent` with built-in `TypeName: "research"` |
| `Task` with `environment: "cloud"` / git worktrees | `Workspace: "share"` (shared git directory, isolated working copy) or `Workspace: "branch"` (full clone) on `invoke_subagent`, `run_workflow`, and `swarm` |
| `Task` with `run_in_background: true` | Default behavior for `invoke_subagent`, `run_workflow`, and `swarm` |
| `Task` with `resume` | `send_message` to the existing subagent `conversationId` |
| `AskQuestion` | Native `ask_question` tool |
| Multi-model `arena` / `interrogate` / cross-judge | Native `swarm` tool (`swarm{action:"models", all:true}`, `swarm{action:"add", model, workspace:"share"}`, `open_board` UI pill, `.system_generated/swarm/plan.json` Overview via `swarm_pane`, and in-place `swarm{action:"model"}` quota switching) |
| Deterministic `/swarm` fan-out & races | Renamed `/pstack-swarm` (avoids shadowing Antigravity's built-in `swarm` skill); uses `run_workflow` (`parallel()`, `pipeline()`, `phase()`, typed `schema`) and native `swarm` for multi-model races |
| `control-ui` (`cursor-team-kit`) | Antigravity's built-in `browser` subagent + project-local `.agents/skills/verify-<app>/` |
| `/loop` & Cursor Automations | Native `schedule` tool (one-shot timers + recurring cron), `/goal`, `/schedule`, and built-in `automation` skill |
| Todolist tool | Conversation task checklist artifact (`<appDataDir>/brain/<conversation-id>/`) or inline phase checklist |
| `~/.cursor/rules/pstack-models.mdc` | `~/.gemini/config/pstack-models.md` (read on-demand by pstack skills; zero always-on token tax on casual chats) |
| `.cursor/skills/` & `~/.cursor/skills/` | `.agents/skills/` & `~/.gemini/config/skills/` |
| `.cursor-plugin/plugin.json` | Antigravity `plugin.json` (strict manifest fields only) |
| `~/.cursor/projects/<slug>/agent-transcripts/` | `<appDataDir>/brain/<conversation-id>/.system_generated/logs/transcript.jsonl` & `transcript_full.jsonl` |

## Model Architecture

Antigravity exposes two complementary model selection surfaces, and `/setup-pstack` configures both in `~/.gemini/config/pstack-models.md`:

1. **Subagent & Workflow tiers** (`invoke_subagent` `Model`, `run_workflow` `model`): `inherit`, `pro`, `flash`, `flash_lite`.
2. **Exact Multi-Vendor Swarm slugs** (`swarm{action:"models", all:true}`): live-discovered exact slugs with effort suffixes (`xhigh`, `high`, `medium`, `low`) and live quota reporting across vendors. Model access depends on your Antigravity plan and org policy (Free, Google AI Pro, Ultra, Enterprise — see https://antigravity.google/docs/models/), and models are added or retired over time. `/setup-pstack` and every multi-model skill resolve slugs live against `swarm{action:"models", all:true}` rather than relying on a fixed list:
   - **Google (`gemini-*`)**: e.g. `gemini-4-carbon-*`, `gemini-4-neon-*`, `gemini-4-hydrogen-*`, `gemini-4-argon-*`, `gemini-3.8-flash-*` (and any newer generations added later)
   - **Antigravity Orchestrator (`gemini-pro-orchestrator-*`)**: fixed composite slugs with no effort suffix (e.g., Orchestrator Carbon/Neon/Argon; see https://antigravity.google/docs/models#orchestrator) that dynamically hand off between frontier planning and fast Hydrogen execution. Ideal for running `/poteto-mode` in the main chat or for code/execution roles at the `medium` budget, while standalone models remain the `large` default and the choice for read-only judgment roles.
   - **Anthropic (`claude-*`, plan-dependent)**: e.g. `claude-opus-5-5-*`, `claude-sonnet-5-5-*` (and any newer generations added later)
   - **Other vendors (plan-dependent)**: discovered dynamically from `swarm{action:"models", all:true}` by leading prefix
   - **Claude quota conservation:** because third-party Claude allowances on Google Antigravity plans are very tight, defaults keep heavy code-generation, `/pstack-swarm`, `arena runners`, and `interrogate reviewers` on diverse Gemini families, and reserve Claude for single low-volume read-only cross-vendor judgment passes (`arena cross-judge pool` and `show-me-your-work` trail review) — falling back to a distinct Gemini family whenever Claude quota is low or depleted. Users can opt Claude into heavier panel seats anytime via `/setup-pstack`.
   - **Forward/backward resilience:** newly added models are immediately selectable in `/setup-pstack`, and retired slugs in `~/.gemini/config/pstack-models.md` fall back automatically at runtime to the strongest live slug of the same family/vendor until you re-run `/setup-pstack`.

## Intentional Divergences from Upstream

- **`skills/swarm` → `skills/pstack-swarm`**: Antigravity ships a built-in `swarm` skill for collaborative multi-agent teams. Keeping pstack's fan-out/race skill under `pstack-swarm` preserves both without shadowing.
- **`automations/benny` omitted**: Upstream's dormant Benny pack relies on Cursor-only webhook automations (`api2.cursor.sh`). In Antigravity, build scheduled triage flows with the built-in `automation` skill and `/schedule`.
- **No always-on rule file**: Model settings live in `~/.gemini/config/pstack-models.md` rather than a global always-on rule so installing `pstack` adds zero overhead to non-pstack conversations.
- **No external `cursor-team-kit` dependency**: UI verification uses Antigravity's built-in `browser` subagent, CLI verification uses isolated PTYs via `run_command`, and pre-commit slop cleanup is built directly into the `opening-a-pr` playbook alongside `/no-comments` and `/unslop`.

## Upstream Maintenance

Upstream tracking lives in [`../UPSTREAM.json`](../UPSTREAM.json). Run:

```bash
node scripts/sync-upstream.mjs --status
node scripts/sync-upstream.mjs --diff
node scripts/sync-upstream.mjs --apply-passthrough
node scripts/check-plugin.mjs
```
