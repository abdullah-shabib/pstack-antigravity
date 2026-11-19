### Visual parity

**You own pixel-exact equivalence. The baseline is the spec. You do not touch it.** Equivalence is verified by image diff, not by eye.

1. Establish the baseline first, before any migration: a visual regression harness that screenshots the current component across its states (using Playwright or Antigravity's built-in `browser` subagent), plus the target when matching two implementations. No baseline, no parity claim. A blocking prerequisite, not a follow-up.
2. Anti-shortcut clauses, stated and held: no harness modifications, no baseline tampering, no component restructuring to make a diff pass. If the baseline looks wrong, stop and ask, don't edit it.
3. Migrate one component at a time. Parallelize across isolated workspaces (`Workspace: "share"` or git worktrees), one owner per component (**principle-separate-before-serializing-shared-state**). Shared primitives migrate first as a blocking phase.
4. Verify each component against its baseline via image diff on the matching surface (through the project's `verify-*` skill or `browser` subagent + pixel-diff script). A nonzero diff is a fail. Investigate the pixel delta and iterate per component until the diff is zero (pair with `/goal` for multi-component runs).
5. Run **Opening a PR** per component or per safe batch.

**Reply:** components migrated, the diff result for each, the baseline harness location, what's left.
