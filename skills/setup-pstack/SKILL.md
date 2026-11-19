---
name: setup-pstack
description: Configure which Google Antigravity models and subagent tiers pstack uses per role and at what reasoning budget. Detects your live available models via `swarm{action:"models", all:true}` and writes `~/.gemini/config/pstack-models.md`. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

# Setup pstack

Write `~/.gemini/config/pstack-models.md`, a standalone configuration file that sets pstack's model per role across both Antigravity's subagent/workflow tiers (`invoke_subagent`, `run_workflow`) and exact multi-vendor Swarm models (`swarm`).

## Steps

### 1. Detect available models

Call `swarm{action:"models", all:true}` to enumerate every live model slug, display name, and current quota available in this Antigravity account. That is the authoritative source — model access varies significantly by Antigravity plan and org policy (Free, Google AI Pro, Ultra, Enterprise; see https://antigravity.google/docs/models/). Some plans include `gemini-4-carbon-*` and third-party models (`claude-*`, `gpt-*`), while others only expose a subset of Gemini models. If the `swarm` tool is unavailable, ask the user to confirm which models they have access to. Never write a real slug you have not confirmed is available.

The subagent/workflow tiers (`inherit`, `pro`, `flash`, `flash_lite`) are always valid for `invoke_subagent` and `run_workflow`. For Swarm roles, `inherit` means omit `model` so the worker runs on the parent chat's active model.

### 2. Load current state & resolve strongest-first defaults

pstack defaults to the **strongest available model** on the user's plan (ignoring cost/speed at the `large` budget; `medium`, `small`, and `inherit` are how you tune for quota). Never hardcode a closed list of models — derive **vendor** dynamically from the leading prefix (`gemini-*` = Google, `claude-*` = Anthropic, any other prefix = its own vendor) and **family** by stripping a trailing effort suffix (`-xhigh`, `-high`, `-medium`, `-low`) when present. Composite slugs with no effort suffix — such as Antigravity's **Orchestrator** models (`gemini-pro-orchestrator-*`, see https://antigravity.google/docs/models#orchestrator) — are their own fixed family under the Google vendor and never have an effort token appended or stripped.

Resolve the default starting table from the step 1 live detected list so newly added models and vendors are picked up automatically, removed models never break setup, and **third-party Claude allowance is conserved** (Claude usage limits on Google Antigravity plans are very tight, so defaults reserve Claude for low-volume, high-leverage read-only cross-vendor judgment rather than heavy parallel code generation):

- **Primary flagship Google seat (`<google-primary>`):** strongest detected Google flagship (any newer generation such as `gemini-5-*` if present, then `gemini-4-carbon` → `gemini-4-neon` → `gemini-4-hydrogen` → `gemini-4-argon` → `gemini-3.8-flash` → strongest detected `gemini-*`, or `inherit` if none).
- **Secondary & tertiary Google seats (`<google-secondary>`, `<google-tertiary>`):** the next strongest distinct detected `gemini-*` families (e.g., `gemini-4-neon` + `gemini-4-hydrogen` when primary is Carbon; `gemini-4-hydrogen` + `gemini-4-argon` when primary is Neon; repeating `<google-primary>` only if fewer distinct Gemini families exist).
- **Heavy panel roles (`arena runners`, `interrogate reviewers`):** default to distinct **Gemini** families (`<google-primary>`, `<google-secondary>`, `<google-tertiary>`) so parallel generation and adversarial testing don't exhaust tight Claude quotas. Users can still opt Claude into these lists in step 3(c) — warn them once that adding Claude to multi-runner panels uses Claude allowance quickly.
- **Cross-vendor judgment seat (`<other-vendor-primary>`):** strongest detected non-Google flagship (any newer Claude generation if present, then `claude-opus-5-5` → `claude-sonnet-5-5` → strongest detected `claude-*` → strongest detected model from any other third-party vendor). Reserved by default for **`arena cross-judge pool`** (and `show-me-your-work` trail review), where one short read-only pass gives cross-vendor diversity at minimal quota cost. On Google-only plans (or when third-party quota is depleted), fall back to distinct Gemini families.
- **Cross-vendor judge pool (`arena cross-judge pool`):** `<other-vendor-primary>` (when available), `<google-primary>`, `<google-secondary>`.

If `~/.gemini/config/pstack-models.md` already exists, read it and treat its `# budget` line and role lines as the current choices. Check every saved real slug against the live step 1 list:

- **Retired / removed slugs:** if a saved slug is no longer in `swarm{action:"models", all:true}`, replace it with the strongest live slug of the same family (or same vendor, or the role's resolved default if that vendor is gone), and list every retired slug you replaced.
- **Retired role names:** drop any line whose role is not in step 5 and tell the user which lines you dropped.
- **Newly added models:** if step 1 detects a stronger or newly added model family not yet in `~/.gemini/config/pstack-models.md`, call it out in step 3(c) so the user can opt into it.

### 3. Budget, map, and confirm

**(a) Ask for a budget.** Use `ask_question` with these three options, noting the current budget when the file already records one (or noting that `large` matches the defaults):

- `large — xhigh reasoning (Recommended)`
- `medium — high reasoning`
- `small — medium reasoning`

**(b) Apply it.** Build the working table from the resolved defaults, keeping any role the user previously customized by family, list, or `inherit`. Derive a slug's family dynamically by stripping its trailing effort token (`-xhigh`, `-high`, `-medium`, or `-low`).

Each role has a target effort moved by the budget on the ladder `xhigh` > `high` > `medium` > `low`:

- `large` keeps the role's default standalone frontier model and effort (code roles at `xhigh`, panels and workers at `high`; subagent tiers: code/judgment `inherit`, routine `flash`).
- `medium` lowers every effort-suffixed slug one step (`xhigh` → `high`, `high` → `medium`; subagent tiers: code/judgment `inherit`, routine `flash`). If an Antigravity **Orchestrator** model (`gemini-pro-orchestrator-*`, preferring Carbon → Neon → Argon) is detected in step 1, offer it as the recommended option for code/execution roles (`feature, refactoring`, `bug-fix`, `perf-issue`, `hillclimb`, `pstack-swarm workers`) — it pairs frontier planning with fast Hydrogen execution and saves quota — while keeping standalone reasoning models for read-only judgment roles (`judgment and prose`, `arena cross-judge pool`).
- `small` lowers every effort-suffixed slug two steps (`xhigh` → `medium`, `high` → `low`; subagent tiers: code/judgment `flash`, routine `flash_lite`).

No role runs above `xhigh`, and targets at the bottom of the ladder stay there. For slugs with a trailing effort suffix, set the effort token to the role's target; if that exact slug is not in the detected set (for example, if a family tops out at `high` or only exposes `medium`), pick the same family's detected slug with the highest effort at or below the target, otherwise mark the role as needing a choice. Leave `inherit` and fixed composite slugs without an effort suffix (such as `gemini-pro-orchestrator-*`) unchanged across budget shifts.

**(c) Show the roles and confirm.** Present a compact table of every role, its mapped model or tier, and current quota from step 1. Mark any slug not in the detected set as needing a choice. Ask with `ask_question` whether to accept as-is or customize specific roles.

Notes for panel roles:

- `arena runners` and `interrogate reviewers` are comma-separated lists. One Swarm worker runs per entry (including `inherit` entries), so list length sets the fan-out.
- `arena cross-judge pool` is an ordered preference list, but Arena spawns one judge from a vendor different from the parent chat's vendor (`gemini-*` = Google, `claude-*` = Anthropic, `gpt-*` = OpenAI/OSS). `inherit` never cross-judges.
- `pstack-swarm workers` is the default model when `/pstack-swarm` runs via `swarm`; deterministic `run_workflow` fan-outs use the subagent tier roles unless a race pins explicit models per arm.

### 4. Validate

Every real slug written must appear in the live `swarm{action:"models", all:true}` set (at `xhigh` or below). Subagent tier roles must be one of `inherit`, `pro`, `flash`, `flash_lite`. `inherit` always passes. If any chosen slug is unavailable, stop and ask again.

### 5. Write the configuration

Write `~/.gemini/config/pstack-models.md` by overwriting the entire file so re-runs are idempotent. Example shape (resolved against the user's plan — using `gemini-4-carbon-*` where available, or `gemini-4-neon-*` where Carbon is not on the plan):

```markdown
# pstack model configuration for Google Antigravity. One line per role. Delete a line to fall back to the skill default.
# Subagent / workflow tiers (`invoke_subagent`, `run_workflow`): inherit, pro, flash, flash_lite.
# Exact Swarm slugs (from `swarm{action:"models", all:true}`): used for multi-model `swarm` panels, races, and cross-vendor reviews.
# Setting any role to `inherit` runs it on the parent chat's active model.
# defaults: agy-1
# budget: large (xhigh)
subagent tier (code, judgment): inherit
subagent tier (routine, scans): flash
feature, refactoring: <google-primary at xhigh or highest available>
bug-fix: <google-primary at xhigh or highest available>
perf-issue: <google-primary at xhigh or highest available>
hillclimb: <google-primary at xhigh or highest available>
judgment and prose: <google-primary at high>
pstack-swarm workers: <google-primary at high>
arena runners: <google-primary at high>, <google-secondary at high>, <google-tertiary at high>
arena cross-judge pool: <other-vendor-primary at high (if available)>, <google-primary at high>, <google-secondary at high>
interrogate reviewers: <google-primary at high>, <google-secondary at high>, <google-tertiary at high>
```

Replace every `<...>` placeholder with the concrete detected slug before writing the file.

### 6. Confirm

Tell the user `~/.gemini/config/pstack-models.md` was written and takes effect immediately in pstack skills. Re-running `/setup-pstack` updates it.

### 7. Offer a verification skill (optional)

Check whether the active project has a `verify-*` skill under `.agents/skills/` (or an existing end-to-end harness). If not, offer once: "Want a project-local verification skill so agents can drive the app the way a user does and prove changes work? I can generate one with `/create-verification-skill`." On yes, run `/create-verification-skill`. On no, move on without pushing.

### 8. Offer a formal verification skill (optional)

Check whether the project already has a formal verification skill under `.agents/skills/`. If not, offer once: "Want a formal verification skill so agents can prove a key invariant holds in every case in scope, not only the cases tests reach? I can generate one with `/create-formal-verification-skill`." On yes, run `/create-formal-verification-skill`. On no, move on without pushing.
