---
name: pstack-swarm
description: "Fan out N parallel workers across slices, coverage matrices, or races, drain them, and return one consolidated report. Uses Antigravity's `run_workflow` for deterministic fan-out/fan-in and native `swarm` for multi-model races or collaborative runs. Use for /pstack-swarm, 'fan out across packages', or parallel coverage, races, gauntlets, and exploration."
---

# Pstack swarm

This skill is named `pstack-swarm` so it coexists cleanly with Google Antigravity's built-in `swarm` skill. Track one checklist item per phase before launching anything:

1. Frame
2. Fan out
3. Aggregate
4. Report

## Phase A: Frame

1. State the done predicate and the artifact or report the fan-out must return.
2. Choose the shape. Partition into slices, race N workers on identical briefs, or mix both. For a race or mixed shape, declare `first pass`, `rank all`, or `best-of` before spawning.
3. Choose the Antigravity execution engine:
   - **`run_workflow` (default for slices, coverage matrices, and structured checks):** write a short Python script using `parallel()`, `phase()`, and a strict JSON `schema` so every worker returns `{slice, status, shas, method, evidence, issues}` cleanly. Set `workspace="share"` when workers write or build concurrently, or `workspace="inherit"` for read-only checks. Read `~/.gemini/config/pstack-models.md` for `subagent tier (code, judgment)` (`inherit` default) or `subagent tier (routine, scans)` (`flash` default).
   - **Native `swarm` (default for multi-model races, explicit per-arm model comparisons, or long-running collaborative checks):** read `pstack-swarm workers` from `~/.gemini/config/pstack-models.md` (default `gemini-4-carbon-high` if available on the user's plan, else `gemini-4-neon-high`, or omit `model` for `inherit`). Verify availability and quota with `swarm{action:"models", all:true}` before pinning slugs. For a model race, name each arm's model up front.
4. Give each worker its own writable output or isolated workspace (`workspace="share"` / `"branch"`) when it writes. When workers verify or measure commits, each brief names the exact SHAs. A measurement brief also names the method (sample count, what one sample is, order). The worker records both in its result.

## Phase B: Fan out

Launch all N workers concurrently:

- **With `run_workflow`:** pass `parallel(slices, lambda s: agent(..., schema=RESULT_SCHEMA, role=f"Check {s}", workspace=..., model=...))`.
- **With native `swarm`:** name the swarm with `swarm{action:"title"}`, then spawn workers with `swarm{action:"add", name, tasks/brief, model, workspace:"share"}` (or `workspace:"inherit"` for read-only workers). Have each worker post `@coordinator [done]` with its structured verdict. Wait with `swarm_wait`.

Every brief stands alone. Include the goal, scope, exact slice or race arm, how to verify, and what to report. Reports use `PASS`, `ISSUES`, or `BLOCKED` with evidence. A worker that can prove a defect reports `ISSUES` and lists every issue it can prove, not only the first.

If a worker drops out or fails, proceed with N-1 and note it. (In `run_workflow`, wrap per-item `async def` helpers with `try/except` when you want partial results instead of cancelling siblings.)

## Phase C: Aggregate

Read the terminal results. Drop a result that does not record the SHAs and method its brief names, and respawn that worker once. After a second miss, record a gap. A gap does not count as a pass.

For coverage, every required slice needs a result. For a race, apply the selection rule declared up front (`first pass`, `rank all`, or `best-of`). Do not paste raw worker dumps. If you used native `swarm` with `"share"` / `"branch"` workspaces, land any needed commits before calling `swarm{action:"kill"}`.

## Phase D: Report

Return one consolidated in-chat report with a result table, issue one-liners, gaps or dropouts, and the race rule when used.
