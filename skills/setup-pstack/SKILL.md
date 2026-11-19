---
name: setup-pstack
description: Configure which Google Antigravity models and subagent tiers pstack uses per role and at what reasoning budget. Detects your live available models via `swarm{action:"models", all:true}` and writes `~/.gemini/config/pstack-models.md`. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

# Setup pstack

Write `~/.gemini/config/pstack-models.md`, a standalone configuration file that sets pstack's model per role across both Antigravity's subagent/workflow tiers (`invoke_subagent`, `run_workflow`) and exact multi-vendor Swarm models (`swarm`).

## Steps

### 1. Detect available models

Call `swarm{action:"models", all:true}` to enumerate every live model slug, display name, and current quota available in this Antigravity account. That is the authoritative source. If the `swarm` tool is unavailable, ask the user to confirm which models they have access to. Never write a real slug you have not confirmed is available.

The subagent/workflow tiers (`inherit`, `pro`, `flash`, `flash_lite`) are always valid for `invoke_subagent` and `run_workflow`. For Swarm roles, `inherit` means omit `model` so the worker runs on the parent chat's active model.

### 2. Load current state

The default role-to-model mapping is the shape shown in step 5 below. If `~/.gemini/config/pstack-models.md` already exists, read it and treat its `# budget` line and role lines as the current choices. Otherwise start from the step 5 defaults. Drop any retired role lines not present in step 5, and tell the user which lines you dropped.

### 3. Budget, map, and confirm

**(a) Ask for a budget.** Use `ask_question` with these three options, noting the current budget when the file already records one (or noting that `large` matches the defaults):

- `large — xhigh reasoning (Recommended)`
- `medium — high reasoning`
- `small — medium reasoning`

**(b) Apply it.** Build the working table from the defaults, keeping any role the user previously customized by family, list, or `inherit`.

Each role has a target effort moved by the budget on the ladder `xhigh` > `high` > `medium` > `low`:

- `large` keeps the role's default effort (code roles at `xhigh`, panels and workers at `high`; subagent tiers: code/judgment `inherit`, routine `flash`).
- `medium` lowers every exact slug one step (`xhigh` → `high`, `high` → `medium`; subagent tiers: code/judgment `inherit`, routine `flash`).
- `small` lowers every exact slug two steps (`xhigh` → `medium`, `high` → `low`; subagent tiers: code/judgment `flash`, routine `flash_lite`).

No role runs above `xhigh`, and targets at the bottom of the ladder stay there. Set the effort token (the trailing `-xhigh`, `-high`, `-medium`, or `-low`) of each real slug to the role's target. If that exact slug is not in the detected set (for example, Claude Opus 5.5 and Gemini 4 Argon top out at `high`, and GPT-OSS 120B runs at `medium`), pick the same family's detected slug with the highest effort at or below the target; otherwise mark the role as needing a choice. Leave `inherit` unchanged.

**(c) Show the roles and confirm.** Present a compact table of every role, its mapped model or tier, and current quota from step 1. Mark any slug not in the detected set as needing a choice. Ask with `ask_question` whether to accept as-is or customize specific roles.

Notes for panel roles:

- `arena runners` and `interrogate reviewers` are comma-separated lists. One Swarm worker runs per entry (including `inherit` entries), so list length sets the fan-out.
- `arena cross-judge pool` is an ordered preference list, but Arena spawns one judge from a vendor different from the parent chat's vendor (`gemini-*` = Google, `claude-*` = Anthropic, `gpt-*` = OpenAI/OSS). `inherit` never cross-judges.
- `pstack-swarm workers` is the default model when `/pstack-swarm` runs via `swarm`; deterministic `run_workflow` fan-outs use the subagent tier roles unless a race pins explicit models per arm.

### 4. Validate

Every real slug written must appear in the live `swarm{action:"models", all:true}` set (at `xhigh` or below). Subagent tier roles must be one of `inherit`, `pro`, `flash`, `flash_lite`. `inherit` always passes. If any chosen slug is unavailable, stop and ask again.

### 5. Write the configuration

Write `~/.gemini/config/pstack-models.md` by overwriting the entire file so re-runs are idempotent:

```markdown
# pstack model configuration for Google Antigravity. One line per role. Delete a line to fall back to the skill default.
# Subagent / workflow tiers (`invoke_subagent`, `run_workflow`): inherit, pro, flash, flash_lite.
# Exact Swarm slugs (from `swarm{action:"models", all:true}`): used for multi-model `swarm` panels, races, and cross-vendor reviews.
# Setting any role to `inherit` runs it on the parent chat's active model.
# defaults: agy-1
# budget: large (xhigh)
subagent tier (code, judgment): inherit
subagent tier (routine, scans): flash
feature, refactoring: gemini-4-neon-xhigh
bug-fix: gemini-4-neon-xhigh
perf-issue: gemini-4-neon-xhigh
hillclimb: gemini-4-neon-xhigh
judgment and prose: gemini-4-neon-high
pstack-swarm workers: gemini-4-neon-high
arena runners: gemini-4-neon-high, claude-opus-5-5-high, gemini-4-hydrogen-high
arena cross-judge pool: claude-opus-5-5-high, gemini-4-neon-high, gpt-oss-120b-medium
interrogate reviewers: gemini-4-neon-high, claude-opus-5-5-high, gemini-4-hydrogen-high
```

### 6. Confirm

Tell the user `~/.gemini/config/pstack-models.md` was written and takes effect immediately in pstack skills. Re-running `/setup-pstack` updates it.

### 7. Offer a verification skill (optional)

Check whether the active project has a `verify-*` skill under `.agents/skills/` (or an existing end-to-end harness). If not, offer once: "Want a project-local verification skill so agents can drive the app the way a user does and prove changes work? I can generate one with `/create-verification-skill`." On yes, run `/create-verification-skill`. On no, move on without pushing.

### 8. Offer a formal verification skill (optional)

Check whether the project already has a formal verification skill under `.agents/skills/`. If not, offer once: "Want a formal verification skill so agents can prove a key invariant holds in every case in scope, not only the cases tests reach? I can generate one with `/create-formal-verification-skill`." On yes, run `/create-formal-verification-skill`. On no, move on without pushing.
