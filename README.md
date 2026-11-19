# pstack for Google Antigravity

A maintained, native Google Antigravity port of [Lauren Tan's (`poteto`) `pstack`](https://github.com/cursor/plugins/tree/main/pstack) — rigorous engineering playbooks, 24 principles, multi-model reviews, and verification workflows built around Antigravity's native tools, models, workflows, and swarms.

> If you want to go fast, go deep first. The goal is not to maximize lines of code; it is to ship smaller, higher-quality, verified changes you can parallelize with confidence.

## What's native to Google Antigravity

- **Native model discovery & multi-vendor panels:** `/setup-pstack` queries `swarm{action:"models", all:true}` for live Antigravity slugs and quotas (`gemini-4-neon-*`, `gemini-4-hydrogen-*`, `gemini-4-argon-*`, `gemini-3.8-flash-*`, `claude-opus-5-5-*`, `claude-sonnet-5-5-*`, `gpt-oss-120b-medium`) plus subagent tiers (`inherit`, `pro`, `flash`, `flash_lite`), and writes `~/.gemini/config/pstack-models.md`.
- **Two parallel execution engines:** `run_workflow` (`parallel()`, `pipeline()`, `phase()`, typed JSON `schema`) for deterministic slice fan-outs via `/pstack-swarm`, and native `swarm` (`workspace:"share"`) for multi-vendor `/arena` bakeoffs and `/interrogate` adversarial reviews.
- **Built-in `swarm` preserved:** upstream's `/swarm` is shipped here as [`/pstack-swarm`](./skills/pstack-swarm/SKILL.md) so Antigravity's built-in `swarm` skill is never shadowed.
- **First-class Antigravity primitives:** `invoke_subagent` with `Workspace: "share"` / `"branch"`, built-in `research` for read-only `/how` & transcript scans, built-in `browser` subagent for live UI verification, `schedule` + `/goal` for overnight loops, `ask_question` for interactive flows, and native `<appDataDir>/brain/` transcript auditing.

See [docs/antigravity-mapping.md](./docs/antigravity-mapping.md) for the complete architecture map.

## Install

Link (or copy) this repository into Antigravity's global plugins directory:

```bash
ln -s /path/to/pstack_antigravity ~/.gemini/config/plugins/pstack
```

Or register it in `~/.gemini/config/plugins.json` (or `.agents/plugins.json` for a single repo). Antigravity discovers the plugin automatically and loads its skills on the next turn.

## Get started

Two steps:

1. Run [`/setup-pstack`](./skills/setup-pstack/SKILL.md) to detect your live Antigravity models, choose a reasoning budget (`large`, `medium`, or `small`), and write `~/.gemini/config/pstack-models.md`.
2. Use [`/poteto-mode`](./skills/poteto-mode/SKILL.md) whenever you are doing work that requires rigor.

New here? Read the [pstack guide](./docs/guide/README.md) or ask [`/poteto-help`](./skills/poteto-help/SKILL.md) without starting any work.

Out of the box (at the default `large` budget), `invoke_subagent` / `run_workflow` code and judgment delegates use `inherit` (`flash` for routine scans), exact Swarm code delegates default to `gemini-4-neon-xhigh`, and multi-vendor panels (`/arena`, `/interrogate`) default to `gemini-4-neon-high`, `claude-opus-5-5-high`, and `gemini-4-hydrogen-high` with a cross-vendor judge pool (`claude-opus-5-5-high`, `gemini-4-neon-high`, `gpt-oss-120b-medium`). `/setup-pstack` customizes any of it.

## Usage

Start non-trivial tasks with [`/poteto-mode`](./skills/poteto-mode/SKILL.md). It matches your request to one of twenty-two playbooks, opens a checklist with its steps verbatim, routes to supporting skills as needed, and writes concise, verified replies.

```text
/poteto-mode this pr has a subtle bug where scroll drifts every 750ms even when idle. repro first, then fix and verify.
```

```text
/goal /poteto-mode i'm going to bed. land the stack even if ci flakes. i want everything merged by morning.
```

<details>
<summary>The twenty-two playbooks</summary>

| Playbook | For |
| --- | --- |
| [investigation](./skills/poteto-mode/playbooks/investigation.md) | A read-only question: how does X work, why was Y built this way, are we sure. |
| [bug fix](./skills/poteto-mode/playbooks/bug-fix.md) | Reproduce a defect, root-cause it, and fix with runtime evidence. |
| [perf](./skills/poteto-mode/playbooks/perf-issue.md) | Trace a measured slowness and improve it against a baseline. |
| [hillclimb](./skills/poteto-mode/playbooks/hillclimb.md) | Sustained scientific improvement of one metric against a target, one commit per accepted win. |
| [runtime forensics](./skills/poteto-mode/playbooks/runtime-forensics.md) | Diagnose a live symptom (leak, idle-CPU spin, glitch) from instrumentation. |
| [trace forensics](./skills/poteto-mode/playbooks/trace-forensics.md) | Diagnose a captured profiling artifact (cpuprofile, trace, spindump, heap snapshot). |
| [feature](./skills/poteto-mode/playbooks/feature.md) | New or changed behavior, built from a named data shape. |
| [refactoring](./skills/poteto-mode/playbooks/refactoring.md) | Behavior-preserving change to structure or shape. |
| [prototype](./skills/poteto-mode/playbooks/prototype.md) | Throwaway sketch to settle a design or empirical fork by observing it. |
| [visual parity](./skills/poteto-mode/playbooks/visual-parity.md) | Pixel-exact UI equivalence between two implementations. |
| [authoring a skill](./skills/poteto-mode/playbooks/authoring-a-skill.md) | Writing or editing an Antigravity `SKILL.md`. |
| [eval](./skills/poteto-mode/playbooks/eval.md) | Test how a skill or prompt change affects agent behavior, blinded. |
| [babysit](./skills/poteto-mode/playbooks/babysit.md) | Drive a PR or stack to merge-ready: conflicts, review threads, CI. |
| [shipping](./skills/poteto-mode/playbooks/shipping.md) | Independently verify a green stack, then land the contiguous verified run bottom-up. |
| [autonomous run](./skills/poteto-mode/playbooks/autonomous-run.md) | Drive a long task to a falsifiable exit predicate without stopping. |
| [autopilot-full](./skills/poteto-mode/playbooks/autopilot-full.md) | Run independent PRs to merged with one owner per PR and independent verification fan-out. |
| [autopilot-stack](./skills/poteto-mode/playbooks/autopilot-stack.md) | Autopilot-full without the merge: build and verify PRs for operator review. |
| [session pickup](./skills/poteto-mode/playbooks/session-pickup.md) | Resume or take over a prior agent's in-flight work from its transcript and branch. |
| [pause safely](./skills/poteto-mode/playbooks/pause-safely.md) | Suspend in-flight work cleanly with a checkpoint and resume note. |
| [multi-phase plan](./skills/poteto-mode/playbooks/multi-phase-plan.md) | Plan work spanning phases or stacked PRs after the design settles. |
| [worktree cleanup](./skills/poteto-mode/playbooks/worktree-cleanup.md) | Reclaim disk by pruning merged or abandoned worktrees and stale simulators, safety-gated. |
| [opening a pr](./skills/poteto-mode/playbooks/opening-a-pr.md) | Open a ready PR from small ordered commits with a briefing-style body. |

</details>

## Skills

[`/poteto-mode`](./skills/poteto-mode/SKILL.md) invokes most of these automatically when a playbook step calls for them. Reach for any of them directly when you want one specific pass:

<details>
<summary>All 34 command skills</summary>

| Skill | Use it when |
| --- | --- |
| [`/poteto-mode`](./skills/poteto-mode/SKILL.md) | Default entry point for any non-trivial task. |
| [`/poteto-help`](./skills/poteto-help/SKILL.md) | You want help picking a skill, playbook, or principle without starting work. |
| [`/setup-pstack`](./skills/setup-pstack/SKILL.md) | Configure Antigravity models, subagent tiers, and reasoning budget in `~/.gemini/config/pstack-models.md`. |
| [`/in-your-own-words`](./skills/in-your-own-words/SKILL.md) | Have the agent play back your goal and the problem before starting. |
| [`/sharpen`](./skills/sharpen/SKILL.md) | Make a prompt deeper (not bigger) before sending it. |
| [`/how`](./skills/how/SKILL.md) | Read-only walkthrough of how a subsystem works (via built-in `research` subagent). |
| [`/why`](./skills/why/SKILL.md) | Trace why code was built this way from commits, PRs, and history. |
| [`/teach`](./skills/teach/SKILL.md) | Plain, diagram-by-diagram explanation combining `/how` and `/why`. |
| [`/recall`](./skills/recall/SKILL.md) | Rebuild recent working context from Antigravity transcripts and the shared record. |
| [`/ketchup`](./skills/ketchup/SKILL.md) | Catch up on what changed since your last message and list pending decisions. |
| [`/ketchup-video`](./skills/ketchup-video/SKILL.md) | Turn a `/ketchup` summary into a short subtitled slide video. |
| [`/blast-radius`](./skills/blast-radius/SKILL.md) | Find what a small change could break and prove safety by running code. |
| [`/architect`](./skills/architect/SKILL.md) | Settle types, ownership, and module boundaries before writing cross-boundary code. |
| [`/arena`](./skills/arena/SKILL.md) | Run N parallel multi-model candidates, cross-judge with another vendor, pick a base, and graft the best parts. |
| [`/pstack-swarm`](./skills/pstack-swarm/SKILL.md) | Fan out N parallel workers across slices or declared races (`run_workflow` + native `swarm`) into one report. |
| [`/interrogate`](./skills/interrogate/SKILL.md) | Multi-model adversarial review where only findings proven by a run survive. |
| [`/tdd`](./skills/tdd/SKILL.md) | Write a failing test first, then the smallest fix, when a cheap local test path exists. |
| [`/benchmark-checklist`](./skills/benchmark-checklist/SKILL.md) | Vet any measured speedup or regression before reporting or acting on it. |
| [`/no-comments`](./skills/no-comments/SKILL.md) | Spawn Comment Sicko, strip unnecessary comments, fix workarounds, and encode constraints. |
| [`/typescript-best-practices`](./skills/typescript-best-practices/SKILL.md) | Concrete TypeScript type-system discipline. |
| [`/figure-it-out`](./skills/figure-it-out/SKILL.md) | Design a rigorous, auditable playbook when no bundled playbook fits. |
| [`/show-me-your-work`](./skills/show-me-your-work/SKILL.md) | Keep a TSV decision trail audited against Antigravity transcripts and reviewed cross-vendor. |
| [`/create-verification-skill`](./skills/create-verification-skill/SKILL.md) | Generate a project-local `.agents/skills/verify-<app>/` skill with a feature map. |
| [`/maintain-verification-skill`](./skills/maintain-verification-skill/SKILL.md) | Audit and update a project's verification skill and feature map live. |
| [`/create-formal-verification-skill`](./skills/create-formal-verification-skill/SKILL.md) | Formally verify a concurrency, retry, or state-machine property and generate a project-local skill. |
| [`/maintain-formal-verification-skill`](./skills/maintain-formal-verification-skill/SKILL.md) | Keep formal verification models and properties aligned with code changes. |
| [`/statechart`](./skills/statechart/SKILL.md) | Generate a Mermaid statechart from a TLA+ model with shortest paths to invariant violations. |
| [`/unslop`](./skills/unslop/SKILL.md) | Remove AI tells from prose. |
| [`/bro`](./skills/bro/SKILL.md) | Restate the last reply in plain human language with no jargon. |
| [`/technical-writing`](./skills/technical-writing/SKILL.md) | Layered doc standard (Diátaxis + Google developer style + STE + Global English). |
| [`/automate-me`](./skills/automate-me/SKILL.md) | Mine your Antigravity transcripts and draft a personal `<name>-mode` skill. |
| [`/reflect`](./skills/reflect/SKILL.md) | Mine the current conversation transcript for durable skill edits. |
| [`/correct`](./skills/correct/SKILL.md) | Mine recurring mistake classes and fix them in architecture, types, lint, or tests. |
| [`/make-bot-ui`](./skills/make-bot-ui/SKILL.md) | Build a local web control UI for webhooks or Antigravity automations, optionally on Tailscale. |

</details>

## Subagents

This plugin ships two native Antigravity subagents under `agents/`:

- [`poteto-agent`](./agents/poteto-agent.md): delegate subagent (`invoke_subagent` `TypeName: "poteto-agent"`) that reads `poteto-mode/SKILL.md` in full before executing delegated code or helper tasks.
- [`comment-sicko`](./agents/comment-sicko.md): opinionated comment auditor (`invoke_subagent` `TypeName: "comment-sicko"`) invoked by [`/no-comments`](./skills/no-comments/SKILL.md).

## Principles

Twenty-four short principle skills indexed inline by `poteto-mode` and also invokable individually as `/principle-<name>`:

<details>
<summary>All twenty-four principles</summary>

| Principle | Group | Rule |
| --- | --- | --- |
| [laziness-protocol](./skills/principle-laziness-protocol/SKILL.md) | core | Bias toward deletion and the smallest change that solves the problem. |
| [foundational-thinking](./skills/principle-foundational-thinking/SKILL.md) | core | Get core types and data structures right before writing logic. |
| [redesign-from-first-principles](./skills/principle-redesign-from-first-principles/SKILL.md) | core | Redesign as if the requirement had been foundational from day one. |
| [attack-the-premise](./skills/principle-attack-the-premise/SKILL.md) | core | When two fixes sharing a premise fail the same gate, test the premise directly. |
| [subtract-before-you-add](./skills/principle-subtract-before-you-add/SKILL.md) | core | Remove dead weight first, then build on the simpler base. |
| [minimize-reader-load](./skills/principle-minimize-reader-load/SKILL.md) | core | Collapse one-caller wrappers and shrink mutable scope. |
| [outcome-oriented-execution](./skills/principle-outcome-oriented-execution/SKILL.md) | core | Converge on the target architecture instead of preserving throwaway compatibility states. |
| [experience-first](./skills/principle-experience-first/SKILL.md) | core | Choose user delight over implementation convenience. |
| [exhaust-the-design-space](./skills/principle-exhaust-the-design-space/SKILL.md) | core | Build 2-3 competing prototypes and compare side by side before committing. |
| [build-the-lever](./skills/principle-build-the-lever/SKILL.md) | core | Build the script, codemod, or check that proves or performs non-trivial work. |
| [model-the-domain](./skills/principle-model-the-domain/SKILL.md) | architecture | Encode the domain in a structure instead of scattered conditionals. |
| [boundary-discipline](./skills/principle-boundary-discipline/SKILL.md) | architecture | Concentrate guards at system boundaries; keep internal logic pure. |
| [type-system-discipline](./skills/principle-type-system-discipline/SKILL.md) | architecture | Make illegal states unrepresentable, brand primitives, parse at boundaries. |
| [make-operations-idempotent](./skills/principle-make-operations-idempotent/SKILL.md) | architecture | Converge to the same end state regardless of partial prior runs. |
| [migrate-callers-then-delete-legacy-apis](./skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md) | architecture | Migrate callers and delete legacy APIs in the same wave. |
| [separate-before-serializing-shared-state](./skills/principle-separate-before-serializing-shared-state/SKILL.md) | architecture | Eliminate shared mutable state first; serialize only for true invariants. |
| [prove-it-works](./skills/principle-prove-it-works/SKILL.md) | verification | Verify against the real artifact, not a proxy or "it compiles". |
| [fix-root-causes](./skills/principle-fix-root-causes/SKILL.md) | verification | Trace symptoms to the first point of failure and fix there. |
| [sequence-verifiable-units](./skills/principle-sequence-verifiable-units/SKILL.md) | verification | Break work into small verifiable units and prove each before the next. |
| [test-behavior-not-implementation](./skills/principle-test-behavior-not-implementation/SKILL.md) | verification | Assert user-observable behavior, not internal implementation details. |
| [explain-the-number](./skills/principle-explain-the-number/SKILL.md) | verification | Find what limits a measurement before trusting or reporting it. |
| [guard-the-context-window](./skills/principle-guard-the-context-window/SKILL.md) | delegation | Route bulk reads and fan-out to subagents; keep summaries in the main thread. |
| [never-block-on-the-human](./skills/principle-never-block-on-the-human/SKILL.md) | delegation | Proceed on reversible work and let the human course-correct; pause for irreversible actions. |
| [encode-lessons-in-structure](./skills/principle-encode-lessons-in-structure/SKILL.md) | meta | Encode repeated instructions as lints, types, scripts, or runtime checks. |

</details>

## Maintaining & Syncing with Upstream

This repository tracks upstream `cursor/plugins/pstack` in [`UPSTREAM.json`](./UPSTREAM.json).

- **Validate plugin integrity, Antigravity schemas, links, counts, and zero stray Cursor references:**
  ```bash
  node scripts/check-plugin.mjs
  ```
- **Check upstream `cursor/plugins/pstack` for new commits and classify changes:**
  ```bash
  node scripts/sync-upstream.mjs --status
  node scripts/sync-upstream.mjs --diff
  ```
- **Auto-sync clean pass-through updates** (principles, harness-agnostic skills/playbooks) while flagging Antigravity-native overrides for review:
  ```bash
  node scripts/sync-upstream.mjs --apply-passthrough
  ```

## License

MIT (upstream `pstack` by Lauren Tan / Cursor; Google Antigravity adaptation maintained under MIT).
