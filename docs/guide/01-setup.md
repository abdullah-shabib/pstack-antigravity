# Set up pstack

In this page you install the plugin in Google Antigravity, pick which models pstack uses, and run your first task. Setup is one command plus a short conversation.

## Install the plugin

Clone or link this repository into Antigravity's global plugins folder:

```bash
ln -s /path/to/pstack_antigravity ~/.gemini/config/plugins/pstack
```

Or register it in `~/.gemini/config/plugins.json` (or `.agents/plugins.json` for a single workspace). Antigravity discovers it automatically and loads its skills on the next turn.

## Pick your models

Run:

```text
/setup-pstack
```

[`/setup-pstack`](../../skills/setup-pstack/SKILL.md) calls `swarm{action:"models", all:true}` to detect the exact models and live quotas available in your Antigravity account, asks for a reasoning budget, shows you each role (subagent tiers, code delegates, judgment, and multi-vendor review panels), and asks what you want. Answer the questions. It writes `~/.gemini/config/pstack-models.md`, a standalone config file every pstack skill reads on demand.

The defaults match the `large` budget:

- Subagent and `run_workflow` tiers: `inherit` for code and judgment, `flash` for routine scans.
- Exact Swarm code delegates: `gemini-4-neon-xhigh`.
- Judgment, prose, and `/pstack-swarm` workers: `gemini-4-neon-high`.
- Multi-vendor panels (`arena runners`, `interrogate reviewers`): `gemini-4-neon-high`, `claude-opus-5-5-high`, and `gemini-4-hydrogen-high`.
- Cross-vendor judge pool (`arena cross-judge pool`): `claude-opus-5-5-high`, `gemini-4-neon-high`, `gpt-oss-120b-medium`.

No role runs above `xhigh`. `medium` lowers each role one step (`xhigh` → `high`, `high` → `medium`) and `small` lowers it two steps, spending less quota.

You only override what you care about. A role with no line in `~/.gemini/config/pstack-models.md` keeps the skill's default. To restore a default, delete that role's line. A rerun of `/setup-pstack` keeps your customized roles.

Setting any role to `inherit` runs that role on your parent chat's active model (for panels, `inherit` still counts toward the fan-out size, though an `inherit` entry never acts as a cross-vendor judge). Setup also configures `pstack-swarm workers`, the default model for `/pstack-swarm` when it runs on Antigravity's `swarm` engine.

## Accept the verification offers, or don't

At the end of setup, `/setup-pstack` looks for a way to prove app behavior in your project, either a `.agents/skills/verify-*` skill or an existing harness. If it finds neither, it offers once to generate one with [`/create-verification-skill`](../../skills/create-verification-skill/SKILL.md).

Say yes and it writes `.agents/skills/verify-<app>/`, a project-local skill that teaches agents to drive your app the way a user does (using Antigravity's built-in `browser` subagent for web UIs, Playwright, PTYs, or HTTP). It proves the skill works once before handing it over. Say no and setup moves on. You can run `/create-verification-skill` yourself any time. [Verify and ship](./06-verify-and-ship.md#create-a-project-verification-skill) covers it in depth.

If you're new to pstack, say yes. An agent that can check its own work keeps going until the check passes. An agent that can't hands every result back to you to check by hand. Of everything in this guide, the verification skill pays off the most.

Then setup offers once to generate a formal verification skill with [`/create-formal-verification-skill`](../../skills/create-formal-verification-skill/SKILL.md), unless the project already has one. Tests check the cases someone thought to write. A formal verification skill checks one key property of your code, such as "a job never runs twice at once", in every case within a stated scope. Say yes when your code has concurrency, retries, a state machine, or a parser, where a bug is costly and tests rarely reach the case that breaks. Otherwise say no, and run it later if that changes. [Verify and ship](./06-verify-and-ship.md#prove-a-property-with-a-formal-verification-skill) covers it.

Your `~/.gemini/config/pstack-models.md` takes effect immediately.

## Keep quota and cost in check

pstack spends extra tokens on subagents, `run_workflow` fan-outs, and multi-vendor Swarm panels. That's the price of the rigor. To spend less:

- Rerun `/setup-pstack` and pick `medium` or `small`, or faster models like Gemini 3.8 Flash for routine roles.
- Set roles to `inherit` so they run on your active chat model without spinning up multi-vendor Swarm workers.
- Shorten a panel list. Each entry runs one worker.
- Save `/poteto-mode` for work that needs rigor. A small, obvious edit doesn't.

## Run your first task

Pick something real but small, and describe it the way you'd describe it to a colleague:

```text
/poteto-mode add a --json flag to this command. text output stays byte-identical. verify both.
```

Watch the playbook checklist. Its first items are the matched playbook's steps copied in, the Feature playbook for this prompt.

From here you can type normal follow-ups. For long unattended runs where you want the agent to keep driving until the check passes, pair `/poteto-mode` with Antigravity's `/goal` slash command.

Next: [Route work through `/poteto-mode`](./02-poteto-mode.md).
