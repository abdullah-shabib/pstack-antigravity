#!/usr/bin/env node

// Upstream maintenance helper for pstack_antigravity.
// Tracks cursor/plugins/pstack via UPSTREAM.json and classifies upstream diffs into:
//   - pass-through (principles, harness-agnostic skills/playbooks/scripts) -> auto-syncable
//   - native-override (Antigravity-adapted files) -> flagged for manual port review
//   - omitted (Cursor-only files like .cursor-plugin/, automations/benny/, docs/harness/) -> skipped
//
// Usage:
//   node scripts/sync-upstream.mjs --status
//   node scripts/sync-upstream.mjs --diff
//   node scripts/sync-upstream.mjs --apply-passthrough

import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UPSTREAM_FILE = join(ROOT, "UPSTREAM.json");
const cfg = JSON.parse(readFileSync(UPSTREAM_FILE, "utf8"));
const overrides = new Set(cfg.nativeOverrides ?? []);

const args = new Set(process.argv.slice(2));
const mode = args.has("--apply-passthrough")
  ? "apply"
  : args.has("--diff")
    ? "diff"
    : "status";

function mapUpstreamPath(upRel) {
  for (const omitted of cfg.omittedUpstreamPaths ?? []) {
    if (upRel === omitted || upRel.startsWith(`${omitted}/`)) return null;
  }
  for (const [from, to] of Object.entries(cfg.renames ?? {})) {
    if (upRel === from || upRel.startsWith(`${from}/`)) {
      return to + upRel.slice(from.length);
    }
  }
  return upRel;
}

function cleanSkillFrontmatter(text) {
  return text.replace(/^---\n([\s\S]*?)\n---\n/, (_, fm) => {
    const kept = fm
      .split("\n")
      .filter((line) => !/^(disable-model-invocation|icon|color):/.test(line.trim()))
      .join("\n");
    return `---\n${kept}\n---\n`;
  });
}

if (mode === "status") {
  console.log(`Upstream repo:    ${cfg.upstreamRepo} (${cfg.upstreamSubdir}/)`);
  console.log(`Pinned commit:    ${cfg.upstreamCommit}`);
  console.log(`Upstream version: ${cfg.upstreamVersion}`);
  console.log(`Last synced:      ${cfg.syncedAt}`);
  console.log(`Native overrides: ${overrides.size} files`);
  process.exit(0);
}

const tmp = mkdtempSync(join(tmpdir(), "pstack-upstream-"));
try {
  console.log(`Fetching ${cfg.upstreamRepo} (${cfg.upstreamBranch})...`);
  execFileSync(
    "git",
    ["clone", "--filter=blob:none", "--no-checkout", "--branch", cfg.upstreamBranch, cfg.upstreamRepo, tmp],
    { stdio: "inherit" },
  );
  execFileSync("git", ["-C", tmp, "sparse-checkout", "set", cfg.upstreamSubdir], { stdio: "inherit" });
  execFileSync("git", ["-C", tmp, "checkout", cfg.upstreamBranch], { stdio: "inherit" });

  const latestSha = execFileSync("git", ["-C", tmp, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const upPkg = JSON.parse(readFileSync(join(tmp, cfg.upstreamSubdir, "plugin.json"), "utf8"));
  console.log(`Pinned: ${cfg.upstreamCommit.slice(0, 12)} (${cfg.upstreamVersion})`);
  console.log(`Latest: ${latestSha.slice(0, 12)} (${upPkg.version})`);

  if (latestSha === cfg.upstreamCommit) {
    console.log("Already up to date with upstream.");
    process.exit(0);
  }

  const diffOut = execFileSync(
    "git",
    ["-C", tmp, "diff", "--name-status", `${cfg.upstreamCommit}..${latestSha}`, "--", cfg.upstreamSubdir],
    { encoding: "utf8" },
  ).trim();

  if (!diffOut) {
    console.log("No changes under pstack/ since pinned commit.");
    process.exit(0);
  }

  const buckets = { passthrough: [], override: [], omitted: [], deleted: [] };
  for (const line of diffOut.split("\n")) {
    const [status, rawPath] = line.split("\t");
    const upRel = rawPath.replace(new RegExp(`^${cfg.upstreamSubdir}/`), "");
    const localRel = mapUpstreamPath(upRel);
    if (!localRel) {
      buckets.omitted.push({ status, upRel });
    } else if (status === "D") {
      buckets.deleted.push({ status, upRel, localRel });
    } else if (overrides.has(localRel)) {
      buckets.override.push({ status, upRel, localRel });
    } else {
      buckets.passthrough.push({ status, upRel, localRel });
    }
  }

  console.log(`\nPass-through changes (${buckets.passthrough.length}):`);
  for (const c of buckets.passthrough) console.log(`  [${c.status}] ${c.localRel}`);

  console.log(`\nAntigravity-native overrides needing manual review (${buckets.override.length}):`);
  for (const c of buckets.override) console.log(`  [${c.status}] ${c.localRel} (upstream: ${c.upRel})`);

  if (buckets.deleted.length) {
    console.log(`\nDeleted upstream (${buckets.deleted.length}):`);
    for (const c of buckets.deleted) console.log(`  [D] ${c.localRel}`);
  }
  if (buckets.omitted.length) {
    console.log(`\nOmitted Cursor-only paths (${buckets.omitted.length} skipped)`);
  }

  if (mode === "apply") {
    for (const c of buckets.passthrough) {
      const src = join(tmp, cfg.upstreamSubdir, c.upRel);
      const dst = join(ROOT, c.localRel);
      mkdirSync(dirname(dst), { recursive: true });
      const fileMode = statSync(src).mode & 0o777;
      if (basename(src) === "SKILL.md") {
        const cleaned = cleanSkillFrontmatter(readFileSync(src, "utf8"));
        writeFileSync(dst, cleaned, "utf8");
      } else {
        copyFileSync(src, dst);
      }
      chmodSync(dst, fileMode);
    }
    console.log(`\nApplied ${buckets.passthrough.length} pass-through file(s).`);
    if (buckets.override.length === 0 && buckets.deleted.length === 0) {
      cfg.upstreamCommit = latestSha;
      cfg.upstreamVersion = upPkg.version;
      cfg.syncedAt = new Date().toISOString().slice(0, 10);
      writeFileSync(UPSTREAM_FILE, `${JSON.stringify(cfg, null, 2)}\n`, "utf8");
      console.log("Updated UPSTREAM.json to latest commit.");
    } else {
      console.log("Review the native overrides and deletions above, then update UPSTREAM.json.");
    }
    console.log("Running scripts/check-plugin.mjs...");
    execFileSync("node", [join(ROOT, "scripts", "check-plugin.mjs")], { stdio: "inherit" });
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
