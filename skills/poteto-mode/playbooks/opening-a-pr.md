### Opening a PR

Invoked at the end of every other playbook.

Work from a git worktree (or isolated `Workspace: "share"`) off trunk, and keep unrelated work out of it. Rebase into small, landable commits. Audit the diff for AI slop (redundant checks, dead code, unnecessary abstractions, narration comments) and run `/no-comments` before commit.

Title: `type(scope): subject`, naming a real symbol when one carries the change. Body: a one-minute briefing under 40 lines with these `##` headings in order, dropping empty ones: `## Why`, `## What changed`, `## Scope`, `## Tradeoffs` (only rejected alternatives a reviewer would otherwise ask about), `## Blast Radius`, `## Verification`.

Stack follow-ups by base branch. Open PRs ready (`gh pr create` without `--draft`, or `origin pr create --status open` when Origin's CLI resolves the repository). Opening a PR does not start a babysit.
