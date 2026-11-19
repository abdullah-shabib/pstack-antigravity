---
name: arena
description: "Spawn N parallel candidates at the same task across multiple models or approaches, cross-judge them, pick a base, and graft the strongest parts of the losers into it. Use for /arena, 'arena this', 'throw it in the arena', or when one attempt at a non-trivial artifact would lock in the wrong shape."
---

# Arena

Track one checklist item per phase (Frame, Fan out, Cross-judge, Pick, Graft, Verify) before launching anything.

## Phase A: Frame

Every candidate gets the same prompt, so the prompt is the contract.

1. State the artifact each candidate is producing.
2. Derive the rubric, 3-6 concrete gradeable criteria for what success looks like on *this* task. It is the picker's tool in Phase D. Candidates only see the task.
3. Read `~/.gemini/config/pstack-models.md` if present and pick the runners from `arena runners`. When unconfigured, default to diverse Gemini families to protect tight Claude allowances on Google plans: `gemini-4-carbon-high`, `gemini-4-neon-high`, and `gemini-4-hydrogen-high` (falling back to `gemini-4-neon-high`, `gemini-4-hydrogen-high`, and `gemini-4-argon-high` if `gemini-4-carbon-*` is not on the plan). Claude is reserved by default for the single read-only cross-judge pass in Phase C unless the user explicitly added Claude to `arena runners`.
   - Call `swarm{action:"models", all:true}` to verify each slug is available and check `quota_remaining`.
   - If every entry is `inherit` (or you want single-model speed), run Phase B via `run_workflow` with `parallel()` and `workspace="share"`.
   - When entries name distinct exact slugs, run Phase B via Antigravity's `swarm` tool so each candidate is pinned to its exact model.
   - If a configured slug is retired, unavailable, or low/out of quota (including a Claude runner whose tight quota pool is depleted), derive its family by stripping the trailing effort suffix (`-xhigh`, `-high`, `-medium`, `-low`) and its vendor from the leading prefix (`gemini-*`, `claude-*`, etc.), substitute the strongest live slug in that family (or next strongest available family, falling back to a distinct Gemini family when Claude quota is depleted), or drop the seat while keeping at least two runners. Note any substitution once and suggest re-running `/setup-pstack`.
   - Spawn more candidates for multiple design directions, or repeat one model when the work is generation-bound rather than judgment-sensitive.
4. Give each candidate its own isolated workspace (`workspace:"share"` or `"branch"` in `swarm` / `run_workflow`, or `/tmp/arena-<slug>/candidate-<n>/` for non-repo artifacts), per the **principle-separate-before-serializing-shared-state** skill.

## Phase B: Fan out

Launch all N candidates in parallel in one turn:

- **Via `swarm` (multi-model):**
  1. Name the swarm (`swarm{action:"title", title:"arena: <slug>"}`) and call `swarm{action:"add", name:"candidate-<n>", model:"<slug>", workspace:"share", brief:...}` for every candidate in the same turn (omit `model` for `inherit` entries; pass `fork:"coordinator"` if candidates need warm conversation context). Instruct each candidate to post `@coordinator [done]` with its artifact path, commit/diff summary, and short rationale naming alternatives considered and rejected (plus `Screenshot: <abs-path> | <caption>` under its `<appData>/brain/<conv-id>/` folder for visible UI work).
  2. Write `<appDataDir>/brain/<conversation-id>/.system_generated/swarm/plan.json` (per Antigravity's built-in `swarm_pane` schema: `goal`, `tasks`, `threads`) so the Swarm UI's Overview tab displays the arena goal and candidates cleanly. Do not add a narrator.
  3. End this turn with the `open_board` value returned by `swarm{action:"add"}` on its own line so the user gets the one-click Swarm UI pill. Board tools (`post_message`, `read_board`, `swarm_wait`) appear on the next turn — wait reactively or call `swarm_wait{since:<last-seq>}` starting on the following turn.
  4. If a waiting candidate hits quota mid-run, switch its model in place with `swarm{action:"model", name, model}` so it keeps its conversation and resumes instead of calling `kill` + `add`.
- **Via `run_workflow` (single-model / `inherit`):** use `parallel()` over the candidate list with `workspace="share"` and a structured `schema` returning `{artifact_path, summary, rationale}`.

Every candidate gets the identical task, the path to shared grounding, its own output path, and instructions to produce the artifact plus a short rationale.

If a candidate produces no output or errors out, proceed with N-1 and note the dropout.

## Phase C: Cross-judge

After all Phase B candidates complete, spawn one read-only judge from the `arena cross-judge pool` line in `~/.gemini/config/pstack-models.md` (by default the strongest live slug from each available vendor via `swarm{action:"models", all:true}`, such as `claude-opus-5-5-high`, `gemini-4-carbon-high`, `gemini-4-neon-high`).

- The judge must come from a vendor different from the parent chat's vendor (derive vendor from the leading prefix: `gemini-*` = Google, `claude-*` = Anthropic, any other prefix = its own vendor). Skip any retired or out-of-quota entry and pick the first live entry from another vendor.
- An `inherit` entry never cross-judges. If the user's Antigravity plan exposes only one vendor (for example a Google-only or Free plan), or no other-vendor model has remaining quota, either spawn a distinct model family on the same vendor and note that it is cross-family rather than cross-vendor, or skip Phase C and state why. If you do not know the parent's vendor, use the first real slug and note that the vendor check did not run.
- Spawn the judge via `swarm{action:"add", name:"judge", model:"<judge-slug>", workspace:"inherit", brief:...}` with explicit read-only instructions ("do not edit files") and update `plan.json` to include `judge`. Give it the rubric and each candidate's sanitized path label (`candidate-1`, `candidate-2`, ...) without revealing model names. If the judge hits quota mid-run, switch it in place with `swarm{action:"model", name:"judge", model:"<next-pool-slug>"}`.
- While you read in Phase D, the judge scores each candidate on each rubric criterion and recommends a base.

## Phase D: Pick a base

Read every candidate end to end before picking. Score each against the rubric criterion by criterion, not on holistic feel, and compare with the cross-judge when Phase C ran one. Agreement on the base confirms the pick. Disagreement means one of you is biased or the rubric was ambiguous. Read both rationales before deciding.

Pick the base a future maintainer can extend most easily without breaking invariants. When two feel tied, prefer the cleaner boundary or smaller API, per **principle-laziness-protocol**.

## Phase E: Graft

Walk each losing candidate once more for what is worth porting into the base, usually one or two things per candidate, not most of it. Fold each graft in by hand, per **principle-redesign-from-first-principles**, so the result stays coherent under one mental model. Don't paste mechanically.

If the candidates converge on one shape, that is strong agreement. Note it and ship the consensus shape without grafting. If they wildly diverge, Phase A was under-specified. Reframe and re-run rather than averaging the divergence.

Clean up temporary swarm workers (`swarm{action:"kill"}`) only after landing or copying the winning candidate's work into your working copy, because `kill` deletes `"share"` / `"branch"` workspaces.

## Phase F: Verify

Verify the synthesized artifact like any other output, per **principle-prove-it-works**. If verification finds a problem the arena missed, either Phase A was wrong (reframe and re-run) or a candidate caught it and you missed the graft (go back to Phase E). Don't paper over it.

## Outputs

One synthesized artifact, with a short synthesis note alongside naming the base and why, the cross-judge's verdict (or that Phase C skipped the judge), each graft with its source candidate, what was rejected and why, any convergence or dropouts, and the verification result.
